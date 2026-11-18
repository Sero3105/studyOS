"""Algoritmo del piano d'esame (funzione pura, senza database)."""
from datetime import date, timedelta

from services.study_plan import PlanPrefs, PlanTopic, build_plan, exam_share, grow, interval, plan_advice, recall, reviews_needed

START = date(2026, 12, 1)


def _days(n):
    return [START + timedelta(days=i) for i in range(n)]


def test_memory_model():
    # Curva dell'oblio: alla stabilità il ricordo è al 90%, poi scende; l'intervallo inverte la curva.
    assert abs(recall(10, 10) - 0.9) < 1e-9 and recall(0, 3) == 1 and recall(20, 10) < recall(5, 10)
    assert interval(10, 0.9) == 10 and interval(10, 0.85) > interval(10, 0.9)
    # Un ripasso riuscito allunga la stabilità: di più se l'argomento è facile o il ricordo più sbiadito.
    assert grow(2, 0.85, 3) > grow(2, 0.85, 8) > 2
    assert grow(2, 0.80, 5.5) > grow(2, 0.90, 5.5)
    # Più difficile, più ripassi per consolidare; gli errori annotati ne aggiungono; "sicuro" nessuno.
    hard, medium, easy = (reviews_needed(PlanTopic(1, "x", d, 0), 0.85) for d in (3, 2, 1))
    assert hard > medium >= easy >= 1
    assert reviews_needed(PlanTopic(1, "x", 2, 0, mistakes=4), 0.85) > medium
    assert reviews_needed(PlanTopic(1, "x", 2, 3), 0.85) == 0


def test_review_gaps_grow():
    plan = build_plan([PlanTopic(1, "A", 3, 0)], _days(60))
    reviews = [it.day for it in plan if it.kind == "review"]
    gaps = [(b - a).days for a, b in zip(reviews, reviews[1:])]
    assert len(reviews) >= 3 and gaps == sorted(gaps) and gaps[0] < gaps[-1]


def test_plan_respects_the_study_method():
    topics = [PlanTopic(1, "A", 1, 0), PlanTopic(2, "B", 2, 0), PlanTopic(3, "C", 3, 0), PlanTopic(4, "D", 2, 1), PlanTopic(5, "E", 1, 3)]
    days = _days(30)
    plan = build_plan(topics, days)
    index = {d: i for i, d in enumerate(days)}
    by_topic = lambda tid, kind=None: [it for it in plan if it.topic_id == tid and (kind is None or it.kind == kind)]
    # Studio solo per gli argomenti nuovi; i difficili in due blocchi, uno dopo l'altro.
    assert [len(by_topic(t, "study")) for t in (1, 2, 3, 4, 5)] == [1, 1, 2, 0, 0]
    # Ogni ripasso viene dopo lo studio, e il ripasso finale dopo i ripassi.
    for tid in (1, 2, 3):
        last_study = max(index[it.day] for it in by_topic(tid, "study"))
        reviews = [index[it.day] for it in by_topic(tid, "review")]
        finals = [index[it.day] for it in by_topic(tid, "final")]
        assert reviews and min(reviews) > last_study and finals and min(finals) > max(reviews)
    # Più difficile, più ripassi (quanti dipende anche dal tempo rimasto: C è studiato per ultimo).
    assert len(by_topic(3, "review")) >= len(by_topic(2, "review")) >= len(by_topic(1, "review"))
    # Già studiato: niente studio, ma ripassi; "sicuro" e facile: niente.
    assert by_topic(4, "review") and by_topic(5) == []
    # Interleaving: mai lo stesso argomento due volte nello stesso giorno.
    pairs = [(it.day, it.topic_id) for it in plan]
    assert len(pairs) == len(set(pairs))
    # Gli ultimi giorni prima dell'esame sono ripasso finale.
    assert {it.kind for it in plan if index[it.day] >= 30 - 2} == {"final"}
    assert all(it.day in days for it in plan)


def test_plan_spreads_the_load():
    topics = [PlanTopic(i, str(i), 2, 0) for i in range(20)]
    plan = build_plan(topics, _days(14))
    per_day = {}
    for it in plan: per_day[it.day] = per_day.get(it.day, 0) + 1
    # 20 argomenti medi = 100 passaggi previsti in 14 giorni: capienza ceil(100 / 14) + 1 = 9 al giorno.
    # Se i giorni sono pieni si salta qualche ripasso intermedio invece di sforare.
    assert max(per_day.values()) <= 9 and len(plan) <= 100


def test_plan_with_few_days_still_covers_everything():
    topics = [PlanTopic(1, "A", 3, 0), PlanTopic(2, "B", 1, 0)]
    plan = build_plan(topics, _days(2))
    assert {it.topic_id for it in plan if it.kind == "study"} == {1, 2}
    assert build_plan(topics, []) == [] and build_plan([], _days(5)) == []


def test_plan_avoids_days_already_busy():
    topics = [PlanTopic(i, str(i), 2, 0) for i in range(6)]
    days = _days(20)
    busy = {d: 6 for d in days[:10]}  # prime due settimane già piene per un altro esame
    plan = build_plan(topics, days, busy)
    first_half = sum(1 for it in plan if it.day in busy)
    assert first_half < len(plan) / 2


def test_advice_counts_back_study_days():
    exam = date(2026, 12, 17)  # giovedì
    topics = [PlanTopic(i, str(i), 2, 0) for i in range(12)]  # 12 medi: 12 studi + 24 ripassi + 12 finali = 48
    advice = plan_advice(topics, exam, {7})
    assert (advice.full_items, advice.min_items) == (48, 36)
    assert (advice.ideal_days, advice.min_days) == (16, 6)  # 48 / 3 al giorno, 36 / 6 al giorno
    assert advice.ideal_start < advice.latest_start < exam
    # Contando all'indietro le domeniche non valgono: 6 giorni di studio prima di giovedì 17 partono venerdì 10.
    assert advice.latest_start == date(2026, 12, 10)
    # Poco da fare: comunque almeno 10 giorni per lasciare spazio ai ripassi.
    assert plan_advice([PlanTopic(1, "A", 1, 0)], exam, set()).ideal_days == 10


def test_preferences_shape_the_plan():
    topics = [PlanTopic(1, "A", 1, 0), PlanTopic(2, "B", 3, 0), PlanTopic(3, "C", 2, 0)]
    days = _days(20)
    # Prima i difficili: B è studiato per primo.
    first = build_plan(topics, days, prefs=PlanPrefs(order="hardest"))[0]
    assert (first.kind, first.topic_id) == ("study", 2)
    # Intensità: più alta la soglia del ricordo, più ripassi.
    count = lambda p: sum(1 for it in build_plan(topics, days, prefs=p) if it.kind == "review")
    assert count(PlanPrefs(reviews="light")) <= count(PlanPrefs()) < count(PlanPrefs(reviews="intense"))
    # Fase finale fissata a 5 giorni: i ripassi finali stanno negli ultimi 5.
    plan = build_plan(topics, days, prefs=PlanPrefs(final_days=5))
    assert all(days.index(it.day) >= 15 for it in plan if it.kind == "final")
    # Tetto di 2 attività al giorno rispettato.
    per_day = {}
    for it in build_plan(topics, days, prefs=PlanPrefs(per_day=2)): per_day[it.day] = per_day.get(it.day, 0) + 1
    assert max(per_day.values()) <= 2


def test_plan_uses_topic_history():
    days = _days(20)
    # Studiato 10 giorni fa e mai ripassato: il ricordo è già sotto soglia, il ripasso arriva subito.
    old = build_plan([PlanTopic(1, "A", 2, 1, last_seen=START - timedelta(days=10))], days)
    fresh = build_plan([PlanTopic(1, "A", 2, 1, last_seen=START - timedelta(days=1))], days)
    first = lambda plan: min(it.day for it in plan if it.kind == "review")
    assert first(old) == START and first(fresh) > START
    # Ripassato bene con intervalli lunghi: stabile, solo il ripasso finale.
    assert {it.kind for it in build_plan([PlanTopic(1, "A", 2, 2, stability=30, last_seen=START)], days)} == {"final"}
    # Il ripasso finale va prima all'argomento che ricorderebbe peggio all'esame.
    weak, strong = PlanTopic(1, "A", 3, 1, last_seen=START), PlanTopic(2, "B", 1, 2, stability=15, last_seen=START)
    finals = [it for it in build_plan([strong, weak], _days(6), prefs=PlanPrefs(final_days=1)) if it.kind == "final"]
    assert finals[0].topic_id == 1 or len({it.day for it in finals}) == 1


def test_plan_adapts_to_the_student():
    topics = [PlanTopic(i, str(i), 2, 0) for i in range(8)]
    days = _days(28)
    # Limite diverso per giorno: lunedì 1 attività, gli altri giorni 4.
    weekly = (1, 4, 4, 4, 4, 4, 4)
    per_day = {}
    for it in build_plan(topics, days, prefs=PlanPrefs(per_day=4, per_weekday=weekly)): per_day[it.day] = per_day.get(it.day, 0) + 1
    assert all(count <= weekly[d.isoweekday() - 1] for d, count in per_day.items())
    # Chi fa il 75% dei task ha un giorno cuscinetto ogni 4: lì il piano non mette nulla.
    plan = build_plan(topics, days, prefs=PlanPrefs(reliability=0.75))
    assert not {it.day for it in plan} & {days[3], days[7], days[11]}
    # Lo storico sposta le date: più lento o meno costante → inizio ideale prima.
    exam = date(2027, 1, 20)
    base = plan_advice(topics, exam, set(), prefs=PlanPrefs(unit="minutes"))
    slow = plan_advice(topics, exam, set(), prefs=PlanPrefs(unit="minutes", pace=1.4))
    shaky = plan_advice(topics, exam, set(), prefs=PlanPrefs(reliability=0.7))
    assert slow.ideal_start < base.ideal_start and slow.full_minutes > base.full_minutes
    assert shaky.ideal_start < plan_advice(topics, exam, set()).ideal_start


def test_nearest_exam_gets_the_largest_share():
    a, b, c, d = date(2026, 12, 10), date(2026, 12, 20), date(2027, 1, 10), date(2027, 1, 20)
    day = date(2026, 12, 1)
    # Da solo: tutta la giornata. Con altri esami: 1, 1/2, 1/3, 1/4 normalizzati, dal più vicino al più lontano.
    assert exam_share(day, a, []) == 1
    assert abs(exam_share(day, a, [b]) - 2 / 3) < 1e-9 and abs(exam_share(day, b, [a]) - 1 / 3) < 1e-9
    shares = [exam_share(day, e, [x for x in (a, b, c, d) if x != e]) for e in (a, b, c, d)]
    assert abs(sum(shares) - 1) < 1e-9 and shares == sorted(shares, reverse=True)
    # Passato l'esame vicino, la fetta torna tutta all'altro.
    assert exam_share(date(2026, 12, 12), b, [a]) == 1


def test_far_exam_studies_mostly_after_the_near_one():
    topics = [PlanTopic(i, str(i), 2, 0) for i in range(12)]
    days = _days(40)
    near = START + timedelta(days=20)
    share = {d: exam_share(d, START + timedelta(days=41), [near]) for d in days}
    plan = build_plan(topics, days, exam=START + timedelta(days=41), share=share)
    before = [it for it in plan if it.day < near]
    after = [it for it in plan if it.day > near]
    # Prima dell'esame vicino un terzo della giornata, dopo tutta: il carico si sposta dopo.
    assert len(before) / 20 < len(after) / 19
    # Lo stesso piano senza altri esami è uniforme.
    alone = build_plan(topics, days, exam=START + timedelta(days=41))
    assert sum(1 for it in alone if it.day < near) > len(before)
    # Con un'altra prova vicina la data ideale anticipa: quei giorni valgono solo una fetta.
    exam, many = START + timedelta(days=41), [PlanTopic(i, str(i), 2, 0) for i in range(30)]  # ~40 giorni: oltre l'esame vicino
    assert plan_advice(many, exam, set(), others=[near]).ideal_start < plan_advice(many, exam, set()).ideal_start
