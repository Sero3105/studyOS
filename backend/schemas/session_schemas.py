from datetime import date, datetime
from enum import Enum
from pydantic import BaseModel, ConfigDict, Field, field_validator

class SessionKind(str, Enum):
    STUDY = 'study'; LESSON = 'lesson'; EXERCISES = 'exercises'; REVIEW = 'review'; LAB = 'lab'

# Id della seduta generato dal browser (utils/sitting.ts `sittingId`).
UID_PATTERN = r'^[A-Za-z0-9-]{1,36}$'

def _trim(value):
    if value is None: return None
    value = str(value).strip()
    return value or None

class SessionCreate(BaseModel):
    subject_id: int | None = None
    topic_id: int | None = None
    duration_minutes: int = Field(gt=0, le=1440)
    studied_on: date
    notes: str | None = Field(default=None, max_length=2000)
    kind: SessionKind = SessionKind.STUDY
    focus: int | None = Field(default=None, ge=1, le=3)
    sitting_id: str | None = Field(default=None, pattern=UID_PATTERN)
    partial: bool = False
    interruptions: int | None = Field(default=None, ge=0, le=1000)
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
    kind: SessionKind | None = None
    focus: int | None = Field(default=None, ge=1, le=3)
    @field_validator('notes', mode='before')
    @classmethod
    def trim(cls, value):
        if value is None: return None
        value = str(value).strip()
        return value or None
    # Si possono omettere, non svuotare: le colonne sono NOT NULL.
    @field_validator('duration_minutes', 'studied_on', 'kind')
    @classmethod
    def not_null(cls, value):
        if value is None: raise ValueError('Field cannot be empty')
        return value

class SessionResponse(BaseModel):
    id: int; user_id: int; subject_id: int | None; topic_id: int | None
    duration_minutes: int; studied_on: date; notes: str | None; kind: SessionKind = SessionKind.STUDY
    focus: int | None = None; sitting_id: str | None = None; partial: bool = False
    interruptions: int | None = None; created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ChecklistItem(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    text: str = Field(min_length=1, max_length=200)
    done: bool = False

class Distraction(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    text: str = Field(min_length=1, max_length=300)
    block: int = Field(default=0, ge=0, le=1000)  # blocco (da 1) in cui è stata annotata

class SittingSave(BaseModel):
    """Stato completo della seduta: il PUT lo sostituisce, così rimandarlo dalla coda offline è innocuo."""
    subject_id: int | None = None
    topic_id: int | None = None
    started_on: date
    goal: str | None = Field(default=None, max_length=500)
    checklist: list[ChecklistItem] = Field(default=[], max_length=50)
    distractions: list[Distraction] = Field(default=[], max_length=100)
    resume_note: str | None = Field(default=None, max_length=1000)
    @field_validator('goal', 'resume_note', mode='before')
    @classmethod
    def trim(cls, value): return _trim(value)

class SittingResponse(SittingSave):
    id: int; uid: str; created_at: datetime; updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
