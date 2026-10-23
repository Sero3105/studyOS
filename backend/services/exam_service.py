from datetime import date, timedelta
from sqlalchemy import case, func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from models.exam_models import Exam
from models.subject_models import Subject
from models.task_models import Task
from schemas.exam_schemas import ExamCreate
def create_exam(data: ExamCreate, user_id:int, db:Session)->Exam:
    exam=Exam(user_id=user_id, **data.model_dump())
    try: db.add(exam); db.commit(); db.refresh(exam); return exam
    except SQLAlchemyError: db.rollback(); raise
def _owned_exam(exam_id:int, user_id:int, db:Session)->Exam:
    exam=db.scalar(select(Exam).where(Exam.id==exam_id, Exam.user_id==user_id))
    if exam is None: raise LookupError('Exam not found')
    return exam
def update_exam(exam_id:int, data, user_id:int, db:Session)->Exam:
    exam=_owned_exam(exam_id,user_id,db)
    for field,value in data.model_dump(exclude_unset=True).items(): setattr(exam,field,value)
    if exam.honors and exam.grade != 30: raise ValueError('La lode richiede voto 30')
    try: db.commit(); db.refresh(exam); return exam
    except SQLAlchemyError: db.rollback(); raise
def delete_exam(exam_id:int, user_id:int, db:Session)->None:
    exam=_owned_exam(exam_id,user_id,db); db.delete(exam); db.commit()
def list_user_exams(user_id:int, db:Session)->list[Exam]:
    return list(db.scalars(select(Exam).where(Exam.user_id==user_id).order_by(Exam.exam_date, case((Exam.exam_time.is_(None),1),else_=0), Exam.exam_time, Exam.id)))

def plan_exam(exam_id:int, user_id:int, db:Session)->list[Task]:
    """Spreads the subject's open topics as tasks from tomorrow to the day before the exam."""
    exam=_owned_exam(exam_id,user_id,db)
    subject=db.scalar(select(Subject).where(Subject.user_id==user_id, func.lower(Subject.name)==exam.subject.lower()))
    if subject is None: raise ValueError('no_subject')
    days=(exam.exam_date-date.today()).days-1
    if days<1: raise ValueError('too_close')
    already=set(db.scalars(select(Task.topic_id).where(Task.user_id==user_id, Task.status!='done', Task.topic_id.is_not(None))))
    topics=[t for t in sorted(subject.topics, key=lambda t: t.id) if not t.completed and t.id not in already]
    today=date.today()
    tasks=[Task(user_id=user_id, title=t.title, due_date=today+timedelta(days=1+i*days//len(topics)), priority='high',
                subject_id=subject.id, topic_id=t.id) for i,t in enumerate(topics)]
    db.add_all(tasks); db.commit()
    for t in tasks: db.refresh(t)
    return tasks
