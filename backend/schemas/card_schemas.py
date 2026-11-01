from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator
from services.spaced_repetition import Rating

def _trim(value):
    if value is None: return None
    value = str(value).strip()
    return value or None

class CardCreate(BaseModel):
    topic_id: int
    front: str = Field(min_length=1, max_length=2000)
    back: str = Field(min_length=1, max_length=5000)
    @field_validator('front', 'back', mode='before')
    @classmethod
    def trim(cls, value): return _trim(value)

class CardFace(BaseModel):
    front: str = Field(min_length=1, max_length=2000)
    back: str = Field(min_length=1, max_length=5000)
    @field_validator('front', 'back', mode='before')
    @classmethod
    def trim(cls, value): return _trim(value)

class CardBulk(BaseModel):
    """Più carte nello stesso argomento (dalle note o da un file Anki/CSV)."""
    topic_id: int
    cards: list[CardFace] = Field(min_length=1, max_length=2000)

class BulkResult(BaseModel):
    created: int; skipped: int

class MistakeCreate(BaseModel):
    topic_id: int
    mistake: str = Field(min_length=1, max_length=5000)
    correction: str = Field(min_length=1, max_length=5000)
    source: str | None = Field(default=None, max_length=200)
    @field_validator('mistake', 'correction', 'source', mode='before')
    @classmethod
    def trim(cls, value): return _trim(value)

class MistakeUpdate(BaseModel):
    card_id: int | None = None

class MistakeResponse(BaseModel):
    id: int; topic_id: int; mistake: str; correction: str; source: str | None; card_id: int | None; created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class CardReview(BaseModel):
    rating: Rating

class CardResponse(BaseModel):
    id: int; topic_id: int; front: str; back: str; due_date: date; interval: int
    model_config = ConfigDict(from_attributes=True)
