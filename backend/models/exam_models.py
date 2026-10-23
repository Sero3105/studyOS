from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, String, Text, Time, false
from sqlalchemy.orm import relationship
from database import Base

def utcnow(): return datetime.now(timezone.utc)
class Exam(Base):
    __tablename__ = 'exams'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    title = Column(String(120), nullable=False)
    subject = Column(String(120), nullable=False)
    exam_date = Column(Date, nullable=True, index=True)  # NULL = appello non ancora fissato
    exam_time = Column(Time, nullable=True)
    location = Column(String(120), nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default='planned')
    cfu = Column(Integer, nullable=True)
    grade = Column(Integer, nullable=True)
    honors = Column(Boolean, nullable=False, default=False, server_default=false())
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)
    user = relationship('User', back_populates='exams')
