from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from dependencies.auth_dependency import get_current_user
from dependencies.database_dependency import get_db
from models.user_models import User
from schemas.share_schemas import ShareCreated, SharedPlan, ShareStatus
from services.share_service import create_share, get_share, get_shared_plan, revoke_share

router = APIRouter(prefix='/share', tags=['Share'])

@router.get('', response_model=ShareStatus)
def share_status(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    link = get_share(user.id, db)
    return ShareStatus(active=link is not None, created_at=link.created_at if link else None)

@router.post('', response_model=ShareCreated, status_code=status.HTTP_201_CREATED)
def share_create(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    token, link = create_share(user.id, db)
    return ShareCreated(token=token, created_at=link.created_at)

@router.delete('', status_code=status.HTTP_204_NO_CONTENT)
def share_revoke(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    revoke_share(user.id, db)

# Pubblico, senza auth: chi ha il link vede solo la vista ridotta di SharedPlan.
@router.get('/public/{token}', response_model=SharedPlan)
def shared_plan(token: str, response: Response, db: Session = Depends(get_db)):
    response.headers['Cache-Control'] = 'no-store'
    response.headers['X-Robots-Tag'] = 'noindex'
    if len(token) > 64: raise HTTPException(status_code=404, detail='Share link not found')
    try: return get_shared_plan(token, db)
    except LookupError: raise HTTPException(status_code=404, detail='Share link not found')
