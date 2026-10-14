from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from models.subject_models import Subject, Topic
from schemas.subject_schemas import SubjectCreate, TopicCreate, TopicUpdate

def list_subjects(user_id: int, db: Session) -> list[Subject]:
    return list(db.scalars(select(Subject).where(Subject.user_id == user_id).options(selectinload(Subject.topics)).order_by(Subject.name)))

def create_subject(data: SubjectCreate, user_id: int, db: Session) -> Subject:
    subject = Subject(user_id=user_id, name=data.name)
    db.add(subject); db.commit(); db.refresh(subject)
    return subject

def get_owned_subject(subject_id: int, user_id: int, db: Session) -> Subject:
    subject = db.scalar(select(Subject).where(Subject.id == subject_id, Subject.user_id == user_id).options(selectinload(Subject.topics)))
    if subject is None: raise LookupError('Subject not found')
    return subject

def delete_subject(subject_id: int, user_id: int, db: Session) -> None:
    subject = get_owned_subject(subject_id, user_id, db)
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

def update_topic(topic_id: int, data: TopicUpdate, user_id: int, db: Session) -> Topic:
    topic = _owned_topic(topic_id, user_id, db)
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is not None: setattr(topic, field, value)
    db.commit(); db.refresh(topic)
    return topic

def delete_topic(topic_id: int, user_id: int, db: Session) -> None:
    topic = _owned_topic(topic_id, user_id, db)
    db.delete(topic); db.commit()
