from sqlalchemy import select
from sqlalchemy.orm import Session
from models.session_models import StudySession
from schemas.session_schemas import SessionCreate
from services.task_service import _check_links

def create_session(data: SessionCreate, user_id: int, db: Session) -> StudySession:
    _check_links(user_id, db, data.subject_id, data.topic_id)
    session = StudySession(user_id=user_id, **data.model_dump())
    db.add(session); db.commit(); db.refresh(session)
    return session

def list_sessions(user_id: int, db: Session) -> list[StudySession]:
    return list(db.scalars(select(StudySession).where(StudySession.user_id == user_id).order_by(StudySession.studied_on.desc(), StudySession.id.desc())))

def delete_session(session_id: int, user_id: int, db: Session) -> None:
    session = db.scalar(select(StudySession).where(StudySession.id == session_id, StudySession.user_id == user_id))
    if session is None: raise LookupError('Session not found')
    db.delete(session); db.commit()
