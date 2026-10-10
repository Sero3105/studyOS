"""FastAPI authentication dependencies for bearer-protected resources."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.exceptions import InvalidTokenError
from sqlalchemy.orm import Session

from dependencies.database_dependency import get_db
from models.user_models import User
from services.token_service import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise error
    try:
        payload = decode_access_token(credentials.credentials)
        subject = payload["sub"]
        if not isinstance(subject, str) or not subject.isdigit() or int(subject) <= 0:
            raise ValueError("Invalid subject")
        user = db.get(User, int(subject))
    except (InvalidTokenError, KeyError, TypeError, ValueError):
        raise error
    if user is None:
        raise error
    return user
