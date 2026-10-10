"""Authentication endpoints: login, refresh rotation, logout, and profile."""

from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Response, status
from sqlalchemy.orm import Session

import config
from dependencies.auth_dependency import get_current_user
from dependencies.database_dependency import get_db
from models.user_models import User
from schemas.auth_schemas import TokenResponse
from schemas.userLogin_schemas import UserLogin
from schemas.users_schemas import UserResponse
from services.authenticateUser import authenticate_user
from services.token_service import (
    create_access_token,
    create_refresh_session,
    revoke_refresh_session,
    rotate_refresh_session,
)

router = APIRouter(prefix="/auth", tags=["Auth"])

REFRESH_COOKIE_NAME = "studyos_refresh"
CSRF_HEADER_NAME = "X-CSRF-Token"


def _set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=config.APP_ENV == "production",
        samesite="lax",
        max_age=config.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path="/auth",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        httponly=True,
        secure=config.APP_ENV == "production",
        samesite="lax",
        path="/auth",
    )


@router.post("/login", response_model=TokenResponse)
def login_user(user_data: UserLogin, response: Response, db: Session = Depends(get_db)) -> TokenResponse:
    try:
        user = authenticate_user(user_data, db)
    except ValueError:
        raise HTTPException(status_code=401, detail="Email o password non corretti")

    refresh_token, csrf_token, _ = create_refresh_session(user.id, db)
    _set_refresh_cookie(response, refresh_token)
    return TokenResponse(
        access_token=create_access_token(user.id),
        csrf_token=csrf_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh_access_token(
    response: Response,
    refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
    x_csrf_token: str | None = Header(default=None, alias=CSRF_HEADER_NAME),
    db: Session = Depends(get_db),
) -> TokenResponse:
    try:
        user_id, new_refresh_token, new_csrf_token = rotate_refresh_session(
            refresh_token or "", x_csrf_token, db
        )
    except PermissionError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid CSRF token")
    except ValueError:
        _clear_refresh_cookie(response)
        raise HTTPException(status_code=401, detail="Refresh session is invalid or expired")

    user = db.get(User, user_id)
    if user is None:
        _clear_refresh_cookie(response)
        raise HTTPException(status_code=401, detail="Refresh session is invalid or expired")
    _set_refresh_cookie(response, new_refresh_token)
    return TokenResponse(
        access_token=create_access_token(user.id),
        csrf_token=new_csrf_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    response: Response,
    refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE_NAME),
    x_csrf_token: str | None = Header(default=None, alias=CSRF_HEADER_NAME),
    db: Session = Depends(get_db),
) -> Response:
    revoke_refresh_session(refresh_token, x_csrf_token, db)
    _clear_refresh_cookie(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
