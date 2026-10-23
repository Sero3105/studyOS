"""One revocable, unguessable read-only link per user."""
from datetime import date
from secrets import token_urlsafe
from sqlalchemy import delete, select
from sqlalchemy.orm import Session
from models.exam_models import Exam
from models.share_models import ShareLink
from models.task_models import Task
from services.subject_service import list_subjects
from services.token_service import hash_secret

def get_share(user_id: int, db: Session) -> ShareLink | None:
    return db.scalar(select(ShareLink).where(ShareLink.user_id == user_id))

def create_share(user_id: int, db: Session) -> tuple[str, ShareLink]:
    """Rotates: any previous link stops working."""
    token = token_urlsafe(32)
    db.execute(delete(ShareLink).where(ShareLink.user_id == user_id))
    link = ShareLink(user_id=user_id, token_hash=hash_secret(token))
    db.add(link); db.commit(); db.refresh(link)
    return token, link

def revoke_share(user_id: int, db: Session) -> None:
    db.execute(delete(ShareLink).where(ShareLink.user_id == user_id)); db.commit()

def get_shared_plan(token: str, db: Session) -> dict:
    link = db.scalar(select(ShareLink).where(ShareLink.token_hash == hash_secret(token)))
    if link is None: raise LookupError('Share link not found')
    uid = link.user_id
    tasks = db.scalars(select(Task).where(Task.user_id == uid, Task.status != 'done').order_by(Task.due_date.is_(None), Task.due_date, Task.id))
    exams = db.scalars(select(Exam).where(Exam.user_id == uid, Exam.exam_date >= date.today(), Exam.status.in_(('planned', 'in_progress'))).order_by(Exam.exam_date, Exam.id))
    return {'subjects': list_subjects(uid, db), 'tasks': list(tasks), 'exams': list(exams)}
