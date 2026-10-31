from datetime import date, timedelta
from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session, selectinload
from models.exam_models import Exam
from models.goal_models import Goal
from models.subject_models import Subject, Topic
from models.session_models import StudySession
from models.task_models import Task
from schemas.subject_schemas import SubjectCreate, SubjectUpdate, TopicCreate, TopicUpdate

def list_subjects(user_id: int, db: Session) -> list[Subject]:
    return list(db.scalars(select(Subject).where(Subject.user_id == user_id).options(selectinload(Subject.topics)).order_by(Subject.name)))

def _adopt_exams(subject: Subject, db: Session) -> None:
    """Esami ancora senza materia con lo stesso nome (senza maiuscole) vengono collegati per id."""
    db.execute(update(Exam).where(Exam.user_id == subject.user_id, Exam.subject_id.is_(None),
                                  func.lower(func.trim(Exam.subject)) == subject.name.strip().lower()).values(subject_id=subject.id))

def create_subject(data: SubjectCreate, user_id: int, db: Session) -> Subject:
    subject = Subject(user_id=user_id, name=data.name, color=data.color)
    db.add(subject); db.flush()
    _adopt_exams(subject, db)
    db.commit(); db.refresh(subject)
    return subject

def update_subject(subject_id: int, data: SubjectUpdate, user_id: int, db: Session) -> Subject:
    subject = get_owned_subject(subject_id, user_id, db)
    values = data.model_dump(exclude_unset=True)
    for field, value in values.items(): setattr(subject, field, value)
    if 'name' in values:
        # Gli esami collegati seguono il nuovo nome.
        db.execute(update(Exam).where(Exam.user_id == user_id, Exam.subject_id == subject.id).values(subject=subject.name))
        _adopt_exams(subject, db)
    db.commit(); db.refresh(subject)
    return subject

def get_owned_subject(subject_id: int, user_id: int, db: Session) -> Subject:
    subject = db.scalar(select(Subject).where(Subject.id == subject_id, Subject.user_id == user_id).options(selectinload(Subject.topics)))
    if subject is None: raise LookupError('Subject not found')
    return subject

def _unlink(user_id: int, db: Session, column: str, ids: list[int]) -> None:
    """SQLite qui non applica le foreign key: task e sessioni vanno scollegati a mano, o restano con id orfani."""
    for model in (Task, StudySession):
        db.execute(update(model).where(model.user_id == user_id, getattr(model, column).in_(ids)).values({column: None}))

def delete_subject(subject_id: int, user_id: int, db: Session) -> None:
    subject = get_owned_subject(subject_id, user_id, db)
    _unlink(user_id, db, 'subject_id', [subject.id])
    _unlink(user_id, db, 'topic_id', [t.id for t in subject.topics])
    for model in (Exam, Goal):
        db.execute(update(model).where(model.user_id == user_id, model.subject_id == subject.id).values(subject_id=None))
    db.delete(subject); db.commit()

def create_topic(subject_id: int, data: TopicCreate, user_id: int, db: Session) -> Topic:
    subject = get_owned_subject(subject_id, user_id, db)
    topic = Topic(subject_id=subject.id, title=data.title)
    db.add(topic); db.commit(); db.refresh(topic)
    return topic

def _owned_topic(topic_id: int, user_id: int, db: Session) -> Topic:
    topic = db.scalar(select(Topic).join(Subject).where(Topic.id == topic_id, Subject.user_id == user_id))
    if topic is None: raise LookupError('Topic not found')
    return topic

# Ripetizione dilazionata: ripassi a distanza crescente dal completamento.
REVIEW_DAYS = (1, 3, 7, 21)

def update_topic(topic_id: int, data: TopicUpdate, user_id: int, db: Session) -> Topic:
    topic = _owned_topic(topic_id, user_id, db)
    values = data.model_dump(exclude_unset=True, exclude={'schedule_reviews'})
    newly_completed = values.get('completed') is True and not topic.completed
    reopened = values.get('completed') is False and topic.completed
    open_reviews = (Task.user_id == user_id, Task.topic_id == topic.id, Task.title.startswith('↻'), Task.status != 'done')
    for field, value in values.items():
        if value is not None: setattr(topic, field, value)
    if reopened: db.execute(delete(Task).where(*open_reviews))
    if newly_completed and data.schedule_reviews and db.scalar(select(Task.id).where(*open_reviews).limit(1)) is None:
        today = date.today()
        db.add_all(Task(user_id=user_id, title=f'↻ {topic.title}'[:200], due_date=today + timedelta(days=d),
                        priority='medium', subject_id=topic.subject_id, topic_id=topic.id) for d in REVIEW_DAYS)
    db.commit(); db.refresh(topic)
    return topic

def delete_topic(topic_id: int, user_id: int, db: Session) -> None:
    topic = _owned_topic(topic_id, user_id, db)
    _unlink(user_id, db, 'topic_id', [topic.id])
    db.delete(topic); db.commit()
