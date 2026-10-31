from datetime import date, timedelta
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from models.goal_models import Goal
from models.session_models import StudySession
from models.subject_models import Subject, Topic
from models.task_models import Task
from schemas.goal_schemas import GoalCreate, GoalKind

def goal_progress(goal: Goal, db: Session) -> int:
    user_id = goal.user_id
    sessions = [StudySession.user_id == user_id]
    if goal.subject_id is not None: sessions.append(StudySession.subject_id == goal.subject_id)
    # La scadenza ferma solo il conteggio dello studio: task e argomenti non hanno una data di completamento.
    if goal.deadline is not None: sessions.append(StudySession.studied_on <= goal.deadline)
    minutes = select(func.coalesce(func.sum(StudySession.duration_minutes), 0)).where(*sessions)
    if goal.kind == GoalKind.WEEKLY_MINUTES:
        monday = date.today() - timedelta(days=date.today().weekday())
        return int(db.scalar(minutes.where(StudySession.studied_on >= monday)) or 0)
    if goal.kind == GoalKind.TOTAL_MINUTES:
        return int(db.scalar(minutes) or 0)
    if goal.kind == GoalKind.TASKS_DONE:
        tasks = select(func.count(Task.id)).where(Task.user_id == user_id, Task.status == 'done')
        if goal.subject_id is not None: tasks = tasks.where(Task.subject_id == goal.subject_id)
        return int(db.scalar(tasks) or 0)
    if goal.kind == GoalKind.TOPICS_DONE:
        topics = select(func.count(Topic.id)).join(Subject).where(Subject.user_id == user_id, Topic.completed.is_(True))
        if goal.subject_id is not None: topics = topics.where(Topic.subject_id == goal.subject_id)
        return int(db.scalar(topics) or 0)
    return int(db.scalar(select(func.count(StudySession.id)).where(*sessions)) or 0)

def with_progress(goal: Goal, db: Session) -> dict:
    current = goal_progress(goal, db)
    return {
        'id': goal.id, 'user_id': goal.user_id, 'title': goal.title, 'kind': goal.kind,
        'target': goal.target, 'subject_id': goal.subject_id, 'deadline': goal.deadline, 'current': current,
        'percent': min(100, round(current * 100 / goal.target)) if goal.target else 0,
        'created_at': goal.created_at,
    }

def create_goal(data: GoalCreate, user_id: int, db: Session) -> dict:
    if data.subject_id is not None and db.scalar(select(Subject.id).where(Subject.id == data.subject_id, Subject.user_id == user_id)) is None:
        raise ValueError('Subject not found')
    goal = Goal(user_id=user_id, title=data.title, kind=data.kind.value, target=data.target, subject_id=data.subject_id, deadline=data.deadline)
    db.add(goal); db.commit(); db.refresh(goal)
    return with_progress(goal, db)

def list_goals(user_id: int, db: Session) -> list[dict]:
    goals = list(db.scalars(select(Goal).where(Goal.user_id == user_id).order_by(Goal.id)))
    return [with_progress(goal, db) for goal in goals]

def delete_goal(goal_id: int, user_id: int, db: Session) -> None:
    goal = db.scalar(select(Goal).where(Goal.id == goal_id, Goal.user_id == user_id))
    if goal is None: raise LookupError('Goal not found')
    db.delete(goal); db.commit()
