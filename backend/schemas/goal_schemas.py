from datetime import datetime
from enum import Enum
from pydantic import BaseModel, ConfigDict, Field, field_validator

class GoalKind(str, Enum):
    WEEKLY_MINUTES = 'weekly_minutes'
    TOTAL_MINUTES = 'total_minutes'
    TASKS_DONE = 'tasks_done'
    TOPICS_DONE = 'topics_done'
    SESSIONS_COUNT = 'sessions_count'

class GoalCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    kind: GoalKind
    target: int = Field(gt=0, le=100000)
    @field_validator('title', mode='before')
    @classmethod
    def trim(cls, value):
        if value is None: return None
        value = str(value).strip()
        return value or None

class GoalResponse(BaseModel):
    id: int; user_id: int; title: str; kind: GoalKind; target: int
    current: int; percent: int; created_at: datetime
    model_config = ConfigDict(from_attributes=True)
