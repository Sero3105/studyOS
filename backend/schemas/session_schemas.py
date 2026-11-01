from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator

class SessionCreate(BaseModel):
    subject_id: int | None = None
    topic_id: int | None = None
    duration_minutes: int = Field(gt=0, le=1440)
    studied_on: date
    notes: str | None = Field(default=None, max_length=2000)
    @field_validator('notes', mode='before')
    @classmethod
    def trim(cls, value):
        if value is None: return None
        value = str(value).strip()
        return value or None

class SessionUpdate(BaseModel):
    subject_id: int | None = None
    topic_id: int | None = None
    duration_minutes: int | None = Field(default=None, gt=0, le=1440)
    studied_on: date | None = None
    notes: str | None = Field(default=None, max_length=2000)
    @field_validator('notes', mode='before')
    @classmethod
    def trim(cls, value):
        if value is None: return None
        value = str(value).strip()
        return value or None
    # Si possono omettere, non svuotare: le colonne sono NOT NULL.
    @field_validator('duration_minutes', 'studied_on')
    @classmethod
    def not_null(cls, value):
        if value is None: raise ValueError('Field cannot be empty')
        return value

class SessionResponse(BaseModel):
    id: int; user_id: int; subject_id: int | None; topic_id: int | None
    duration_minutes: int; studied_on: date; notes: str | None; created_at: datetime
    model_config = ConfigDict(from_attributes=True)
