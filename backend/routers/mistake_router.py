from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from dependencies.auth_dependency import get_current_user
from dependencies.database_dependency import get_db
from models.user_models import User
from schemas.card_schemas import MistakeCreate, MistakeResponse, MistakeUpdate
from services import card_service

router = APIRouter(prefix='/mistakes', tags=['Mistakes'])

@router.get('', response_model=list[MistakeResponse])
def list_mistakes(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return card_service.list_mistakes(user.id, db)

@router.post('', response_model=MistakeResponse, status_code=status.HTTP_201_CREATED)
def create_mistake(data: MistakeCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try: return card_service.create_mistake(data, user.id, db)
    except LookupError: raise HTTPException(status_code=422, detail='Topic not found')

@router.patch('/{mistake_id}', response_model=MistakeResponse)
def update_mistake(mistake_id: int, data: MistakeUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try: return card_service.update_mistake(mistake_id, data, user.id, db)
    except LookupError as error: raise HTTPException(status_code=404 if 'Mistake' in str(error) else 422, detail=str(error))

@router.delete('/{mistake_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_mistake(mistake_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try: card_service.delete_mistake(mistake_id, user.id, db)
    except LookupError: raise HTTPException(status_code=404, detail='Mistake not found')
