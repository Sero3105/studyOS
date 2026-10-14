from sqlalchemy import case, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from models.exam_models import Exam
from schemas.exam_schemas import ExamCreate
def create_exam(data: ExamCreate, user_id:int, db:Session)->Exam:
    exam=Exam(user_id=user_id, **data.model_dump())
    try: db.add(exam); db.commit(); db.refresh(exam); return exam
    except SQLAlchemyError: db.rollback(); raise
def _owned_exam(exam_id:int, user_id:int, db:Session)->Exam:
    exam=db.scalar(select(Exam).where(Exam.id==exam_id, Exam.user_id==user_id))
    if exam is None: raise LookupError('Exam not found')
    return exam
def update_exam(exam_id:int, data, user_id:int, db:Session)->Exam:
    exam=_owned_exam(exam_id,user_id,db)
    for field,value in data.model_dump(exclude_unset=True).items(): setattr(exam,field,value)
    try: db.commit(); db.refresh(exam); return exam
    except SQLAlchemyError: db.rollback(); raise
def delete_exam(exam_id:int, user_id:int, db:Session)->None:
    exam=_owned_exam(exam_id,user_id,db); db.delete(exam); db.commit()
def list_user_exams(user_id:int, db:Session)->list[Exam]:
    return list(db.scalars(select(Exam).where(Exam.user_id==user_id).order_by(Exam.exam_date, case((Exam.exam_time.is_(None),1),else_=0), Exam.exam_time, Exam.id)))
