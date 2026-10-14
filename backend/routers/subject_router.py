from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from dependencies.auth_dependency import get_current_user
from dependencies.database_dependency import get_db
from models.user_models import User
from schemas.subject_schemas import SubjectCreate, SubjectResponse, TopicCreate, TopicResponse, TopicUpdate
from services import subject_service

router = APIRouter(tags=['Subjects'])

def _404(error: LookupError):
    raise HTTPException(status_code=404, detail=str(error))

@router.get('/subjects', response_model=list[SubjectResponse])
def list_subjects(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return subject_service.list_subjects(user.id, db)

@router.post('/subjects', response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
def create_subject(data: SubjectCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return subject_service.create_subject(data, user.id, db)

@router.delete('/subjects/{subject_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_subject(subject_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try: subject_service.delete_subject(subject_id, user.id, db)
    except LookupError as error: _404(error)

@router.post('/subjects/{subject_id}/topics', response_model=TopicResponse, status_code=status.HTTP_201_CREATED)
def create_topic(subject_id: int, data: TopicCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try: return subject_service.create_topic(subject_id, data, user.id, db)
    except LookupError as error: _404(error)

@router.patch('/topics/{topic_id}', response_model=TopicResponse)
def update_topic(topic_id: int, data: TopicUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try: return subject_service.update_topic(topic_id, data, user.id, db)
    except LookupError as error: _404(error)

@router.delete('/topics/{topic_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_topic(topic_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try: subject_service.delete_topic(topic_id, user.id, db)
    except LookupError as error: _404(error)
