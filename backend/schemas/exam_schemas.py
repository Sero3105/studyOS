from datetime import date, datetime, time
from enum import Enum
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

class ExamStatus(str, Enum):
    PLANNED='planned'; IN_PROGRESS='in_progress'; PASSED='passed'; FAILED='failed'
class ExamCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    subject: str = Field(min_length=1, max_length=120)
    exam_date: date
    exam_time: time | None = None
    location: str | None = Field(default=None, max_length=120)
    notes: str | None = Field(default=None, max_length=2000)
    status: ExamStatus = ExamStatus.PLANNED
    cfu: int | None = Field(default=None, ge=1, le=30)
    grade: int | None = Field(default=None, ge=18, le=30)
    honors: bool = False
    @model_validator(mode='after')
    def honors_need_30(self):
        if self.honors and self.grade != 30: raise ValueError('La lode richiede voto 30')
        return self
    @field_validator('title','subject','location','notes', mode='before')
    @classmethod
    def trim(cls, value):
        if value is None: return None
        value = str(value).strip()
        return value or None
class ExamUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    subject: str | None = Field(default=None, min_length=1, max_length=120)
    exam_date: date | None = None
    exam_time: time | None = None
    location: str | None = Field(default=None, max_length=120)
    notes: str | None = Field(default=None, max_length=2000)
    status: ExamStatus | None = None
    cfu: int | None = Field(default=None, ge=1, le=30)
    grade: int | None = Field(default=None, ge=18, le=30)
    honors: bool | None = None
    @field_validator('title','subject','location','notes', mode='before')
    @classmethod
    def trim(cls, value):
        if value is None: return None
        value = str(value).strip()
        return value or None
class ExamResponse(BaseModel):
    id:int; user_id:int; title:str; subject:str; exam_date:date; exam_time:time|None; location:str|None; notes:str|None; status:ExamStatus; cfu:int|None; grade:int|None; honors:bool; created_at:datetime; updated_at:datetime
    model_config=ConfigDict(from_attributes=True)
