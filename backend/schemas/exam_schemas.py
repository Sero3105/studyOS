from datetime import date, datetime, time
from enum import Enum
from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator, model_validator

class ExamStatus(str, Enum):
    PLANNED='planned'; IN_PROGRESS='in_progress'; PASSED='passed'; FAILED='failed'
class ExamCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    subject: str = Field(min_length=1, max_length=120)
    exam_date: date | None = None  # None = data da fissare
    exam_time: time | None = None
    location: str | None = Field(default=None, max_length=120)
    notes: str | None = Field(default=None, max_length=2000)
    status: ExamStatus = ExamStatus.PLANNED
    cfu: int | None = Field(default=None, ge=1, le=30)
    grade: int | None = Field(default=None, ge=18, le=30)
    honors: bool = False
    plan_days_off: list[date] = Field(default=[], max_length=120)  # giorni liberi del piano di questo esame
    @field_serializer('plan_days_off')
    def days_as_text(self, days):  # la colonna è JSON: date ISO, ordinate e senza doppioni
        return None if days is None else sorted({d.isoformat() for d in days})
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
    plan_days_off: list[date] | None = Field(default=None, max_length=120)
    @field_serializer('plan_days_off')
    def days_as_text(self, days):  # la colonna è JSON: date ISO, ordinate e senza doppioni
        return None if days is None else sorted({d.isoformat() for d in days})
    @field_validator('title','subject','location','notes', mode='before')
    @classmethod
    def trim(cls, value):
        if value is None: return None
        value = str(value).strip()
        return value or None
    # Si possono omettere, non svuotare: le colonne sono NOT NULL.
    @field_validator('title','subject','status','honors','plan_days_off')
    @classmethod
    def not_null(cls, value):
        if value is None: raise ValueError('Field cannot be empty')
        return value
class AttemptCreate(BaseModel):
    outcome: Literal['failed', 'rejected']  # bocciato, oppure voto rifiutato
    grade: int | None = Field(default=None, ge=18, le=30)
class AttemptResponse(AttemptCreate):
    id: int; exam_date: date
    model_config = ConfigDict(from_attributes=True)
class PlanRequest(BaseModel):
    # Giorni della settimana senza studio, 1 = lunedì ... 7 = domenica.
    rest_days: list[Annotated[int, Field(ge=1, le=7)]] = Field(default=[], max_length=7)
    # Preferenze dello studente: l'algoritmo si adatta (vedi services/study_plan.PlanPrefs).
    start_date: date | None = None  # primo giorno del piano; vuoto = domani
    days_off: list[date] = Field(default=[], max_length=120)  # giorni precisi senza studio
    limit_unit: Literal['tasks', 'hours'] = 'tasks'
    limit_value: float | None = Field(default=None, gt=0, le=24)  # attività o ore al giorno; vuoto = automatico
    reviews: Literal['light', 'standard', 'intense'] = 'standard'
    final_days: int | None = Field(default=None, ge=1, le=14)
    rest_before_exam: bool = False  # il giorno prima dell'esame resta libero
    order: Literal['course', 'hardest'] = 'course'
    study_minutes: int = Field(default=50, ge=15, le=180)
    # Limite diverso per lunedì..domenica, nella stessa unità di limit_value; vuoto = come limit_value.
    weekday_limits: list[Annotated[float, Field(gt=0, le=24)] | None] | None = Field(default=None, min_length=7, max_length=7)
    adapt: bool = True  # adatta durate e date allo storico (ritmo reale, task fatti in tempo)
    focus_days: int = Field(default=3, ge=0, le=7)  # giorni di studio prima di ogni esame riservati a quella materia
class PlanAdviceResponse(BaseModel):
    ideal_start: date; latest_start: date; ideal_days: int; min_days: int; full_items: int; min_items: int; full_minutes: int; min_minutes: int
    reliability: float | None = None  # quota di task del piano fatti in tempo (ultimi 60 giorni); None = pochi dati
    pace: float | None = None  # tempo reale / tempo previsto per lo studio; None = pochi dati
class ExamResponse(BaseModel):
    id:int; user_id:int; title:str; subject:str; subject_id:int|None=None; exam_date:date|None; exam_time:time|None; location:str|None; notes:str|None; status:ExamStatus; cfu:int|None; grade:int|None; honors:bool; plan_days_off:list[date]=[]; created_at:datetime; updated_at:datetime
    attempts: list[AttemptResponse] = []
    model_config=ConfigDict(from_attributes=True)
