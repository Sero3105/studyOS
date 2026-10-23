from pydantic import BaseModel, Field
from schemas.exam_schemas import ExamCreate
from schemas.goal_schemas import GoalCreate
from schemas.session_schemas import SessionCreate
from schemas.subject_schemas import SubjectCreate, TopicCreate
from schemas.task_schemas import TaskCreate

# Gli id nel file servono solo a ricollegare task/sessioni a materie/argomenti:
# all'import vengono sempre creati record nuovi dell'utente corrente.
class TopicData(TopicCreate):
    id: int | None = None
    completed: bool = False

class SubjectData(SubjectCreate):
    id: int | None = None
    topics: list[TopicData] = Field(default=[], max_length=1000)

class StudyData(BaseModel):
    version: int = 1
    subjects: list[SubjectData] = Field(default=[], max_length=1000)
    tasks: list[TaskCreate] = Field(default=[], max_length=10000)
    exams: list[ExamCreate] = Field(default=[], max_length=1000)
    sessions: list[SessionCreate] = Field(default=[], max_length=50000)
    goals: list[GoalCreate] = Field(default=[], max_length=1000)

class ImportResult(BaseModel):
    subjects: int; topics: int; tasks: int; exams: int; sessions: int; goals: int
