"""Export/import of all of a user's study data as JSON, and topic notes as a Markdown vault."""
import io
import re
import zipfile
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
        subjects=[{'id': s.id, 'name': s.name, 'topics': [{'id': t.id, 'title': t.title, 'completed': t.completed, 'notes': t.notes} for t in s.topics]}
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
                topic = Topic(subject=subject, title=t.title, completed=t.completed, notes=t.notes)
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
                f"- {e.exam_date.isoformat()} · {e.title}" + (f' · {e.grade}{"L" if e.honors else ""}/30' if e.grade else '') for e in exams]
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
