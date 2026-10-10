from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from dependencies.auth_dependency import get_current_user
from dependencies.database_dependency import get_db
from models.user_models import User
from schemas.exam_schemas import ExamCreate, ExamResponse
from services.exam_service import create_exam, list_user_exams
router=APIRouter(prefix='/exams',tags=['Exams'])
@router.post('',response_model=ExamResponse,status_code=status.HTTP_201_CREATED)
def create(data:ExamCreate, user:User=Depends(get_current_user), db:Session=Depends(get_db)): return create_exam(data,user.id,db)
@router.get('',response_model=list[ExamResponse])
def list_exams(user:User=Depends(get_current_user), db:Session=Depends(get_db)): return list_user_exams(user.id,db)
