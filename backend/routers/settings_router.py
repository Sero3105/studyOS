from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from dependencies.auth_dependency import get_current_user
from dependencies.database_dependency import get_db
from models.user_models import User
from schemas.settings_schemas import Preferences

router = APIRouter(prefix='/settings', tags=['Settings'])

@router.get('', response_model=Preferences)
def get_settings(user: User = Depends(get_current_user)):
    return user.preferences or {}

@router.patch('', response_model=Preferences)
def update_settings(data: Preferences, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Unione con le preferenze esistenti; null cancella la chiave. Dizionario nuovo: SQLAlchemy non vede le modifiche in place.
    merged = {**(user.preferences or {}), **data.root}
    user.preferences = Preferences({k: v for k, v in merged.items() if v is not None}).root
    db.commit()
    return user.preferences
