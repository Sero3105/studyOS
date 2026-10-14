from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from dependencies.auth_dependency import get_current_user
from dependencies.database_dependency import get_db
from models.user_models import User
from services import stats_service

router = APIRouter(prefix='/stats', tags=['Stats'])

@router.get('/summary')
def get_summary(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return stats_service.summary(user.id, db)
