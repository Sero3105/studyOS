"""Export/import of all of a user's study data as one JSON document."""
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from models.exam_models import Exam
from models.goal_models import Goal
from models.session_models import StudySession
from models.subject_models import Subject, Topic
from models.task_models import Task
from schemas.data_schemas import ImportResult, StudyData
from schemas.exam_schemas import ExamCreate
from schemas.goal_schemas import GoalCreate
from schemas.session_schemas import SessionCreate
from schemas.subject_schemas import SubjectCreate
from schemas.task_schemas import TaskCreate
from services.subject_service import list_subjects

def _owned(model, user_id: int, db: Session):
    return db.scalars(select(model).where(model.user_id == user_id).order_by(model.id))

def export_user_data(user_id: int, db: Session) -> StudyData:
    rows = lambda model, schema: [schema.model_validate(r, from_attributes=True) for r in _owned(model, user_id, db)]
    return StudyData(
        subjects=[{'id': s.id, 'name': s.name, 'topics': [{'id': t.id, 'title': t.title, 'completed': t.completed} for t in s.topics]}
                  for s in list_subjects(user_id, db)],
        tasks=rows(Task, TaskCreate), exams=rows(Exam, ExamCreate),
        sessions=rows(StudySession, SessionCreate), goals=rows(Goal, GoalCreate),
    )

def import_user_data(data: StudyData, user_id: int, db: Session) -> ImportResult:
    """Adds everything as new records in one transaction; ids from the file only relink rows."""
    subject_ids: dict[int, Subject] = {}
    topic_ids: dict[int, Topic] = {}
    topics = 0
    try:
        for s in data.subjects:
            subject = Subject(user_id=user_id, name=s.name)
            db.add(subject)
            if s.id is not None: subject_ids[s.id] = subject
            for t in s.topics:
                topic = Topic(subject=subject, title=t.title, completed=t.completed)
                db.add(topic); topics += 1
                if t.id is not None: topic_ids[t.id] = topic
        db.flush()

        def links(item) -> dict:
            # Riferimenti sconosciuti o incoerenti vengono scartati, mai collegati a dati di altri.
            subject = subject_ids.get(item.subject_id)
            topic = topic_ids.get(item.topic_id)
            if topic is not None and subject is not None and topic.subject is not subject: topic = None
            if topic is not None and subject is None: subject = topic.subject
            return {'subject_id': subject.id if subject else None, 'topic_id': topic.id if topic else None}

        for t in data.tasks:
            db.add(Task(user_id=user_id, **(t.model_dump() | links(t))))
        for s in data.sessions:
            db.add(StudySession(user_id=user_id, **(s.model_dump() | links(s))))
        for e in data.exams:
            db.add(Exam(user_id=user_id, **e.model_dump()))
        for g in data.goals:
            db.add(Goal(user_id=user_id, **g.model_dump()))
        db.commit()
    except SQLAlchemyError:
        db.rollback(); raise
    return ImportResult(subjects=len(data.subjects), topics=topics, tasks=len(data.tasks),
                        exams=len(data.exams), sessions=len(data.sessions), goals=len(data.goals))
