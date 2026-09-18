from sqlalchemy import or_, select
from sqlalchemy.orm import Session
from pwdlib import PasswordHash

from models.user_models import User
from schemas.userCreate_schemas import UserCreate


password_hasher = PasswordHash.recommended()


def create_user(user_data: UserCreate, db: Session) -> User:
    existing_user = db.scalar(
        select(User).where(
            or_(
                User.username == user_data.username,
                User.email == user_data.email,
            )
        )
    )

    if existing_user:
        raise ValueError("Username o email già utilizzati")

    new_user = User(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name,
        password_hash=password_hasher.hash(user_data.password),
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user