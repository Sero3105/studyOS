from datetime import date, timedelta
from sqlalchemy import case, delete, func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from models.card_models import Mistake
from models.exam_models import Exam, ExamAttempt
from models.session_models import StudySession
from models.subject_models import Subject
from models.task_models import Task
from schemas.exam_schemas import ExamCreate
from dataclasses import replace
from services.study_plan import PlanAdvice, PlanPrefs, PlanTopic, build_plan, plan_advice
def link_subject(exam:Exam, db:Session)->None:
    """Collega l'esame per id alla materia con lo stesso nome; se non c'è, la crea: ogni esame ha sempre la sua materia."""
    name=exam.subject.strip()
    subject_id=db.scalar(select(func.min(Subject.id)).where(Subject.user_id==exam.user_id, func.lower(func.trim(Subject.name))==name.lower()))
    if subject_id is None:
        subject=Subject(user_id=exam.user_id, name=name); db.add(subject); db.flush(); subject_id=subject.id
    exam.subject_id=subject_id
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
    # Esami di prima dell'unione materia-esame: ricevono la loro materia alla prima lettura.
    orphans=list(db.scalars(select(Exam).where(Exam.user_id==user_id, Exam.subject_id.is_(None))))
    for exam in orphans: link_subject(exam, db)
    if orphans: db.commit()
    return list(db.scalars(select(Exam).where(Exam.user_id==user_id).order_by(case((Exam.exam_date.is_(None),1),else_=0), Exam.exam_date, case((Exam.exam_time.is_(None),1),else_=0), Exam.exam_time, Exam.id)))

PLAN_TAG = "Piano d'esame"

def _plan_subject(exam:Exam, user_id:int, db:Session)->Subject:
    if exam.exam_date is None: raise ValueError('no_date')
    subject=db.scalar(select(Subject).where(Subject.user_id==user_id, Subject.id==exam.subject_id))
    # Materia senza argomenti (es. creata dall'esame): niente da distribuire.
    if subject is None or not subject.topics: raise ValueError('no_subject')
    return subject

def _plan_inputs(data)->tuple[set[int], set[date], PlanPrefs, date|None, bool, bool]:
    """Preferenze della richiesta (o default) → giorni di riposo, giorni liberi, preferenze, inizio, giorno prima libero, storico sì/no."""
    if data is None: return set(), set(), PlanPrefs(), None, False, True
    scale=60 if data.limit_unit=='hours' else 1
    per_day=None if data.limit_value is None else data.limit_value*scale
    per_weekday=tuple(None if v is None else v*scale for v in data.weekday_limits) if data.weekday_limits and per_day else None
    prefs=PlanPrefs(unit='minutes' if data.limit_unit=='hours' else 'tasks', per_day=per_day, per_weekday=per_weekday, reviews=data.reviews,
                    final_days=data.final_days, order=data.order, study_minutes=data.study_minutes)
    return set(data.rest_days), set(data.days_off), prefs, data.start_date, data.rest_before_exam, data.adapt

HISTORY_DAYS = 60  # finestra dello storico per la quota di task fatti
MIN_HISTORY = 10  # sotto, troppo pochi task per fidarsi

def plan_history(user_id:int, db:Session)->tuple[float|None, float|None]:
    """Dallo storico dello studente: quota di task del piano fatti negli ultimi 60 giorni (affidabilità) e tempo reale
    al timer sugli argomenti studiati col piano rispetto a quello previsto (ritmo). None = dati insufficienti."""
    today=date.today()
    past=db.execute(select(Task.status, Task.due_date, Task.updated_at).where(Task.user_id==user_id, Task.description.startswith(PLAN_TAG),
                                                                       Task.due_date>=today-timedelta(days=HISTORY_DAYS), Task.due_date<today)).all()
    # Fatto in tempo = segnato fatto entro il giorno previsto. Rigenerare il piano cancella i task saltati: il ritardo resta visibile.
    on_time=sum(1 for status, due, at in past if status=='done' and at.date()<=due)
    reliability=on_time/len(past) if len(past)>=MIN_HISTORY else None
    planned=dict(db.execute(select(Task.topic_id, func.sum(func.coalesce(Task.planned_minutes, 50))).where(
        Task.user_id==user_id, Task.status=='done', Task.review_interval.is_(None), Task.topic_id.is_not(None),
        Task.description.startswith(PLAN_TAG)).group_by(Task.topic_id)).all())
    actual=dict(db.execute(select(StudySession.topic_id, func.sum(StudySession.duration_minutes)).where(
        StudySession.user_id==user_id, StudySession.topic_id.in_(planned), StudySession.kind.in_(('study','exercises'))).group_by(StudySession.topic_id)).all())
    # Solo argomenti con sessioni al timer: chi non usa il timer non risulta "veloce" per errore.
    pace=min(1.5, max(0.75, sum(actual.values())/sum(planned[t] for t in actual))) if len(actual)>=3 else None
    return reliability, pace

def _personal(prefs:PlanPrefs, adapt:bool, user_id:int, db:Session)->tuple[PlanPrefs, float|None, float|None]:
    reliability, pace=plan_history(user_id, db)
    if not adapt: return prefs, reliability, pace
    return replace(prefs, reliability=1.0 if reliability is None else reliability, pace=pace or 1.0), reliability, pace

def _plan_topics(subject:Subject, user_id:int, db:Session)->list[PlanTopic]:
    """Argomenti con la loro memoria: errori annotati, ultimo studio o ripasso fatto, ripasso riuscito più distanziato."""
    topics=sorted(subject.topics, key=lambda t: t.id)
    ids=[t.id for t in topics]
    mistakes=dict(db.execute(select(Mistake.topic_id, func.count()).where(Mistake.topic_id.in_(ids)).group_by(Mistake.topic_id)).all())
    last_seen:dict[int,date]={}; longest:dict[int,int]={}
    for tid, at, gap in db.execute(select(Task.topic_id, Task.updated_at, Task.review_interval).where(Task.user_id==user_id, Task.status=='done', Task.topic_id.in_(ids))):
        last_seen[tid]=max(last_seen.get(tid, at.date()), at.date())
        if gap: longest[tid]=max(longest.get(tid, 0), gap)
    return [PlanTopic(t.id, t.title, t.difficulty, t.mastery, mistakes.get(t.id, 0), longest.get(t.id) if t.mastery>=2 else None, last_seen.get(t.id)) for t in topics]

def plan_exam_advice(exam_id:int, user_id:int, db:Session, data=None)->dict:
    """Data ideale e data limite per iniziare il piano, con preferenze e storico dello studente (vedi study_plan.plan_advice)."""
    exam=_owned_exam(exam_id,user_id,db)
    subject=_plan_subject(exam, user_id, db)
    rest_days, days_off, prefs, _, rest_before, adapt=_plan_inputs(data)
    if rest_before: days_off=days_off|{exam.exam_date-timedelta(days=1)}
    prefs, reliability, pace=_personal(prefs, adapt, user_id, db)
    advice=plan_advice(_plan_topics(subject, user_id, db), exam.exam_date, rest_days, days_off, prefs)
    return {**advice.__dict__, 'reliability': reliability, 'pace': pace}

def plan_exam(exam_id:int, user_id:int, db:Session, data=None)->list[Task]:
    """Piano di studio fino all'esame (vedi services/study_plan.py): studio, ripassi distanziati e ripasso finale,
    adattato alle preferenze (`data`: PlanRequest) e allo storico dello studente. Rigenerarlo sostituisce i task del piano non ancora
    fatti; quelli fatti e i task scritti a mano restano."""
    exam=_owned_exam(exam_id,user_id,db)
    subject=_plan_subject(exam, user_id, db)
    rest_days, days_off, prefs, start, rest_before, adapt=_plan_inputs(data)
    if rest_before: days_off=days_off|{exam.exam_date-timedelta(days=1)}
    prefs, _, _=_personal(prefs, adapt, user_id, db)
    # Parte dal giorno scelto (mai nel passato), altrimenti da domani.
    first=max(start or date.today()+timedelta(days=1), date.today())
    days=[d for d in (first+timedelta(days=i) for i in range(0,(exam.exam_date-first).days)) if d.isoweekday() not in rest_days and d not in days_off]
    if not days: raise ValueError('too_close')
    db.execute(delete(Task).where(Task.user_id==user_id, Task.subject_id==subject.id, Task.status!='done', Task.description.startswith(PLAN_TAG)))
    # Carico già in calendario (altri esami, task a mano), nell'unità del limite: il piano riempie prima i giorni liberi.
    weight=func.count() if prefs.unit=='tasks' else func.sum(func.coalesce(Task.planned_minutes, 30))
    busy=dict(db.execute(select(Task.due_date, weight).where(Task.user_id==user_id, Task.status!='done', Task.due_date.in_(days)).group_by(Task.due_date)).all())
    by_id={t.id: t for t in subject.topics}
    plan=build_plan(_plan_topics(subject, user_id, db), days, busy, prefs, exam.exam_date)
    tasks=[]
    for it in plan:
        topic=by_id[it.topic_id]
        if it.kind=='study':
            title=f'Studia: {topic.title}'+(f' ({it.part}/{it.parts})' if it.parts>1 else '')
            text=f'{PLAN_TAG} · Studio. Leggi, fai uno schema e alla fine ripeti a voce senza guardare gli appunti.'
        elif it.kind=='review':
            title=f'↻ {topic.title}'
            text=f'{PLAN_TAG} · Ripasso {it.number}/{it.of}. Prima richiama a memoria (schema, esercizi, domande), poi controlla gli appunti.'
        else:
            title=f'↻ {topic.title}'
            text=f"{PLAN_TAG} · Ripasso finale. Simula l'esame: domande ed esercizi senza appunti, poi correggi."
        tasks.append(Task(user_id=user_id, title=title[:200], description=text, due_date=it.day, priority='high' if it.kind!='review' else 'medium',
                          subject_id=subject.id, topic_id=topic.id, review_interval=None if it.kind=='study' else it.gap,
                          planned_minutes=prefs.minutes(it.kind)))
    db.add_all(tasks); db.commit()
    for t in tasks: db.refresh(t)
    return tasks
