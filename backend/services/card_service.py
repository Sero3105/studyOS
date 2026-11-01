from datetime import date, timedelta
from sqlalchemy import select
from sqlalchemy.orm import Session
from models.card_models import Card
from schemas.card_schemas import BulkResult, CardBulk, CardCreate, CardReview
from services.spaced_repetition import next_interval
from services.subject_service import _owned_topic

def list_cards(user_id: int, db: Session) -> list[Card]:
    return list(db.scalars(select(Card).where(Card.user_id == user_id).order_by(Card.due_date, Card.id)))

def create_card(data: CardCreate, user_id: int, db: Session) -> Card:
    _owned_topic(data.topic_id, user_id, db)
    card = Card(user_id=user_id, **data.model_dump())
    db.add(card); db.commit(); db.refresh(card)
    return card

def _owned(card_id: int, user_id: int, db: Session) -> Card:
    card = db.scalar(select(Card).where(Card.id == card_id, Card.user_id == user_id))
    if card is None: raise LookupError('Card not found')
    return card

def review_card(card_id: int, data: CardReview, user_id: int, db: Session) -> Card:
    card = _owned(card_id, user_id, db)
    card.interval = next_interval(card.interval, data.rating)
    card.due_date = date.today() + timedelta(days=card.interval)
    db.commit(); db.refresh(card)
    return card

def delete_card(card_id: int, user_id: int, db: Session) -> None:
    db.delete(_owned(card_id, user_id, db)); db.commit()

def bulk_create(data: CardBulk, user_id: int, db: Session) -> BulkResult:
    """Adds the cards to one topic, skipping fronts already there (ignoring case) so re-running an import is harmless."""
    _owned_topic(data.topic_id, user_id, db)
    seen = {f.strip().lower() for f in db.scalars(select(Card.front).where(Card.user_id == user_id, Card.topic_id == data.topic_id))}
    created = 0
    for face in data.cards:
        key = face.front.lower()
        if key in seen: continue
        seen.add(key)
        db.add(Card(user_id=user_id, topic_id=data.topic_id, front=face.front, back=face.back)); created += 1
    db.commit()
    return BulkResult(created=created, skipped=len(data.cards) - created)

# --- Quaderno degli errori ------------------------------------------------------
