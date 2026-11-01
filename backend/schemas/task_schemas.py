from datetime import date, datetime, time
from enum import Enum
from pydantic import BaseModel, ConfigDict, Field, field_validator
from services.spaced_repetition import Rating

def _trim(value):
    if value is None: return None
    value = str(value).strip()
    return value or None

class TaskPriority(str, Enum):
    LOW = 'low'; MEDIUM = 'medium'; HIGH = 'high'

class TaskStatus(str, Enum):
    TODO = 'todo'; IN_PROGRESS = 'in_progress'; DONE = 'done'

# 'daily' oppure 'weekly:' + giorni ISO (1 = lunedì ... 7 = domenica), es. 'weekly:1,3'.
RECURRENCE = r'^(daily|weekly:[1-7](,[1-7]){0,6})$'

class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    due_date: date | None = None
    priority: TaskPriority = TaskPriority.MEDIUM
    status: TaskStatus = TaskStatus.TODO
    subject_id: int | None = None
    topic_id: int | None = None
    recurrence: str | None = Field(default=None, pattern=RECURRENCE)
    review_interval: int | None = Field(default=None, ge=1, le=365)
    scheduled_time: time | None = None
    planned_minutes: int | None = Field(default=None, ge=5, le=720)
    @field_validator('title', 'description', mode='before')
    @classmethod
    def trim(cls, value): return _trim(value)

class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    due_date: date | None = None
    priority: TaskPriority | None = None
    status: TaskStatus | None = None
    subject_id: int | None = None
    topic_id: int | None = None
    recurrence: str | None = Field(default=None, pattern=RECURRENCE)
    scheduled_time: time | None = None
    planned_minutes: int | None = Field(default=None, ge=5, le=720)
    # Non salvato: com'è andato il ripasso che si sta completando (default ok).
    review_rating: Rating | None = None
    @field_validator('title', 'description', mode='before')
    @classmethod
    def trim(cls, value): return _trim(value)
    # Si possono omettere, non svuotare: le colonne sono NOT NULL.
    @field_validator('title', 'priority', 'status')
    @classmethod
    def not_null(cls, value):
        if value is None: raise ValueError('Field cannot be empty')
        return value

class TaskResponse(BaseModel):
    id: int; user_id: int; title: str; description: str | None; due_date: date | None
    priority: TaskPriority; status: TaskStatus; subject_id: int | None; topic_id: int | None
    recurrence: str | None = None; review_interval: int | None = None
    scheduled_time: time | None = None; planned_minutes: int | None = None; created_at: datetime; updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
