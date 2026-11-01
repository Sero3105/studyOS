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

class Mistake(Base):
    """Quaderno degli errori: un errore fatto su un argomento, con la spiegazione giusta; può diventare una flashcard."""
    __tablename__ = 'mistakes'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, index=True)
    topic_id = Column(Integer, ForeignKey('topics.id'), nullable=False, index=True)
    mistake = Column(Text, nullable=False)
    correction = Column(Text, nullable=False)
    source = Column(String(200), nullable=True)
    card_id = Column(Integer, nullable=True)  # flashcard creata dall'errore, se c'è
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
    topic = relationship('Topic', back_populates='mistakes')
