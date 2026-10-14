from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from dependencies.auth_dependency import get_current_user
from dependencies.database_dependency import get_db
from models.user_models import User
from schemas.goal_schemas import GoalCreate, GoalResponse
from services import goal_service

router = APIRouter(prefix='/goals', tags=['Goals'])

@router.post('', response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
def create_goal(data: GoalCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return goal_service.create_goal(data, user.id, db)

@router.get('', response_model=list[GoalResponse])
def list_goals(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return goal_service.list_goals(user.id, db)

@router.delete('/{goal_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(goal_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try: goal_service.delete_goal(goal_id, user.id, db)
    except LookupError: raise HTTPException(status_code=404, detail='Goal not found')
