import type { Card } from '../services/cardService'
import type { Exam } from '../services/examService'
import type { StudySession } from '../services/sessionService'
import type { Subject, Topic } from '../services/subjectService'
import type { Task } from '../services/taskService'

type Day = string

/** Una proposta di "Cosa studio oggi?": abbastanza dati per avviare il timer già impostato. */
export type Suggestion =
  | { kind: 'block'; task: Task; subject?: Subject; topic?: Topic }
  | { kind: 'review'; task: Task; subject?: Subject; topic?: Topic }
  | { kind: 'cards'; count: number }
  | { kind: 'task'; task: Task; subject?: Subject; topic?: Topic }
  | { kind: 'exam'; exam: Exam; subject: Subject; topic: Topic; days: number }

const PRIORITY = { high: 0, medium: 1, low: 2 }
const daysBetween = (from: Day, to: Day) => Math.round((Date.parse(to) - Date.parse(from)) / 86400000)

/** Minuti studiati per argomento. */
export function minutesByTopic(sessions: Pick<StudySession, 'topic_id' | 'duration_minutes'>[]): Map<number, number> {
  const out = new Map<number, number>()
  for (const s of sessions) if (s.topic_id !== null) out.set(s.topic_id, (out.get(s.topic_id) ?? 0) + s.duration_minutes)
  return out
}

/**
 * Al massimo `limit` proposte, in quest'ordine: blocchi orari di oggi (per ora), ripassi in scadenza,
 * flashcard da ripassare, task in scadenza o in ritardo (prima l'alta priorità), e l'argomento non
 * completato meno studiato dell'esame più vicino (entro 30 giorni).
 */
export function todaySuggestions(
  data: { tasks: Task[]; cards: Pick<Card, 'due_date'>[]; subjects: Subject[]; exams: Exam[]; sessions: Pick<StudySession, 'topic_id' | 'duration_minutes'>[] },
  today: Day,
  limit = 5,
): Suggestion[] {
  const subjectOf = (id: number | null) => data.subjects.find((s) => s.id === id)
  const where = (task: Task) => {
    const subject = subjectOf(task.subject_id)
    return { subject, topic: subject?.topics.find((x) => x.id === task.topic_id) }
  }
  const open = data.tasks.filter((x) => x.status !== 'done' && x.due_date !== null && x.due_date <= today)
  const blocks = open.filter((x) => x.due_date === today && x.scheduled_time).sort((a, b) => a.scheduled_time!.localeCompare(b.scheduled_time!))
  const reviews = open.filter((x) => x.review_interval !== null && !blocks.includes(x))
  const others = open.filter((x) => !blocks.includes(x) && !reviews.includes(x))
    .sort((a, b) => PRIORITY[a.priority] - PRIORITY[b.priority] || a.due_date!.localeCompare(b.due_date!))
  const dueCards = data.cards.filter((c) => c.due_date <= today).length

  const out: Suggestion[] = [
    ...blocks.map((task) => ({ kind: 'block' as const, task, ...where(task) })),
    ...reviews.map((task) => ({ kind: 'review' as const, task, ...where(task) })),
    ...(dueCards ? [{ kind: 'cards' as const, count: dueCards }] : []),
    ...others.map((task) => ({ kind: 'task' as const, task, ...where(task) })),
  ]

  const exam = data.exams
    .filter((e) => (e.status === 'planned' || e.status === 'in_progress') && e.exam_date && e.exam_date >= today && daysBetween(today, e.exam_date) <= 30)
    .sort((a, b) => a.exam_date!.localeCompare(b.exam_date!))
    .find((e) => subjectOf(e.subject_id)?.topics.some((x) => !x.completed))
  if (exam) {
    const subject = subjectOf(exam.subject_id)!
    const studied = minutesByTopic(data.sessions)
    const topic = subject.topics.filter((x) => !x.completed).sort((a, b) => (studied.get(a.id) ?? 0) - (studied.get(b.id) ?? 0) || a.id - b.id)[0]
    // Se un task di oggi è già su quell'argomento, la proposta sarebbe un doppione.
    if (!out.some((s) => 'task' in s && s.task.topic_id === topic.id)) out.push({ kind: 'exam', exam, subject, topic, days: daysBetween(today, exam.exam_date!) })
  }
  return out.slice(0, limit)
}

export interface Readiness {
  /** 0-1, media pesata delle parti disponibili; null se non c'è nulla da misurare. */
  score: number | null
  topics: { done: number; total: number } | null
  cards: { mastered: number; total: number } | null
  plan: { late: number; total: number } | null
  minutes: number
}

/**
 * Quanto sei pronto per un esame: argomenti completati (peso 2), flashcard consolidate, cioè con
 * intervallo di almeno 7 giorni (peso 1), task della materia non in ritardo (peso 1).
 */
export function examReadiness(
  exam: Pick<Exam, 'subject_id'>,
  data: { subjects: Subject[]; cards: Pick<Card, 'topic_id' | 'interval'>[]; tasks: Task[]; sessions: Pick<StudySession, 'subject_id' | 'duration_minutes'>[] },
  today: Day,
): Readiness {
  const subject = data.subjects.find((s) => s.id === exam.subject_id)
  const topicIds = new Set(subject?.topics.map((x) => x.id) ?? [])
  const topics = subject?.topics.length ? { done: subject.topics.filter((x) => x.completed).length, total: subject.topics.length } : null
  const subjectCards = data.cards.filter((c) => topicIds.has(c.topic_id))
  const cards = subjectCards.length ? { mastered: subjectCards.filter((c) => c.interval >= 7).length, total: subjectCards.length } : null
  const planned = subject ? data.tasks.filter((x) => x.subject_id === subject.id && x.due_date !== null && x.status !== 'done') : []
  const plan = planned.length ? { late: planned.filter((x) => x.due_date! < today).length, total: planned.length } : null
  const parts = [
    topics && { weight: 2, value: topics.done / topics.total },
    cards && { weight: 1, value: cards.mastered / cards.total },
    plan && { weight: 1, value: 1 - plan.late / plan.total },
  ].filter((p): p is { weight: number; value: number } => Boolean(p))
  const weight = parts.reduce((sum, p) => sum + p.weight, 0)
  return {
    score: weight ? parts.reduce((sum, p) => sum + p.weight * p.value, 0) / weight : null,
    topics, cards, plan,
    minutes: subject ? data.sessions.filter((s) => s.subject_id === subject.id).reduce((sum, s) => sum + s.duration_minutes, 0) : 0,
  }
}
