from datetime import date, datetime, time
from enum import Enum
from pydantic import BaseModel, ConfigDict, Field, field_validator

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
    @field_validator('title','subject','location','notes', mode='before')
    @classmethod
    def trim(cls, value):
        if value is None: return None
        value = str(value).strip()
        return value or None
class ExamResponse(BaseModel):
    id:int; user_id:int; title:str; subject:str; exam_date:date; exam_time:time|None; location:str|None; notes:str|None; status:ExamStatus; created_at:datetime; updated_at:datetime
    model_config=ConfigDict(from_attributes=True)
