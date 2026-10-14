from datetime import date, datetime
from enum import Enum
from pydantic import BaseModel, ConfigDict, Field, field_validator

def _trim(value):
    if value is None: return None
    value = str(value).strip()
    return value or None

class TaskPriority(str, Enum):
    LOW = 'low'; MEDIUM = 'medium'; HIGH = 'high'

class TaskStatus(str, Enum):
    TODO = 'todo'; IN_PROGRESS = 'in_progress'; DONE = 'done'

class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    due_date: date | None = None
    priority: TaskPriority = TaskPriority.MEDIUM
    status: TaskStatus = TaskStatus.TODO
    subject_id: int | None = None
    topic_id: int | None = None
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
    @field_validator('title', 'description', mode='before')
    @classmethod
    def trim(cls, value): return _trim(value)

class TaskResponse(BaseModel):
    id: int; user_id: int; title: str; description: str | None; due_date: date | None
    priority: TaskPriority; status: TaskStatus; subject_id: int | None; topic_id: int | None
    created_at: datetime; updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
