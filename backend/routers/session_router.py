from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from dependencies.auth_dependency import get_current_user
from dependencies.database_dependency import get_db
from models.user_models import User
from schemas.session_schemas import SessionCreate, SessionResponse
from services import session_service

router = APIRouter(prefix='/sessions', tags=['Sessions'])

@router.post('', response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(data: SessionCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try: return session_service.create_session(data, user.id, db)
    except ValueError as error: raise HTTPException(status_code=422, detail=str(error))

@router.get('', response_model=list[SessionResponse])
def list_sessions(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return session_service.list_sessions(user.id, db)

@router.delete('/{session_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_session(session_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try: session_service.delete_session(session_id, user.id, db)
    except LookupError: raise HTTPException(status_code=404, detail='Session not found')
