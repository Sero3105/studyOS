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
    if goal.kind == GoalKind.WEEKLY_MINUTES:
        monday = date.today() - timedelta(days=date.today().weekday())
        return int(db.scalar(select(func.coalesce(func.sum(StudySession.duration_minutes), 0)).where(
            StudySession.user_id == user_id, StudySession.studied_on >= monday)) or 0)
    if goal.kind == GoalKind.TOTAL_MINUTES:
        return int(db.scalar(select(func.coalesce(func.sum(StudySession.duration_minutes), 0)).where(
            StudySession.user_id == user_id)) or 0)
    if goal.kind == GoalKind.TASKS_DONE:
        return int(db.scalar(select(func.count(Task.id)).where(Task.user_id == user_id, Task.status == 'done')) or 0)
    if goal.kind == GoalKind.TOPICS_DONE:
        return int(db.scalar(select(func.count(Topic.id)).join(Subject).where(
            Subject.user_id == user_id, Topic.completed.is_(True))) or 0)
    return int(db.scalar(select(func.count(StudySession.id)).where(StudySession.user_id == user_id)) or 0)

def with_progress(goal: Goal, db: Session) -> dict:
    current = goal_progress(goal, db)
    return {
        'id': goal.id, 'user_id': goal.user_id, 'title': goal.title, 'kind': goal.kind,
        'target': goal.target, 'current': current,
        'percent': min(100, round(current * 100 / goal.target)) if goal.target else 0,
        'created_at': goal.created_at,
    }

def create_goal(data: GoalCreate, user_id: int, db: Session) -> dict:
    goal = Goal(user_id=user_id, title=data.title, kind=data.kind.value, target=data.target)
    db.add(goal); db.commit(); db.refresh(goal)
    return with_progress(goal, db)

def list_goals(user_id: int, db: Session) -> list[dict]:
    goals = list(db.scalars(select(Goal).where(Goal.user_id == user_id).order_by(Goal.id)))
    return [with_progress(goal, db) for goal in goals]

def delete_goal(goal_id: int, user_id: int, db: Session) -> None:
    goal = db.scalar(select(Goal).where(Goal.id == goal_id, Goal.user_id == user_id))
    if goal is None: raise LookupError('Goal not found')
    db.delete(goal); db.commit()
