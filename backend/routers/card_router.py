from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from dependencies.auth_dependency import get_current_user
from dependencies.database_dependency import get_db
from models.user_models import User
from schemas.card_schemas import BulkResult, CardBulk, CardCreate, CardResponse, CardReview
from services import card_service

router = APIRouter(prefix='/cards', tags=['Cards'])

@router.get('', response_model=list[CardResponse])
def list_cards(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return card_service.list_cards(user.id, db)

@router.post('', response_model=CardResponse, status_code=status.HTTP_201_CREATED)
def create_card(data: CardCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try: return card_service.create_card(data, user.id, db)
    except LookupError: raise HTTPException(status_code=422, detail='Topic not found')

@router.post('/bulk', response_model=BulkResult, status_code=status.HTTP_201_CREATED)
def bulk_create(data: CardBulk, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try: return card_service.bulk_create(data, user.id, db)
    except LookupError: raise HTTPException(status_code=422, detail='Topic not found')

@router.post('/{card_id}/review', response_model=CardResponse)
def review_card(card_id: int, data: CardReview, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try: return card_service.review_card(card_id, data, user.id, db)
    except LookupError: raise HTTPException(status_code=404, detail='Card not found')

@router.delete('/{card_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_card(card_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try: card_service.delete_card(card_id, user.id, db)
    except LookupError: raise HTTPException(status_code=404, detail='Card not found')
