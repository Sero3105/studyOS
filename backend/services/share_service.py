"""Secret-URL tokens (one per user and kind): plan share link and iCal feed."""
from datetime import date
from secrets import token_urlsafe
from sqlalchemy import delete, select
from sqlalchemy.orm import Session
from models.exam_models import Exam
from models.task_models import Task
from services.subject_service import list_subjects
from services.token_service import hash_secret

def get_link(model, user_id: int, db: Session):
    return db.scalar(select(model).where(model.user_id == user_id))

def create_link(model, user_id: int, db: Session) -> tuple[str, object]:
    """Rotates: any previous token stops working. Only the hash is stored."""
    token = token_urlsafe(32)
    db.execute(delete(model).where(model.user_id == user_id))
    link = model(user_id=user_id, token_hash=hash_secret(token))
    db.add(link); db.commit(); db.refresh(link)
    return token, link

def revoke_link(model, user_id: int, db: Session) -> None:
    db.execute(delete(model).where(model.user_id == user_id)); db.commit()

def owner_of(model, token: str, db: Session) -> int:
    if len(token) > 64: raise LookupError('Link not found')
    user_id = db.scalar(select(model.user_id).where(model.token_hash == hash_secret(token)))
    if user_id is None: raise LookupError('Link not found')
    return user_id

def open_tasks(user_id: int, db: Session) -> list[Task]:
    return list(db.scalars(select(Task).where(Task.user_id == user_id, Task.status != 'done').order_by(Task.due_date.is_(None), Task.due_date, Task.id)))

def upcoming_exams(user_id: int, db: Session) -> list[Exam]:
    return list(db.scalars(select(Exam).where(Exam.user_id == user_id, Exam.exam_date >= date.today(), Exam.status.in_(('planned', 'in_progress'))).order_by(Exam.exam_date, Exam.id)))

def get_shared_plan(user_id: int, db: Session) -> dict:
    return {'subjects': list_subjects(user_id, db), 'tasks': open_tasks(user_id, db), 'exams': upcoming_exams(user_id, db)}
