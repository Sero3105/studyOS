from datetime import date, timedelta
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

def next_due(recurrence: str, due: date | None, today: date) -> date:
    """Prossima scadenza dopo quella attuale; mai nel passato se il task era in ritardo."""
    day = max(due or today, today - timedelta(days=1)) + timedelta(days=1)
    if recurrence == 'daily': return day
    weekdays = {int(d) for d in recurrence.removeprefix('weekly:').split(',')}
    while day.isoweekday() not in weekdays: day += timedelta(days=1)
    return day

def update_task(task_id: int, data: TaskUpdate, user_id: int, db: Session) -> Task:
    task = _owned(task_id, user_id, db)
    values = data.model_dump(exclude_unset=True)
    _check_links(user_id, db, values.get('subject_id', task.subject_id), values.get('topic_id', task.topic_id))
    newly_done = values.get('status') == 'done' and task.status != 'done'
    for field, value in values.items(): setattr(task, field, value)
    if newly_done and task.recurrence:
        due = next_due(task.recurrence, task.due_date, date.today())
        # Riaprire e richiudere lo stesso task non deve creare due copie della prossima occorrenza.
        exists = db.scalar(select(Task.id).where(Task.user_id == user_id, Task.title == task.title, Task.recurrence == task.recurrence,
                                                 Task.due_date == due, Task.status != 'done', Task.id != task.id).limit(1))
        if exists is None:
            db.add(Task(user_id=user_id, title=task.title, description=task.description, due_date=due, priority=task.priority,
                        subject_id=task.subject_id, topic_id=task.topic_id, recurrence=task.recurrence))
    db.commit(); db.refresh(task)
    return task

def delete_task(task_id: int, user_id: int, db: Session) -> None:
    task = _owned(task_id, user_id, db)
    db.delete(task); db.commit()
