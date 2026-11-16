"""Completed study sessions owned by a user, and the sittings that group them."""
from datetime import datetime, timezone
from sqlalchemy import JSON, Boolean, Column, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, false
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
    kind = Column(String(20), nullable=False, default='study', server_default='study')  # study, lesson, exercises, review, lab
    focus = Column(Integer, nullable=True)  # 1 distratto, 2 ok, 3 concentrato; NULL = non valutato
    # Seduta del timer a cui appartiene il blocco (uid scelto dal browser); NULL = sessione a mano o precedente.
    sitting_id = Column(String(36), nullable=True, index=True)
    partial = Column(Boolean, nullable=False, default=False, server_default=false())  # blocco fermato prima della fine
    interruptions = Column(Integer, nullable=True)  # distrazioni annotate durante il blocco
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
    user = relationship('User', back_populates='study_sessions')

class StudySitting(Base):
    """Una seduta al timer: obiettivo, checklist, distrazioni annotate e da dove ripartire.
    I blocchi la richiamano con `sitting_id` = `uid`, senza foreign key: arrivano anche prima di lei (coda offline)."""
    __tablename__ = 'study_sittings'
    __table_args__ = (UniqueConstraint('user_id', 'uid'),)
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    uid = Column(String(36), nullable=False)
    subject_id = Column(Integer, ForeignKey('subjects.id'), nullable=True)
    topic_id = Column(Integer, ForeignKey('topics.id'), nullable=True)
    started_on = Column(Date, nullable=False)
    goal = Column(Text, nullable=True)
    checklist = Column(JSON, nullable=False, default=list)  # [{text, done}]
    distractions = Column(JSON, nullable=False, default=list)  # [{text, block}]
    resume_note = Column(Text, nullable=True)  # "riparto da qui"
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)
