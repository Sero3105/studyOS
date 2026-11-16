"""Algoritmo del piano d'esame (funzione pura, senza database)."""
from datetime import date, timedelta

from services.study_plan import PlanPrefs, PlanTopic, build_plan, plan_advice, review_offsets

START = date(2026, 12, 1)


def _days(n):
    return [START + timedelta(days=i) for i in range(n)]


def test_review_gaps_grow():
    offsets = review_offsets(3, 30)
    gaps = [b - a for a, b in zip([0] + offsets, offsets)]
    assert offsets[0] >= 1 and offsets[-1] <= 30
    assert gaps == sorted(gaps) and gaps[0] < gaps[-1]


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
    # Più difficile, più ripassi.
    assert len(by_topic(3, "review")) > len(by_topic(2, "review")) > len(by_topic(1, "review"))
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
    topics = [PlanTopic(i, str(i), 2, 0) for i in range(12)]  # 12 medi: 12 studi + 36 ripassi + 12 finali = 60
    advice = plan_advice(topics, exam, {7})
    assert (advice.full_items, advice.min_items) == (60, 36)
    assert (advice.ideal_days, advice.min_days) == (20, 6)  # 60 / 3 al giorno, 36 / 6 al giorno
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
    # Intensità: leggero ha meno ripassi di intenso.
    count = lambda p: sum(1 for it in build_plan(topics, days, prefs=p) if it.kind == "review")
    assert count(PlanPrefs(reviews="light")) < count(PlanPrefs()) < count(PlanPrefs(reviews="intense"))
    # Fase finale fissata a 5 giorni: i ripassi finali stanno negli ultimi 5.
    plan = build_plan(topics, days, prefs=PlanPrefs(final_days=5))
    assert all(days.index(it.day) >= 15 for it in plan if it.kind == "final")
    # Tetto di 2 attività al giorno rispettato.
    per_day = {}
    for it in build_plan(topics, days, prefs=PlanPrefs(per_day=2)): per_day[it.day] = per_day.get(it.day, 0) + 1
    assert max(per_day.values()) <= 2
