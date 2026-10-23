from datetime import date, datetime, time
from pydantic import BaseModel, ConfigDict

class ShareStatus(BaseModel):
    active: bool; created_at: datetime | None = None

class ShareCreated(BaseModel):
    token: str; created_at: datetime

# Vista pubblica: solo titoli, date e progressi. Niente note, luoghi, email o id utente.
class SharedTopic(BaseModel):
    title: str; completed: bool
    model_config = ConfigDict(from_attributes=True)

class SharedSubject(BaseModel):
    name: str; topics: list[SharedTopic]
    model_config = ConfigDict(from_attributes=True)

class SharedTask(BaseModel):
    title: str; due_date: date | None; priority: str; status: str
    model_config = ConfigDict(from_attributes=True)

class SharedExam(BaseModel):
    title: str; subject: str; exam_date: date; exam_time: time | None
    model_config = ConfigDict(from_attributes=True)

class SharedPlan(BaseModel):
    subjects: list[SharedSubject]; tasks: list[SharedTask]; exams: list[SharedExam]
