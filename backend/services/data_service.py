"""Export/import of all of a user's study data as JSON, and topic notes as a Markdown vault."""
import io
import re
import zipfile
from sqlalchemy import delete, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from models.card_models import Card, Mistake
from models.exam_models import Exam, ExamAttempt
from models.goal_models import Goal
from models.session_models import StudySession
from models.subject_models import Subject, Topic
from models.task_models import Task
from models.user_models import User
from schemas.data_schemas import CardData, ExamData, ImportResult, MistakeData, SessionData, StudyData
from schemas.goal_schemas import GoalCreate
from schemas.subject_schemas import SubjectCreate
from schemas.task_schemas import TaskCreate
from services.exam_service import link_subject
from services.subject_service import list_subjects

def _owned(model, user_id: int, db: Session):
    return db.scalars(select(model).where(model.user_id == user_id).order_by(model.id))

def export_user_data(user_id: int, db: Session) -> StudyData:
    rows = lambda model, schema: [schema.model_validate(r, from_attributes=True) for r in _owned(model, user_id, db)]
    return StudyData(
        subjects=[{'id': s.id, 'name': s.name, 'color': s.color, 'topics': [{'id': t.id, 'title': t.title, 'completed': t.completed, 'notes': t.notes, 'difficulty': t.difficulty} for t in s.topics]}
                  for s in list_subjects(user_id, db)],
        tasks=rows(Task, TaskCreate), exams=rows(Exam, ExamData),
        sessions=rows(StudySession, SessionData), goals=rows(Goal, GoalCreate), cards=rows(Card, CardData),
        mistakes=rows(Mistake, MistakeData), preferences=db.get(User, user_id).preferences,
    )

def _delete_user_data(user_id: int, db: Session) -> None:
    owned_subjects = select(Subject.id).where(Subject.user_id == user_id)
    db.execute(delete(Card).where(Card.user_id == user_id))
    db.execute(delete(Mistake).where(Mistake.user_id == user_id))
    db.execute(delete(Topic).where(Topic.subject_id.in_(owned_subjects)))
    for model in (Task, StudySession, ExamAttempt, Exam, Goal, Subject):
        db.execute(delete(model).where(model.user_id == user_id))

def import_user_data(data: StudyData, user_id: int, db: Session, replace: bool = False) -> ImportResult:
    """Adds everything as new records in one transaction; ids from the file only relink rows.
    With replace, the user's current study data is deleted first, in the same transaction."""
    subject_ids: dict[int, Subject] = {}
    topic_ids: dict[int, Topic] = {}
    topics = 0
    try:
        if replace: _delete_user_data(user_id, db)
        for s in data.subjects:
            subject = Subject(user_id=user_id, name=s.name, color=s.color)
            db.add(subject)
            if s.id is not None: subject_ids[s.id] = subject
            for t in s.topics:
                topic = Topic(subject=subject, title=t.title, completed=t.completed, notes=t.notes, difficulty=t.difficulty)
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
            db.add(StudySession(user_id=user_id, **(s.model_dump(exclude_none=True) | links(s))))
        for e in data.exams:
            exam = Exam(user_id=user_id, **e.model_dump(exclude={'attempts'}))
            exam.attempts = [ExamAttempt(user_id=user_id, **a.model_dump()) for a in e.attempts]
            link_subject(exam, db)
            db.add(exam)
        cards = 0
        for c in data.cards:
            topic = topic_ids.get(c.topic_id)
            if topic is None: continue  # carta senza argomento nel file: scartata
            db.add(Card(user_id=user_id, **(c.model_dump(exclude_none=True) | {'topic_id': topic.id}))); cards += 1
        mistakes = 0
        for m in data.mistakes:
            topic = topic_ids.get(m.topic_id)
            if topic is None: continue
            db.add(Mistake(user_id=user_id, **(m.model_dump(exclude_none=True) | {'topic_id': topic.id}))); mistakes += 1
        # Le preferenze del file valgono nel ripristino, o se l'utente non ne ha ancora.
        user = db.get(User, user_id)
        if data.preferences is not None and (replace or not user.preferences): user.preferences = data.preferences.root
        for g in data.goals:
            subject = subject_ids.get(g.subject_id)
            db.add(Goal(user_id=user_id, **(g.model_dump() | {'subject_id': subject.id if subject else None})))
        db.commit()
    except SQLAlchemyError:
        db.rollback(); raise
    return ImportResult(subjects=len(data.subjects), topics=topics, tasks=len(data.tasks),
                        exams=len(data.exams), sessions=len(data.sessions), goals=len(data.goals), cards=cards, mistakes=mistakes)


# --- Vault Synapse: note degli argomenti come file Markdown collegati ---------

_VAULT_LABELS = {
    'it': {'subject': 'Materia', 'topics': 'Argomenti', 'exams': 'Esami', 'no_notes': '_Nessuna nota._', 'index': 'StudyOS'},
    'en': {'subject': 'Subject', 'topics': 'Topics', 'exams': 'Exams', 'no_notes': '_No notes yet._', 'index': 'StudyOS'},
}

def _file_name(name: str) -> str:
    """Note name safe as a file name on macOS/Windows; wiki links use the same name."""
    cleaned = re.sub(r'[\\/:*?"<>|#^\[\]]', '-', name).strip().lstrip('.')
    return cleaned[:120] or 'untitled'

def _tag(name: str) -> str:
    return re.sub(r'[^\w-]+', '-', name.lower()).strip('-') or 'subject'

def build_notes_vault(user_id: int, lang: str, db: Session) -> bytes:
    """Zip of Markdown notes that Synapse (or any Markdown editor) opens as a vault."""
    L = _VAULT_LABELS.get(lang, _VAULT_LABELS['en'])
    subjects = list_subjects(user_id, db)
    exams = list(_owned(Exam, user_id, db))
    used: set[str] = set()

    def unique(name: str, suffix: str) -> str:
        base = _file_name(name)
        candidate = base if base.lower() not in used else _file_name(f'{name} ({suffix})')
        used.add(candidate.lower())
        return candidate

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as vault:
        subject_notes = [(s, unique(s.name, L['subject'])) for s in subjects]
        index = [f"# {L['index']}", '', f"## {L['topics']}"] + [f'- [[{name}]]' for _, name in subject_notes]
        if exams:
            index += ['', f"## {L['exams']}"] + [
                f"- {e.exam_date.isoformat() if e.exam_date else '—'} · {e.title}" + (f' · {e.grade}{"L" if e.honors else ""}/30' if e.grade else '') for e in exams]
        vault.writestr(f"StudyOS/{L['index']}.md", '\n'.join(index) + '\n')
        for subject, subject_note in subject_notes:
            tag = _tag(subject.name)
            topic_notes = [(t, unique(t.title, subject.name)) for t in subject.topics]
            body = ['---', f'tags: [studyos, {tag}]', '---', f'# {subject.name}', '', f"## {L['topics']}"]
            body += [f"- [{'x' if t.completed else ' '}] [[{name}]]" for t, name in topic_notes]
            vault.writestr(f'StudyOS/{subject_note}/{subject_note}.md', '\n'.join(body) + '\n')
            for topic, name in topic_notes:
                status = 'done' if topic.completed else 'todo'
                note = ['---', f'tags: [studyos, {tag}, {status}]', '---', f'# {topic.title}', '',
                        f"{L['subject']}: [[{subject_note}]]", '', topic.notes or L['no_notes']]
                vault.writestr(f'StudyOS/{subject_note}/{name}.md', '\n'.join(note) + '\n')
    return buffer.getvalue()
