"""Read-only public share link for a user's study plan (one per user)."""
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from database import Base

def utcnow(): return datetime.now(timezone.utc)

class ShareLink(Base):
    __tablename__ = 'share_links'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, unique=True, index=True)
    # Solo l'hash: il token in chiaro viene mostrato una volta alla creazione.
    token_hash = Column(String(64), nullable=False, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
