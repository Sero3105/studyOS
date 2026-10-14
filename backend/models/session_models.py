"""Completed study sessions owned by a user."""
from datetime import datetime, timezone
from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import relationship
from database import Base

def utcnow(): return datetime.now(timezone.utc)

class StudySession(Base):
    __tablename__ = 'study_sessions'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey('subjects.id'), nullable=True)
    topic_id = Column(Integer, ForeignKey('topics.id'), nullable=True)
    duration_minutes = Column(Integer, nullable=False)
    studied_on = Column(Date, nullable=False, index=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
    user = relationship('User', back_populates='study_sessions')
