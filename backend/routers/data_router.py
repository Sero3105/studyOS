from typing import Literal
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from dependencies.auth_dependency import get_current_user
from dependencies.database_dependency import get_db
from models.user_models import User
from schemas.data_schemas import ImportResult, StudyData
from services.data_service import build_notes_vault, export_user_data, import_user_data

router = APIRouter(prefix='/data', tags=['Data'])

@router.get('/export', response_model=StudyData)
def export_data(response: Response, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    response.headers['Cache-Control'] = 'no-store'
    return export_user_data(user.id, db)

@router.post('/import', response_model=ImportResult)
def import_data(data: StudyData, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return import_user_data(data, user.id, db)

@router.get('/notes-vault')
def notes_vault(lang: Literal['it', 'en'] = 'en', user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return Response(build_notes_vault(user.id, lang, db), media_type='application/zip', headers={
        'Content-Disposition': 'attachment; filename="studyos-notes.zip"', 'Cache-Control': 'no-store'})
