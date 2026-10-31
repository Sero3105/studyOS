"""JWT access tokens and opaque, server-revocable refresh sessions."""

from datetime import datetime, timedelta, timezone
from hashlib import sha256
from secrets import token_urlsafe
from uuid import uuid4

import jwt
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

import config
from models.auth_session_models import AuthSession


def create_access_token(user_id: int) -> str:
    """Genera un access token JWT per l'utente autenticato."""

    now = datetime.now(timezone.utc)

    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(
            minutes=config.ACCESS_TOKEN_EXPIRE_MINUTES
        ),
    }

    return jwt.encode(
        payload,
        config.SECRET_KEY,
        algorithm=config.ALGORITHM,
    )


def decode_access_token(token: str) -> dict:
    """Verifica e decodifica un access token JWT."""

    return jwt.decode(
        token,
        config.SECRET_KEY,
        algorithms=[config.ALGORITHM],
        options={
            "require": ["sub", "iat", "exp"],
        },
    )


def hash_secret(value: str) -> str:
    return sha256(value.encode("utf-8")).hexdigest()


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _aware(value: datetime) -> datetime:
    # SQLite restituisce datetime senza fuso: sono sempre UTC.
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def _is_expired(value: datetime) -> bool:
    return _aware(value) <= _utcnow()


# Due schede che fanno refresh insieme mandano lo stesso token: non è un furto.
ROTATION_GRACE = timedelta(seconds=30)


def delete_expired_sessions(user_id: int, db: Session) -> None:
    db.execute(delete(AuthSession).where(AuthSession.user_id == user_id, AuthSession.expires_at < _utcnow()))
    db.commit()


def create_refresh_session(user_id: int, db: Session) -> tuple[str, str, AuthSession]:
    """Create an opaque refresh token and CSRF token, retaining hashes only."""
    refresh_token = token_urlsafe(48)
    csrf_token = token_urlsafe(32)
    session = AuthSession(
        id=str(uuid4()),
        user_id=user_id,
        refresh_token_hash=hash_secret(refresh_token),
        csrf_token_hash=hash_secret(csrf_token),
        expires_at=_utcnow() + timedelta(days=config.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return refresh_token, csrf_token, session


def rotate_refresh_session(
    refresh_token: str, csrf_token: str | None, db: Session
) -> tuple[int, str, str]:
    """Rotate a valid session; reuse revokes all of the user's active sessions."""
    session = db.scalar(
        select(AuthSession).where(AuthSession.refresh_token_hash == hash_secret(refresh_token))
    )
    if session is None:
        raise ValueError("Invalid refresh session")
    if session.revoked_at is not None:
        if session.replaced_by_session_id and _utcnow() - _aware(session.revoked_at) < ROTATION_GRACE:
            raise LookupError("Refresh session already rotated")
        db.execute(
            update(AuthSession)
            .where(AuthSession.user_id == session.user_id, AuthSession.revoked_at.is_(None))
            .values(revoked_at=_utcnow())
        )
        db.commit()
        raise ValueError("Refresh token reuse detected")
    if _is_expired(session.expires_at):
        session.revoked_at = _utcnow()
        db.commit()
        raise ValueError("Refresh session expired")
    if not csrf_token or hash_secret(csrf_token) != session.csrf_token_hash:
        raise PermissionError("Invalid CSRF token")

    session.revoked_at = _utcnow()
    new_refresh, new_csrf, replacement = create_refresh_session(session.user_id, db)
    session.replaced_by_session_id = replacement.id
    db.commit()
    return session.user_id, new_refresh, new_csrf


def revoke_refresh_session(refresh_token: str | None, csrf_token: str | None, db: Session) -> None:
    """Revoke the exact server-side session represented by the browser cookie."""
    if not refresh_token or not csrf_token:
        return
    session = db.scalar(
        select(AuthSession).where(AuthSession.refresh_token_hash == hash_secret(refresh_token))
    )
    if session and session.revoked_at is None and hash_secret(csrf_token) == session.csrf_token_hash:
        session.revoked_at = _utcnow()
        db.commit()
