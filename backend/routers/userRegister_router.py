from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from dependencies.database_dependency import get_db
from schemas.userCreate_schemas import UserCreate
from schemas.users_schemas import UserResponse
from services.createUser import create_user


router = APIRouter(
    prefix="/auth",
    tags=["Auth"],
)


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=201,
)
def register_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
):
    try:
        return create_user(user_data, db)
    except ValueError as error:
        raise HTTPException(
            status_code=409,
            detail=str(error),
        )