"""Password change and account deletion, both confirmed with the current password."""
from sqlalchemy import delete, update
from sqlalchemy.orm import Session
from models.auth_session_models import AuthSession
from models.share_models import CalendarFeed, ShareLink
from models.user_models import User
from services.createUser import password_hasher
from services.token_service import _utcnow, hash_secret

def _check_password(user: User, password: str) -> None:
    if not password_hasher.verify(password, user.password_hash): raise PermissionError('wrong_password')

def change_password(user: User, current: str, new: str, refresh_token: str | None, db: Session) -> None:
    """Keeps this browser signed in and revokes every other session."""
    _check_password(user, current)
    user.password_hash = password_hasher.hash(new)
    keep = hash_secret(refresh_token) if refresh_token else ''
    db.execute(update(AuthSession)
               .where(AuthSession.user_id == user.id, AuthSession.revoked_at.is_(None), AuthSession.refresh_token_hash != keep)
               .values(revoked_at=_utcnow()))
    db.commit()

def delete_account(user: User, password: str, db: Session) -> None:
    _check_password(user, password)
    # Le relazioni di User cancellano a cascata sessioni, materie, task, esami, obiettivi; i link no.
    db.execute(delete(ShareLink).where(ShareLink.user_id == user.id))
    db.execute(delete(CalendarFeed).where(CalendarFeed.user_id == user.id))
    db.delete(user)
    db.commit()
