from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from dependencies.auth_dependency import get_current_user
from dependencies.database_dependency import get_db
from models.user_models import User
from schemas.exam_schemas import ExamCreate, ExamResponse, ExamUpdate
from schemas.task_schemas import TaskResponse
from services.exam_service import create_exam, delete_exam, list_user_exams, plan_exam, update_exam

router = APIRouter(prefix='/exams', tags=['Exams'])

@router.post('', response_model=ExamResponse, status_code=status.HTTP_201_CREATED)
def create(data: ExamCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return create_exam(data, user.id, db)

@router.get('', response_model=list[ExamResponse])
def list_exams(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return list_user_exams(user.id, db)

@router.patch('/{exam_id}', response_model=ExamResponse)
def update(exam_id: int, data: ExamUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try: return update_exam(exam_id, data, user.id, db)
    except LookupError: raise HTTPException(status_code=404, detail='Exam not found')
    except ValueError as error: db.rollback(); raise HTTPException(status_code=422, detail=str(error))

@router.delete('/{exam_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete(exam_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try: delete_exam(exam_id, user.id, db)
    except LookupError: raise HTTPException(status_code=404, detail='Exam not found')

@router.post('/{exam_id}/plan', response_model=list[TaskResponse], status_code=status.HTTP_201_CREATED)
def plan(exam_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try: return plan_exam(exam_id, user.id, db)
    except LookupError: raise HTTPException(status_code=404, detail='Exam not found')
    except ValueError as error: raise HTTPException(status_code=422, detail=str(error))
