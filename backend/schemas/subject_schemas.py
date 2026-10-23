from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator

def _trim(value):
    if value is None: return None
    value = str(value).strip()
    return value or None

class SubjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    @field_validator('name', mode='before')
    @classmethod
    def trim(cls, value): return _trim(value)

class TopicCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    @field_validator('title', mode='before')
    @classmethod
    def trim(cls, value): return _trim(value)

class TopicUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    completed: bool | None = None
    notes: str | None = Field(default=None, max_length=20000)
    # Non salvato: se il topic diventa completato, crea i task di ripasso.
    schedule_reviews: bool = False
    @field_validator('title', mode='before')
    @classmethod
    def trim(cls, value): return _trim(value)

class TopicResponse(BaseModel):
    id: int; subject_id: int; title: str; completed: bool; notes: str | None = None; created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class SubjectResponse(BaseModel):
    id: int; user_id: int; name: str; created_at: datetime; topics: list[TopicResponse] = []
    model_config = ConfigDict(from_attributes=True)
