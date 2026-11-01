"""Ripetizione dilazionata in stile SM-2 semplificato, condivisa da ripassi degli argomenti e flashcard."""
from enum import Enum

class Rating(str, Enum):
    HARD = 'hard'; OK = 'ok'; EASY = 'easy'

# Oltre questo intervallo un argomento è consolidato: niente altri ripassi.
MAX_REVIEW_DAYS = 60

def next_interval(interval: int, rating: Rating) -> int:
    """Giorni fino al prossimo ripasso. Difficile riparte da 1; ok ×2.5; facile ×4; sempre almeno un giorno in più."""
    if rating == Rating.HARD: return 1
    interval = max(interval, 1)
    return max(interval + 1, round(interval * (2.5 if rating == Rating.OK else 4)))
