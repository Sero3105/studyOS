from datetime import date, timedelta
from sqlalchemy import select
from sqlalchemy.orm import Session
from models.session_models import StudySession
from models.subject_models import Subject, Topic
from models.task_models import Task
from services import exam_service, goal_service
from schemas.task_schemas import TaskResponse
from schemas.exam_schemas import ExamResponse
from models.goal_models import Goal

def _streak(days: set[date], today: date) -> int:
    cursor = today if today in days else today - timedelta(days=1)
    streak = 0
    while cursor in days:
        streak += 1
        cursor -= timedelta(days=1)
    return streak

def summary(user_id: int, db: Session) -> dict:
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    sessions = list(db.scalars(select(StudySession).where(StudySession.user_id == user_id)))
    subjects = {s.id: s.name for s in db.scalars(select(Subject).where(Subject.user_id == user_id))}
    topics = {t.id: t.title for t in db.scalars(select(Topic).join(Subject).where(Subject.user_id == user_id))}
    tasks = list(db.scalars(select(Task).where(Task.user_id == user_id)))
    topics_all = list(db.scalars(select(Topic).join(Subject).where(Subject.user_id == user_id)))

    by_day: dict[date, int] = {}
    by_subject: dict[str, int] = {}
    by_topic: dict[str, int] = {}
    for s in sessions:
        by_day[s.studied_on] = by_day.get(s.studied_on, 0) + s.duration_minutes
        if s.subject_id in subjects: by_subject[subjects[s.subject_id]] = by_subject.get(subjects[s.subject_id], 0) + s.duration_minutes
        if s.topic_id in topics: by_topic[topics[s.topic_id]] = by_topic.get(topics[s.topic_id], 0) + s.duration_minutes

    daily = [{'date': (today - timedelta(days=offset)).isoformat(), 'minutes': by_day.get(today - timedelta(days=offset), 0)} for offset in range(6, -1, -1)]
    open_tasks = sorted([t for t in tasks if t.status != 'done'], key=lambda t: (t.due_date is None, t.due_date or date.max, t.id))[:5]
    exams = [e for e in exam_service.list_user_exams(user_id, db) if e.status in ('planned', 'in_progress') and e.exam_date >= today][:5]
    last = max(sessions, key=lambda s: (s.studied_on, s.id), default=None)
    goals = list(db.scalars(select(Goal).where(Goal.user_id == user_id).order_by(Goal.id)))

    return {
        'total_minutes': sum(s.duration_minutes for s in sessions),
        'today_minutes': by_day.get(today, 0),
        'week_minutes': sum(m for d, m in by_day.items() if d >= monday),
        'month_minutes': sum(m for d, m in by_day.items() if d.year == today.year and d.month == today.month),
        'sessions_count': len(sessions),
        'tasks_done': sum(1 for t in tasks if t.status == 'done'),
        'tasks_total': len(tasks),
        'topics_done': sum(1 for t in topics_all if t.completed),
        'topics_total': len(topics_all),
        'streak_days': _streak(set(by_day), today),
        'daily': daily,
        'by_subject': [{'name': k, 'minutes': v} for k, v in sorted(by_subject.items(), key=lambda x: -x[1])],
        'by_topic': [{'name': k, 'minutes': v} for k, v in sorted(by_topic.items(), key=lambda x: -x[1])],
        'last_session': None if last is None else {
            'subject': subjects.get(last.subject_id), 'topic': topics.get(last.topic_id),
            'duration_minutes': last.duration_minutes, 'studied_on': last.studied_on.isoformat(),
        },
        'upcoming_tasks': [TaskResponse.model_validate(t).model_dump(mode='json') for t in open_tasks],
        'upcoming_exams': [ExamResponse.model_validate(e).model_dump(mode='json') for e in exams],
        'goals': goal_service.list_goals(user_id, db) if goals else [],
    }
