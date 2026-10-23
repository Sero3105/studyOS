"""Secret-URL tokens, one per user: public plan share link and iCal feed."""
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

class CalendarFeed(Base):
    """Token dell'URL iCal: le app calendario non possono autenticarsi, il segreto è nell'URL."""
    __tablename__ = 'calendar_feeds'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, unique=True, index=True)
    token_hash = Column(String(64), nullable=False, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
