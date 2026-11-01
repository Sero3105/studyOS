from datetime import date, timedelta
from sqlalchemy import case, func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from models.exam_models import Exam, ExamAttempt
from models.subject_models import Subject
from models.session_models import StudySession
from models.task_models import Task
from schemas.exam_schemas import ExamCreate
def link_subject(exam:Exam, db:Session)->None:
    """Collega l'esame per id alla materia con lo stesso nome; il nome resta quello scritto nell'esame."""
    exam.subject_id=db.scalar(select(func.min(Subject.id)).where(Subject.user_id==exam.user_id, func.lower(func.trim(Subject.name))==exam.subject.strip().lower()))
def create_exam(data: ExamCreate, user_id:int, db:Session)->Exam:
    exam=Exam(user_id=user_id, **data.model_dump())
    link_subject(exam, db)
    try: db.add(exam); db.commit(); db.refresh(exam); return exam
    except SQLAlchemyError: db.rollback(); raise
def _owned_exam(exam_id:int, user_id:int, db:Session)->Exam:
    exam=db.scalar(select(Exam).where(Exam.id==exam_id, Exam.user_id==user_id))
    if exam is None: raise LookupError('Exam not found')
    return exam
def update_exam(exam_id:int, data, user_id:int, db:Session)->Exam:
    exam=_owned_exam(exam_id,user_id,db)
    values=data.model_dump(exclude_unset=True)
    for field,value in values.items(): setattr(exam,field,value)
    if 'subject' in values: link_subject(exam, db)
    if exam.honors and exam.grade != 30: raise ValueError('La lode richiede voto 30')
    try: db.commit(); db.refresh(exam); return exam
    except SQLAlchemyError: db.rollback(); raise
def record_attempt(exam_id:int, data, user_id:int, db:Session)->Exam:
    """Saves the current sitting as a failed/rejected attempt; the exam goes back to planned, waiting for the next date."""
    exam=_owned_exam(exam_id,user_id,db)
    if exam.exam_date is None: raise ValueError('no_date')
    exam.attempts.append(ExamAttempt(user_id=user_id, exam_date=exam.exam_date, **data.model_dump()))
    exam.status='planned'; exam.exam_date=None; exam.exam_time=None; exam.grade=None; exam.honors=False
    db.commit(); db.refresh(exam)
    return exam
def delete_exam(exam_id:int, user_id:int, db:Session)->None:
    exam=_owned_exam(exam_id,user_id,db); db.delete(exam); db.commit()
def list_user_exams(user_id:int, db:Session)->list[Exam]:
    return list(db.scalars(select(Exam).where(Exam.user_id==user_id).order_by(case((Exam.exam_date.is_(None),1),else_=0), Exam.exam_date, case((Exam.exam_time.is_(None),1),else_=0), Exam.exam_time, Exam.id)))

def plan_exam(exam_id:int, user_id:int, db:Session, rest_days:set[int]=frozenset())->list[Task]:
    """Spreads the subject's open topics as tasks from tomorrow to the day before the exam, skipping rest weekdays (1 = Monday).
    Each topic gets days in proportion to its weight: harder and less studied topics get more."""
    exam=_owned_exam(exam_id,user_id,db)
    if exam.exam_date is None: raise ValueError('no_date')
    subject=db.scalar(select(Subject).where(Subject.user_id==user_id, Subject.id==exam.subject_id))
    if subject is None: raise ValueError('no_subject')
    today=date.today()
    days=[d for d in (today+timedelta(days=i) for i in range(1,(exam.exam_date-today).days)) if d.isoweekday() not in rest_days]
    if not days: raise ValueError('too_close')
    already=set(db.scalars(select(Task.topic_id).where(Task.user_id==user_id, Task.status!='done', Task.topic_id.is_not(None))))
    topics=[t for t in sorted(subject.topics, key=lambda t: t.id) if not t.completed and t.id not in already]
    studied=dict(db.execute(select(StudySession.topic_id, func.sum(StudySession.duration_minutes))
                            .where(StudySession.user_id==user_id, StudySession.topic_id.in_([t.id for t in topics])).group_by(StudySession.topic_id)).all())
    # Difficoltà 1-3, ridotta dalle ore già studiate: 2 ore su un argomento medio lo pesano come uno facile mai visto.
    weights=[t.difficulty/(1+studied.get(t.id,0)/120) for t in topics]
    total=sum(weights)
    tasks=[Task(user_id=user_id, title=t.title, due_date=days[min(len(days)-1, int(sum(weights[:i])/total*len(days)))], priority='high',
                subject_id=subject.id, topic_id=t.id) for i,t in enumerate(topics)]
    db.add_all(tasks); db.commit()
    for t in tasks: db.refresh(t)
    return tasks
