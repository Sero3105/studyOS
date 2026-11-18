"""Piano d'esame: algoritmo deterministico (niente AI) basato su risultati della psicologia dell'apprendimento.

- Pratica distribuita (Dunlosky et al. 2013, utilità "alta"): ogni argomento si studia una volta e poi
  si ripassa più volte, a distanza, invece di concentrare tutto in un blocco.
- Modello della memoria (curva dell'oblio di FSRS, Ye et al. 2022): per ogni argomento si stima la *stabilità*
  (giorni dopo cui il ricordo scende al 90%). Un ripasso cade quando il ricordo previsto scende alla soglia
  scelta dallo studente e, se riesce, allunga la stabilità: di più se l'argomento è facile e se il ricordo era
  già un po' sbiadito (difficoltà desiderabile, Bjork 1994). Il numero di ripassi non è fisso: emerge da
  difficoltà, errori annotati, storico e tempo che manca (Latimier et al. 2021: conta distanziare, non seguire
  una progressione fissa).
- Ripasso = richiamare a memoria, non rileggere (Roediger & Karpicke 2006): lo dicono le descrizioni dei task.
- Interleaving (Brunmair & Richter 2019): mai due volte lo stesso argomento nello stesso giorno.
- Storico dello studente (planning fallacy, Buehler et al. 1994): il tempo reale delle sessioni e la quota di
  task fatti correggono durate e date; chi resta spesso indietro riceve giorni cuscinetto per recuperare.
- Ultimi giorni (circa il 15%) per il ripasso finale, prima gli argomenti col ricordo previsto più debole.
"""
from bisect import bisect_left, bisect_right
from dataclasses import dataclass, replace
from datetime import date, timedelta
from heapq import heappop, heappush
from math import ceil, exp

STUDY_BLOCKS = {1: 1, 2: 1, 3: 2}
# Durata stimata di ogni attività: serve al limite in ore e finisce nel task (planned_minutes).
MINUTES = {'study': 50, 'review': 20, 'final': 40}

# --- Modello della memoria (FSRS-4.5/5) ---
DECAY, FACTOR = -0.5, 19 / 81  # con questi valori recall(S, S) = 0.9
FIRST_STABILITY = {1: 1.5, 2: 1.0, 3: 0.6}  # giorni di stabilità dopo la prima sessione di studio
FSRS_DIFFICULTY = {1: 3.0, 2: 5.5, 3: 8.0}  # difficoltà su scala FSRS 1-10
KNOWN_STABILITY = {2: 4.0, 3: 60.0}  # stima per "ripassato" e "sicuro" senza storico
SAFE_STABILITY = 21  # da qui in su l'argomento regge da solo: basta il ripasso finale
TARGET = {'light': 0.80, 'standard': 0.85, 'intense': 0.90}  # ricordo minimo prima di ogni ripasso
STUDY_SPAN = 0.80  # quota del tempo di studio (pesato con la fetta) in cui si studia materiale nuovo
REVIEW_WINDOW = 0.05  # un ripasso può cadere da soglia+5% a soglia-5% di ricordo: sceglie il giorno più scarico


def recall(days: float, stability: float) -> float:
    """Probabilità di ricordare dopo `days` giorni (curva dell'oblio a potenza di FSRS)."""
    return (1 + FACTOR * max(0.0, days) / stability) ** DECAY


def interval(stability: float, target: float) -> int:
    """Giorni dopo cui il ricordo scende a `target`: la formula di `recall` invertita. Almeno 1."""
    return max(1, round(stability / FACTOR * (target ** (1 / DECAY) - 1)))


def grow(stability: float, recalled: float, difficulty: float) -> float:
    """Stabilità dopo un ripasso riuscito (FSRS-5, pesi di default, risposta "ok"): cresce di più se l'argomento
    è facile, se la stabilità è ancora bassa e se il ricordo era già sbiadito."""
    return stability * (1 + exp(1.546) * (11 - difficulty) * stability ** -0.119 * (exp(1.019 * (1 - recalled)) - 1))


@dataclass(frozen=True)
class PlanPrefs:
    """Preferenze dello studente per il piano; l'algoritmo si adatta a queste.
    unit/per_day: tetto giornaliero in attività ('tasks') o minuti ('minutes'); None = automatico.
    per_weekday: tetto diverso per lunedì..domenica (None = come per_day).
    reviews: 'light' | 'standard' | 'intense' → ricordo minimo prima di ogni ripasso (80, 85, 90%).
    final_days: giorni riservati al ripasso finale; None = automatico (~15%).
    order: 'course' (ordine del corso) | 'hardest' (prima i difficili).
    study_minutes: durata di una sessione di studio.
    pace, reliability: dallo storico (1 = nessuna correzione): tempo reale / previsto e quota di task fatti."""
    unit: str = 'tasks'
    per_day: float | None = None
    per_weekday: tuple[float | None, ...] | None = None
    reviews: str = 'standard'
    final_days: int | None = None
    order: str = 'course'
    study_minutes: int = MINUTES['study']
    pace: float = 1.0
    reliability: float = 1.0

    @property
    def target(self) -> float:
        return TARGET.get(self.reviews, TARGET['standard'])

    def minutes(self, kind: str) -> int:
        return self.study_minutes if kind == 'study' else MINUTES[kind]

    def cost(self, kind: str) -> float:
        return 1 if self.unit == 'tasks' else self.minutes(kind) * self.pace

    def cap(self, day: date) -> float | None:
        """Tetto del giorno scelto dallo studente (None = nessun tetto, decide l'algoritmo)."""
        own = self.per_weekday[day.isoweekday() - 1] if self.per_weekday else None
        return own or self.per_day

    def buffer_every(self) -> int | None:
        """Ogni quanti giorni lasciare un giorno cuscinetto: chi fa l'80% dei task ne ha uno ogni 5."""
        if self.reliability >= 0.9: return None
        return max(3, min(7, round(1 / (1 - self.reliability))))


@dataclass(frozen=True)
class PlanTopic:
    id: int
    title: str
    difficulty: int  # 1 facile, 2 media, 3 difficile
    mastery: int  # 0 da fare, 1 da ripassare, 2 ripassato, 3 sicuro
    mistakes: int = 0  # errori nel quaderno degli errori: l'argomento è più ostico del previsto
    stability: float | None = None  # dallo storico: ripasso riuscito più distanziato, in giorni
    last_seen: date | None = None  # ultimo studio o ripasso fatto

    @property
    def hardness(self) -> float:
        """Difficoltà FSRS (1-10): quella scelta, mezzo punto in più per ogni errore annotato (al massimo +2)."""
        return min(10.0, FSRS_DIFFICULTY[self.difficulty] + 0.5 * min(self.mistakes, 4))

    def known_stability(self) -> float:
        """Stabilità di partenza di un argomento già studiato."""
        if self.mastery >= 2: return max(KNOWN_STABILITY[min(self.mastery, 3)], self.stability or 0)
        return FIRST_STABILITY[self.difficulty]


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


def reviews_needed(topic: PlanTopic, target: float) -> int:
    """Ripassi per rendere l'argomento stabile (≥ SAFE_STABILITY giorni) ripassandolo ogni volta alla soglia."""
    if topic.mastery >= 3: return 0
    stability = topic.known_stability() if topic.mastery else FIRST_STABILITY[topic.difficulty]
    count = 0
    while stability < SAFE_STABILITY and count < 10:
        stability = grow(stability, target, topic.hardness); count += 1
    return max(count, 1 if topic.mastery <= 1 else 0)


def _counts(topics: list[PlanTopic], prefs: PlanPrefs) -> tuple[int, int, int, int]:
    """Blocchi di studio, ripassi distanziati, ripassi finali, argomenti ancora da ripassare."""
    blocks = sum(STUDY_BLOCKS[t.difficulty] for t in topics if t.mastery == 0)
    reviews = sum(reviews_needed(t, prefs.target) for t in topics)
    finals = sum(1 for t in topics if t.mastery < 3 or t.difficulty == 3)
    return blocks, reviews, finals, sum(1 for t in topics if t.mastery <= 1)


def exam_share(day: date, exam: date, others: list[date]) -> float:
    """Fetta della giornata per questo esame quando se ne preparano altri. Gli esami ancora da sostenere ricevono pesi
    1, 1/2, 1/3... dal più vicino al più lontano e le fette sommano a 1: con due esami 2/3 e 1/3, con quattro circa 48%,
    24%, 16% e 12%. Ci si concentra sull'esame più vicino senza fermare gli altri, e ogni piano prende solo la sua fetta:
    l'ordine in cui si creano i piani non conta."""
    pending = sorted([d for d in others if d > day] + [exam])
    weight = lambda d: 1 / (1 + sum(1 for x in pending if x < d))  # esami nello stesso giorno hanno lo stesso peso
    return weight(exam) / sum(weight(d) for d in pending)


def build_plan(topics: list[PlanTopic], days: list[date], busy: dict[date, float] | None = None,
               prefs: PlanPrefs | None = None, exam: date | None = None, share: dict[date, float] | None = None) -> list[PlanItem]:
    """Distribuisce studio, ripassi e ripasso finale sui giorni disponibili (in ordine, esame escluso).
    `busy`: carico già in calendario per giorno (altri esami, task a mano), nell'unità del limite.
    `prefs`: preferenze e storico dello studente. `exam`: giorno dell'esame (default: il giorno dopo l'ultimo).
    `share`: quota di ogni giorno per questo esame (vedi `exam_share`); di default 1."""
    if not days or not topics: return []
    p = prefs or PlanPrefs()
    n = len(days)
    ords = [d.toordinal() for d in days]
    exam_ord = (exam or days[-1] + timedelta(days=1)).toordinal()
    blocks, reviews, finals, _ = _counts(topics, p)
    taken = [float((busy or {}).get(d, 0)) for d in days]
    every = p.buffer_every()
    buffer = {i for i in range(every - 1, n, every)} if every and n > every else set()
    quota = [min(1.0, max(0.05, (share or {}).get(d, 1.0))) for d in days]
    own_work = blocks * p.cost('study') + reviews * p.cost('review') + finals * p.cost('final')
    open_quota = [q for i, q in enumerate(quota) if i not in buffer] or [1.0]
    # Tetto automatico: il carico di questo esame spalmato secondo la quota di ogni giorno, più una sessione.
    auto_own = max(2 * p.cost('review'), own_work / sum(open_quota) + p.cost('study'))
    auto = max(auto_own, (own_work + sum(taken)) / max(1, n - len(buffer)) + p.cost('study'))
    caps = [p.cap(d) or auto for d in days]  # tetto della giornata, contando anche gli altri esami
    own_caps = [q * (p.cap(d) or auto_own) for q, d in zip(quota, days)]  # la parte di giornata di questo esame
    mean_cap = sum(own_caps) / n
    # Fase finale: ~15% dei giorni, di più se i ripassi finali non ci stanno; mai oltre metà del tempo.
    final_n = 1 if n <= 4 else min(n // 2, max(2, round(n * 0.15), ceil(finals * p.cost('final') / mean_cap)))
    if p.final_days: final_n = max(1, min(p.final_days, n - 1)) if n > 1 else 1
    learn_n = max(1, n - final_n) if n > 1 else 1
    buffer = {i for i in buffer if i < learn_n - 1}  # i giorni cuscinetto servono a recuperare prima del finale
    load = taken[:]
    own = [0.0] * n
    on_day: list[set[int]] = [set() for _ in range(n)]

    def place(ideal: int, lo: int, hi: int, topic_id: int, kind: str, must: bool = True) -> int | None:
        """Giorno più vicino a `ideal` in [lo, hi] con posto libero, non cuscinetto e senza lo stesso argomento
        (interleaving). Se è tutto pieno: con `must` lo studio va nel giorno meno carico e il ripasso nel più vicino, altrimenti nessuno."""
        ideal = min(max(ideal, lo), hi)
        cost = p.cost(kind)
        avoid = buffer | (before_gap if kind == 'study' else set())
        for step in range(0, hi - lo + 1):
            for i in (ideal + step, ideal - step) if step else (ideal,):
                if lo <= i <= hi and i not in avoid and fits(i, cost, kind=kind) and topic_id not in on_day[i]:
                    return i
        if not must: return None
        # Tutto pieno. Lo studio va nel giorno più scarico; un ripasso nel giorno più vicino, perché in ritardo il ricordo sbiadisce.
        by_load = lambda i: (i in avoid, own[i] / own_caps[i], abs(i - ideal))
        by_time = lambda i: (i in avoid, abs(i - ideal), own[i] / own_caps[i])
        for i in sorted(range(lo, hi + 1), key=by_load if kind == 'study' else by_time):
            if topic_id not in on_day[i]: return i
        return None

    items: list[PlanItem] = []

    def spread(ideal: int, early: int, late: int, topic_id: int) -> int | None:
        """Giorno con posto in [early, late] meno carico (contando anche gli altri esami); a parità, il più vicino a `ideal`."""
        cost = p.cost('review')
        free = [i for i in range(early, late + 1) if i not in buffer and fits(i, cost, kind='review') and topic_id not in on_day[i]]
        return min(free, key=lambda i: (load[i] / caps[i], abs(i - ideal)), default=None)

    def fits(i: int, cost: float, slack: float = 0, kind: str = 'study') -> bool:
        """C'è posto nella giornata e, per lo studio nuovo e il ripasso finale, nella fetta di questo esame.
        I ripassi non guardano la fetta: con altri esami più vicini si rallenta lo studio nuovo, non la memoria di quello
        già studiato (che altrimenti sbiadirebbe)."""
        mine = own_caps[i] if kind != 'review' else (p.cap(days[i]) or auto_own)
        return load[i] + cost <= caps[i] + slack and own[i] + cost <= mine + slack

    def add(i: int, item: PlanItem) -> None:
        cost = p.cost(item.kind)
        load[i] += cost; own[i] += cost; on_day[i].add(item.topic_id); items.append(item)

    # Prima di una pausa lunga (es. giorni riservati a un altro esame) niente studio nuovo: il primo ripasso cadrebbe
    # dopo la pausa, ad argomento ormai dimenticato.
    before_gap = {i for i in range(learn_n - 1) if ords[i + 1] - ords[i] > 2}

    # 1. Studio: in ordine di corso (i capitoli si appoggiano ai precedenti), sparso sul primo 80% del tempo, così anche
    #    l'ultimo argomento ha spazio per i suoi ripassi. Il tempo è pesato con la fetta di ogni giorno: dove c'è un
    #    esame più vicino lo studio nuovo si dirada.
    studied_at: dict[int, int] = {}
    k = 0
    new = [t for t in topics if t.mastery == 0]
    if p.order == 'hardest': new.sort(key=lambda t: -t.difficulty)  # stabile: a parità, ordine del corso
    cumulative = [0.0]
    for q in quota[:learn_n]: cumulative.append(cumulative[-1] + q)
    study_span = STUDY_SPAN * cumulative[-1]
    for t in new:
        parts = STUDY_BLOCKS[t.difficulty]
        for part in range(1, parts + 1):
            ideal = max(0, bisect_left(cumulative, k * study_span / max(1, blocks)) - 1)
            lo = studied_at.get(t.id, -1) + 1 if part > 1 else 0
            i = place(ideal, min(lo, learn_n - 1), learn_n - 1, t.id, 'study')
            if i is None: i = min(lo, n - 1)
            add(i, PlanItem(days[i], t.id, 'study', part, parts))
            studied_at[t.id] = i
            k += 1

    # 2. Ripassi distanziati, simulando la memoria giorno per giorno. Una coda ordinata per data assegna prima i
    #    ripassi che scadono prima, qualunque sia l'argomento: con i giorni pieni nessuno resta indietro per ultimo.
    memory: dict[int, tuple[float, int, int]] = {}  # argomento → (stabilità, ultimo passaggio come ordinale, ripassi)
    queue: list[tuple[int, int, int]] = []  # (giorno ideale come ordinale, ordine, argomento)
    by_id = {t.id: t for t in topics}
    for order, t in enumerate(topics):
        if t.mastery == 0:
            stability, last = FIRST_STABILITY[t.difficulty], ords[studied_at[t.id]]
        else:
            stability, last = t.known_stability(), (t.last_seen.toordinal() if t.last_seen else ords[0] - 1)
        memory[t.id] = (stability, last, 0)
        if stability < SAFE_STABILITY: heappush(queue, (last + interval(stability, p.target), order, t.id))
    while queue:
        due, order, tid = heappop(queue)
        stability, last, done = memory[tid]
        lo = bisect_left(ords, last + 1)
        ideal = max(lo, bisect_right(ords, due) - 1)  # se la scadenza cade in un giorno di riposo, il giorno prima
        # Il primo ripasso può cadere anche nella fase finale (argomenti studiati per ultimi), gli altri no.
        hi = n - 1 if not done else learn_n - 1
        if lo > hi or (done and ideal > hi): continue
        # Prima scelta: un giorno libero finché il ricordo resta accettabile (soglia - 5%).
        late = min(hi, max(lo, bisect_right(ords, last + interval(stability, p.target - 0.05)) - 1))
        # Prima scelta: il giorno più scarico tra "ricordo ancora al 90%" e "ricordo all'80%" (con soglia 85%): ripassare
        # un giorno prima costa poco e così gli argomenti studiati insieme non scadono tutti lo stesso giorno.
        early = min(late, max(lo, bisect_right(ords, last + interval(stability, min(0.97, p.target + REVIEW_WINDOW))) - 1))
        i = spread(ideal, early, late, tid)
        if i is None and p.per_day is None:
            # Limite automatico: meglio un'attività in più in un giorno che un ripasso quando il ricordo è già sbiadito.
            free = [j for j in range(min(ideal, late), late + 1)
                    if j not in buffer and tid not in on_day[j] and fits(j, p.cost('review'), p.cost('review'), 'review')]  # al massimo un'attività oltre il tetto
            i = min(free, key=lambda j: (load[j], abs(j - ideal)), default=None)
        # Il primo ripasso cerca posto finché il ricordo resta intorno al 70%, poi resta vicino al giorno ideale anche oltre
        # il tetto: settimane dopo l'argomento sarebbe dimenticato.
        # Un ripasso intermedio senza posto va al primo giorno libero: meglio in ritardo che lasciarlo al ripasso finale.
        if i is None and not done:
            later = min(hi, max(late, bisect_right(ords, last + interval(stability, p.target - 0.15)) - 1))
            i = place(ideal, lo, later, tid, 'review', must=False) or place(ideal, lo, late, tid, 'review', must=True)
        if i is None: i = place(ideal, lo, hi, tid, 'review', must=False)
        if i is None: continue  # nessun posto fino al ripasso finale: lo copre il finale
        stability = grow(stability, recall(ords[i] - last, stability), by_id[tid].hardness)
        add(i, PlanItem(days[i], tid, 'review', number=done + 1, gap=max(1, ords[i] - last)))
        memory[tid] = (stability, ords[i], done + 1)
        if stability < SAFE_STABILITY and done < 9: heappush(queue, (ords[i] + interval(stability, p.target), order, tid))
    totals = {tid: done for tid, (_, _, done) in memory.items()}
    items = [replace(it, of=totals[it.topic_id]) if it.kind == 'review' else it for it in items]

    # 3. Ripasso finale nel giorno meno carico, a parità il più vicino all'esame. Prima gli argomenti col ricordo
    #    previsto all'esame più basso; salta i "sicuri" che all'esame ricorderebbero comunque almeno al 90%.
    last_used = max((bisect_left(ords, it.day.toordinal()) for it in items), default=-1)
    final_start = min(n - final_n, last_used + 1) if n > 1 else 0
    at_exam = {t.id: recall(exam_ord - memory[t.id][1], memory[t.id][0]) for t in topics}
    for t in sorted(topics, key=lambda t: (at_exam[t.id], t.id)):
        if t.mastery == 3 and at_exam[t.id] >= 0.9: continue
        window = range(final_start, n)
        candidates = [i for i in window if t.id not in on_day[i]] or list(window)
        i = min(candidates, key=lambda i: (own[i] / own_caps[i], load[i] / caps[i], -i))
        add(i, PlanItem(days[i], t.id, 'final', gap=max(1, ords[i] - memory[t.id][1])))

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


def count_back(exam_day: date, need: float, per_day, at_least: int, rest_days: set[int], days_off: set[date] = frozenset()) -> tuple[date, int]:
    """Conta all'indietro dall'esame i giorni di studio finché la loro capienza (`per_day(giorno)`) copre `need`
    e sono almeno `at_least`. Restituisce il primo giorno e quanti sono."""
    day, have, count = exam_day, 0.0, 0
    while (have < need or count < at_least) and count < 730:
        day -= timedelta(days=1)
        if day.isoweekday() in rest_days or day in days_off: continue
        have += per_day(day); count += 1
    return day, count


def plan_advice(topics: list[PlanTopic], exam_day: date, rest_days: set[int], days_off: set[date] = frozenset(), prefs: PlanPrefs | None = None,
                others: list[date] = ()) -> PlanAdvice:
    """Quando conviene iniziare (metodo completo a ritmo sostenibile) e l'ultimo momento utile (versione minima
    al ritmo massimo). Il ritmo non supera mai il limite dello studente, giorno per giorno, né la quota di questo
    esame quando ce ne sono di più vicini (`others`: date degli altri esami); con lo storico,
    il tempo reale delle sessioni allunga le stime e una quota di task fatti sotto il 100% anticipa le date."""
    p = prefs or PlanPrefs()
    blocks, reviews, finals, to_review = _counts(topics, p)
    full_items, min_items = blocks + reviews + finals, blocks + to_review + finals
    minutes = lambda r: round((blocks * p.minutes('study') + r * MINUTES['review'] + finals * MINUTES['final']) * p.pace)
    full_minutes, min_minutes = minutes(reviews), minutes(to_review)
    full, minimum = (full_items, min_items) if p.unit == 'tasks' else (full_minutes, min_minutes)
    slack = max(0.5, min(1.0, p.reliability))
    # Con altri esami più vicini, quei giorni valgono solo la quota di questo esame: si parte prima.
    comfort = lambda d: min(COMFORT[p.unit], p.cap(d) or COMFORT[p.unit]) * exam_share(d, exam_day, others)
    fastest = lambda d: (p.cap(d) or MAXIMUM[p.unit]) * exam_share(d, exam_day, others)
    ideal_start, ideal_days = count_back(exam_day, full / slack, comfort, MIN_IDEAL_DAYS, rest_days, days_off)
    latest_start, min_days = count_back(exam_day, minimum / slack, fastest, 3, rest_days, days_off)
    return PlanAdvice(ideal_start, latest_start, ideal_days, min_days, full_items, min_items, full_minutes, min_minutes)
