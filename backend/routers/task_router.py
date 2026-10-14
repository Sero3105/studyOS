from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from dependencies.auth_dependency import get_current_user
from dependencies.database_dependency import get_db
from models.user_models import User
from schemas.task_schemas import TaskCreate, TaskResponse, TaskUpdate
from services import task_service

router = APIRouter(prefix='/tasks', tags=['Tasks'])

def _raise(error: Exception):
    if isinstance(error, LookupError): raise HTTPException(status_code=404, detail=str(error))
    raise HTTPException(status_code=422, detail=str(error))

@router.post('', response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(data: TaskCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try: return task_service.create_task(data, user.id, db)
    except (LookupError, ValueError) as error: _raise(error)

@router.get('', response_model=list[TaskResponse])
def list_tasks(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return task_service.list_tasks(user.id, db)

@router.patch('/{task_id}', response_model=TaskResponse)
def update_task(task_id: int, data: TaskUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try: return task_service.update_task(task_id, data, user.id, db)
    except (LookupError, ValueError) as error: _raise(error)

@router.delete('/{task_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try: task_service.delete_task(task_id, user.id, db)
    except LookupError as error: _raise(error)
