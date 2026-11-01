"""Flashcards: one question/answer per card, attached to a topic, scheduled by spaced repetition."""
from datetime import date, datetime, timezone
from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from database import Base

def utcnow(): return datetime.now(timezone.utc)

class Card(Base):
    __tablename__ = 'cards'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    topic_id = Column(Integer, ForeignKey('topics.id'), nullable=False, index=True)
    front = Column(Text, nullable=False)
    back = Column(Text, nullable=False)
    due_date = Column(Date, nullable=False, default=date.today)
    interval = Column(Integer, nullable=False, default=0, server_default='0')  # giorni; 0 = mai ripassata
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
    topic = relationship('Topic', back_populates='cards')

