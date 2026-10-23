from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from dependencies.auth_dependency import get_current_user
from dependencies.database_dependency import get_db
from models.share_models import CalendarFeed, ShareLink
from models.user_models import User
from schemas.share_schemas import ShareCreated, SharedPlan, ShareStatus
from services.calendar_service import build_ics
from services.share_service import create_link, get_link, get_shared_plan, owner_of, revoke_link

router = APIRouter(tags=['Share'])

# Stessi tre endpoint (stato, crea/rigenera, revoca) per il link di condivisione e per il feed iCal.
for prefix, model in (('/share', ShareLink), ('/calendar-feed', CalendarFeed)):
    def status_(user: User = Depends(get_current_user), db: Session = Depends(get_db), model=model):
        link = get_link(model, user.id, db)
        return ShareStatus(active=link is not None, created_at=link.created_at if link else None)

    def create_(user: User = Depends(get_current_user), db: Session = Depends(get_db), model=model):
        token, link = create_link(model, user.id, db)
        return ShareCreated(token=token, created_at=link.created_at)

    def revoke_(user: User = Depends(get_current_user), db: Session = Depends(get_db), model=model):
        revoke_link(model, user.id, db)

    router.add_api_route(prefix, status_, methods=['GET'], response_model=ShareStatus)
    router.add_api_route(prefix, create_, methods=['POST'], response_model=ShareCreated, status_code=status.HTTP_201_CREATED)
    router.add_api_route(prefix, revoke_, methods=['DELETE'], status_code=status.HTTP_204_NO_CONTENT)

def _public_headers(response: Response) -> None:
    response.headers['Cache-Control'] = 'no-store'
    response.headers['X-Robots-Tag'] = 'noindex'

# Pubblici, senza auth: chi ha l'URL vede solo la vista ridotta (niente note, luoghi, email).
@router.get('/share/public/{token}', response_model=SharedPlan)
def shared_plan(token: str, response: Response, db: Session = Depends(get_db)):
    _public_headers(response)
    try: return get_shared_plan(owner_of(ShareLink, token, db), db)
    except LookupError: raise HTTPException(status_code=404, detail='Share link not found')

@router.get('/calendar/{token}.ics')
def calendar_feed(token: str, db: Session = Depends(get_db)):
    try: user_id = owner_of(CalendarFeed, token, db)
    except LookupError: raise HTTPException(status_code=404, detail='Calendar feed not found')
    response = Response(build_ics(user_id, db), media_type='text/calendar; charset=utf-8')
    _public_headers(response)
    return response
