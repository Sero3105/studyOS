"""Piano d'esame: algoritmo deterministico (niente AI) basato su risultati della psicologia dell'apprendimento.

- Pratica distribuita (Dunlosky et al. 2013, utilità "alta"): ogni argomento si studia una volta e poi
  si ripassa più volte, a distanza, invece di concentrare tutto in un blocco.
- Intervalli che si allargano e crescono con il tempo che manca all'esame (Cepeda et al. 2008): primo ripasso
  il giorno dopo, poi intervalli in progressione geometrica fino all'80% del tempo disponibile.
- Ripasso = richiamare a memoria, non rileggere (Roediger & Karpicke 2006): lo dicono le descrizioni dei task.
- Interleaving (Brunmair & Richter 2019): mai due volte lo stesso argomento nello stesso giorno, così ogni
  giorno mescola argomenti diversi.
- Difficoltà dello studente (1-3): più blocchi di studio e più ripassi agli argomenti difficili.
- Ultimi giorni (circa il 15%) riservati al ripasso finale di tutto, i difficili per primi.
"""
from dataclasses import dataclass
from datetime import date, timedelta
from math import ceil

STUDY_BLOCKS = {1: 1, 2: 1, 3: 2}
REVIEWS = {1: 2, 2: 3, 3: 4}  # ripassi distanziati prima del ripasso finale
# Durata stimata di ogni attività: serve al limite in ore e finisce nel task (planned_minutes).
MINUTES = {'study': 50, 'review': 20, 'final': 40}


REVIEW_LEVELS = {'light': -1, 'standard': 0, 'intense': 1}


@dataclass(frozen=True)
class PlanPrefs:
    """Preferenze dello studente per il piano; l'algoritmo si adatta a queste.
    unit/per_day: tetto giornaliero in attività ('tasks') o minuti ('minutes'); None = automatico.
    reviews: 'light' | 'standard' | 'intense' (un ripasso in meno o in più per argomento).
    final_days: giorni riservati al ripasso finale; None = automatico (~15%).
    order: 'course' (ordine del corso) | 'hardest' (prima i difficili).
    study_minutes: durata di una sessione di studio."""
    unit: str = 'tasks'
    per_day: float | None = None
    reviews: str = 'standard'
    final_days: int | None = None
    order: str = 'course'
    study_minutes: int = MINUTES['study']

    def minutes(self, kind: str) -> int:
        return self.study_minutes if kind == 'study' else MINUTES[kind]

    def cost(self, kind: str) -> float:
        return 1 if self.unit == 'tasks' else self.minutes(kind)

    def review_count(self, topic: 'PlanTopic') -> int:
        if topic.mastery >= 3: return 0
        if topic.mastery == 2: return 1
        return max(1, REVIEWS[topic.difficulty] + REVIEW_LEVELS.get(self.reviews, 0))


@dataclass(frozen=True)
class PlanTopic:
    id: int
    title: str
    difficulty: int  # 1 facile, 2 media, 3 difficile
    mastery: int  # 0 da fare, 1 da ripassare, 2 ripassato, 3 sicuro


@dataclass(frozen=True)
class PlanItem:
    day: date
    topic_id: int
    kind: str  # 'study' | 'review' | 'final'
    part: int = 1  # blocco di studio n. (argomenti difficili: 1 e 2)
    parts: int = 1
    number: int = 0  # ripasso n. ...
    of: int = 0  # ... su of
    gap: int = 1  # giorni dal passaggio precedente sullo stesso argomento


def review_offsets(count: int, room: int) -> list[int]:
    """Posizioni dei ripassi (giorni dopo lo studio, 1..room): il primo il giorno dopo (consolidamento), gli altri
    a intervalli che crescono in modo geometrico fino all'80% del tempo disponibile; il resto è per il ripasso finale."""
    if count <= 0 or room <= 0: return []
    count = min(count, room)
    last = max(1.0, room * 0.8)
    ratio = last ** (1 / (count - 1)) if count > 1 else 1.0
    offsets: list[int] = []
    for j in range(count):
        at = max(round(ratio ** j), (offsets[-1] + 1) if offsets else 1)
        offsets.append(min(at, room))
    # Se in fondo si sono ammassati sullo stesso giorno, tieni solo quelli distinti.
    return sorted(set(offsets))


def _counts(topics: list[PlanTopic], prefs: PlanPrefs) -> tuple[int, int, int, int]:
    """Blocchi di studio, ripassi distanziati, ripassi finali, argomenti ancora da ripassare."""
    blocks = sum(STUDY_BLOCKS[t.difficulty] for t in topics if t.mastery == 0)
    reviews = sum(prefs.review_count(t) for t in topics)
    finals = sum(1 for t in topics if t.mastery < 3 or t.difficulty == 3)
    return blocks, reviews, finals, sum(1 for t in topics if t.mastery <= 1)


def build_plan(topics: list[PlanTopic], days: list[date], busy: dict[date, float] | None = None, prefs: PlanPrefs | None = None) -> list[PlanItem]:
    """Distribuisce studio, ripassi e ripasso finale sui giorni disponibili (in ordine, esame escluso).
    `busy`: carico già in calendario per giorno (altri esami, task a mano), nell'unità del limite.
    `prefs`: preferenze dello studente (tetto giornaliero, intensità, fase finale, ordine, durata dello studio)."""
    if not days or not topics: return []
    limit = prefs or PlanPrefs()
    n = len(days)
    blocks, reviews, finals, _ = _counts(topics, limit)
    taken = [float((busy or {}).get(d, 0)) for d in days]
    total = blocks * limit.cost('study') + reviews * limit.cost('review') + finals * limit.cost('final') + sum(taken)
    auto = max(2 * limit.cost('review'), total / n + limit.cost('study'))
    cap = limit.per_day if limit.per_day else auto
    # Fase finale: ~15% dei giorni, di più se i ripassi finali non ci stanno; mai oltre metà del tempo.
    final_n = 1 if n <= 4 else min(n // 2, max(2, round(n * 0.15), ceil(finals * limit.cost('final') / cap)))
    if limit.final_days: final_n = max(1, min(limit.final_days, n - 1)) if n > 1 else 1
    learn_n = max(1, n - final_n) if n > 1 else 1
    load = taken[:]
    on_day: list[set[int]] = [set() for _ in range(n)]

    def place(ideal: int, lo: int, hi: int, topic_id: int, kind: str, must: bool = True) -> int | None:
        """Giorno più vicino a `ideal` in [lo, hi] con posto libero e senza lo stesso argomento (interleaving).
        Se è tutto pieno: con `must` il giorno meno carico, altrimenti nessuno (un ripasso intermedio si salta)."""
        ideal = min(max(ideal, lo), hi)
        cost = limit.cost(kind)
        for step in range(0, hi - lo + 1):
            for i in (ideal + step, ideal - step) if step else (ideal,):
                if lo <= i <= hi and load[i] + cost <= cap and topic_id not in on_day[i]:
                    return i
        if not must: return None
        for i in sorted(range(lo, hi + 1), key=lambda i: (load[i], abs(i - ideal))):
            if topic_id not in on_day[i]: return i
        return None

    items: list[PlanItem] = []

    def add(i: int, item: PlanItem) -> None:
        load[i] += limit.cost(item.kind); on_day[i].add(item.topic_id); items.append(item)

    # 1. Studio: in ordine di corso (i capitoli si appoggiano ai precedenti), sparso uniforme sul primo 65% del
    #    tempo, così anche l'ultimo argomento ha spazio per i suoi ripassi distanziati.
    study_n = max(1, min(learn_n, round(learn_n * 0.65)))
    studied_at: dict[int, int] = {}
    k = 0
    new = [t for t in topics if t.mastery == 0]
    if limit.order == 'hardest': new.sort(key=lambda t: -t.difficulty)  # stabile: a parità, ordine del corso
    for t in new:
        parts = STUDY_BLOCKS[t.difficulty]
        for p in range(1, parts + 1):
            ideal = (k * study_n) // max(1, blocks)
            lo = studied_at.get(t.id, -1) + 1 if p > 1 else 0
            i = place(ideal, min(lo, learn_n - 1), learn_n - 1, t.id, 'study')
            if i is None: i = min(lo, n - 1)
            add(i, PlanItem(days[i], t.id, 'study', p, parts))
            studied_at[t.id] = i
            k += 1

    # 2. Ripassi distanziati prima della fase finale.
    for t in topics:
        count = limit.review_count(t)
        start = studied_at.get(t.id, -1)  # già studiato: il conto parte dal primo giorno
        room = learn_n - 1 - start
        previous = start
        offsets = review_offsets(count, room)
        for j, off in enumerate(offsets, 1):
            if previous + 1 > learn_n - 1: break
            # Il primo ripasso (il giorno dopo) è obbligatorio; gli intermedi si saltano se i giorni sono pieni.
            i = place(start + off, previous + 1, learn_n - 1, t.id, 'review', must=j == 1)
            if i is None: continue
            add(i, PlanItem(days[i], t.id, 'review', number=j, of=len(offsets), gap=max(1, i - max(previous, -1))))
            previous = i

    # 3. Ripasso finale: tutti tranne i "sicuri" facili, i difficili per primi, nel giorno meno carico e vicino all'esame.
    last_seen = {it.topic_id: days.index(it.day) for it in items}
    # La fase finale parte subito dopo l'ultimo ripasso distanziato: nessun giorno vuoto in mezzo.
    final_start = min(n - final_n, max(last_seen.values(), default=-1) + 1) if n > 1 else 0
    for t in sorted(topics, key=lambda t: (-t.difficulty, t.id)):
        if t.mastery == 3 and t.difficulty < 3: continue
        window = range(final_start, n)
        candidates = [i for i in window if t.id not in on_day[i]] or list(window)
        i = min(candidates, key=lambda i: (load[i], -i))  # a parità di carico, il più vicino all'esame
        add(i, PlanItem(days[i], t.id, 'final', gap=max(1, i - last_seen.get(t.id, -1))))

    return sorted(items, key=lambda it: (it.day, {'study': 0, 'review': 1, 'final': 2}[it.kind], it.topic_id))


# Ritmo per una materia: sostenibile (data ideale) e massimo oltre cui il metodo non regge (data limite).
COMFORT = {'tasks': 3, 'minutes': 120}
MAXIMUM = {'tasks': 6, 'minutes': 240}
MIN_IDEAL_DAYS = 10  # sotto, i ripassi distanziati non hanno spazio per allargarsi


@dataclass(frozen=True)
class PlanAdvice:
    ideal_start: date
    latest_start: date
    ideal_days: int
    min_days: int
    full_items: int  # attività del metodo completo
    min_items: int  # versione minima: studio, un ripasso, ripasso finale
    full_minutes: int
    min_minutes: int


def study_days_before(exam_day: date, count: int, rest_days: set[int], days_off: set[date] = frozenset()) -> date:
    """Primo giorno di un periodo di `count` giorni di studio che finisce il giorno prima dell'esame."""
    day, left = exam_day, max(1, count)
    while left:
        day -= timedelta(days=1)
        if day.isoweekday() not in rest_days and day not in days_off: left -= 1
    return day


def plan_advice(topics: list[PlanTopic], exam_day: date, rest_days: set[int], days_off: set[date] = frozenset(), prefs: PlanPrefs | None = None) -> PlanAdvice:
    """Quando conviene iniziare (metodo completo a ritmo sostenibile) e l'ultimo momento utile (versione minima
    al ritmo massimo). Con un limite dello studente, il ritmo non lo supera mai."""
    limit = prefs or PlanPrefs()
    blocks, reviews, finals, to_review = _counts(topics, limit)
    full_items, min_items = blocks + reviews + finals, blocks + to_review + finals
    full_minutes = blocks * limit.minutes('study') + reviews * MINUTES['review'] + finals * MINUTES['final']
    min_minutes = blocks * limit.minutes('study') + to_review * MINUTES['review'] + finals * MINUTES['final']
    full, minimum = (full_items, min_items) if limit.unit == 'tasks' else (full_minutes, min_minutes)
    comfort = min(COMFORT[limit.unit], limit.per_day or COMFORT[limit.unit])
    fastest = limit.per_day or MAXIMUM[limit.unit]
    ideal_days = max(MIN_IDEAL_DAYS, ceil(full / comfort))
    min_days = max(3, ceil(minimum / fastest))
    return PlanAdvice(study_days_before(exam_day, ideal_days, rest_days, days_off), study_days_before(exam_day, min_days, rest_days, days_off),
                      ideal_days, min_days, full_items, min_items, full_minutes, min_minutes)
