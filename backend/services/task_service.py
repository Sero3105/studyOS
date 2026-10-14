from sqlalchemy import case, select
from sqlalchemy.orm import Session
from models.subject_models import Subject, Topic
from models.task_models import Task
from schemas.task_schemas import TaskCreate, TaskUpdate

def _check_links(user_id: int, db: Session, subject_id, topic_id) -> None:
    if subject_id is not None:
        owned = db.scalar(select(Subject.id).where(Subject.id == subject_id, Subject.user_id == user_id))
        if owned is None: raise ValueError('Subject not found')
    if topic_id is not None:
        topic = db.get(Topic, topic_id)
        if topic is None or (subject_id is not None and topic.subject_id != subject_id):
            raise ValueError('Topic not found')
        owner = db.scalar(select(Subject.user_id).where(Subject.id == topic.subject_id))
        if owner != user_id: raise ValueError('Topic not found')

def create_task(data: TaskCreate, user_id: int, db: Session) -> Task:
    _check_links(user_id, db, data.subject_id, data.topic_id)
    task = Task(user_id=user_id, **data.model_dump())
    db.add(task); db.commit(); db.refresh(task)
    return task

def list_tasks(user_id: int, db: Session) -> list[Task]:
    return list(db.scalars(select(Task).where(Task.user_id == user_id).order_by(
        case((Task.status == 'done', 1), else_=0),
        case((Task.due_date.is_(None), 1), else_=0), Task.due_date, Task.id)))

def _owned(task_id: int, user_id: int, db: Session) -> Task:
    task = db.scalar(select(Task).where(Task.id == task_id, Task.user_id == user_id))
    if task is None: raise LookupError('Task not found')
    return task

def update_task(task_id: int, data: TaskUpdate, user_id: int, db: Session) -> Task:
    task = _owned(task_id, user_id, db)
    values = data.model_dump(exclude_unset=True)
    _check_links(user_id, db, values.get('subject_id', task.subject_id), values.get('topic_id', task.topic_id))
    for field, value in values.items(): setattr(task, field, value)
    db.commit(); db.refresh(task)
    return task

def delete_task(task_id: int, user_id: int, db: Session) -> None:
    task = _owned(task_id, user_id, db)
    db.delete(task); db.commit()
