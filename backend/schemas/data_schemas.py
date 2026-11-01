from datetime import date, datetime
from pydantic import BaseModel, Field
from schemas.card_schemas import CardCreate, MistakeCreate
from schemas.settings_schemas import Preferences
from schemas.exam_schemas import AttemptCreate, ExamCreate
from schemas.goal_schemas import GoalCreate
from schemas.session_schemas import SessionCreate
from schemas.subject_schemas import SubjectCreate, TopicCreate
from schemas.task_schemas import TaskCreate

# Gli id nel file servono solo a ricollegare task/sessioni a materie/argomenti:
# all'import vengono sempre creati record nuovi dell'utente corrente.
class TopicData(TopicCreate):
    id: int | None = None
    completed: bool = False
    notes: str | None = Field(default=None, max_length=20000)
    difficulty: int = Field(default=2, ge=1, le=3)

class SubjectData(SubjectCreate):
    id: int | None = None
    topics: list[TopicData] = Field(default=[], max_length=1000)

class SessionData(SessionCreate):
    # Ora di fine della sessione: serve alle "ore migliori di studio", va conservata nel ripristino.
    created_at: datetime | None = None

class AttemptData(AttemptCreate):
    exam_date: date

class ExamData(ExamCreate):
    attempts: list[AttemptData] = Field(default=[], max_length=100)

class CardData(CardCreate):
    due_date: date | None = None
    interval: int = Field(default=0, ge=0, le=3650)

class MistakeData(MistakeCreate):
    created_at: datetime | None = None

class StudyData(BaseModel):
    version: int = 1
    subjects: list[SubjectData] = Field(default=[], max_length=1000)
    tasks: list[TaskCreate] = Field(default=[], max_length=10000)
    exams: list[ExamData] = Field(default=[], max_length=1000)
    sessions: list[SessionData] = Field(default=[], max_length=50000)
    goals: list[GoalCreate] = Field(default=[], max_length=1000)
    cards: list[CardData] = Field(default=[], max_length=50000)
    mistakes: list[MistakeData] = Field(default=[], max_length=10000)
    preferences: Preferences | None = None

class ImportResult(BaseModel):
    subjects: int; topics: int; tasks: int; exams: int; sessions: int; goals: int; cards: int = 0; mistakes: int = 0
