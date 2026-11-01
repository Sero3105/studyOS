import { addDays, weekStart } from './dates.ts'

interface SessionLike { studied_on: string; duration_minutes: number; subject_id: number | null }
interface TaskLike { due_date: string | null; status: string; subject_id: number | null }

export interface HeatCell { date: string; minutes: number; level: 0 | 1 | 2 | 3 | 4 }

/** Livello di colore per i minuti di un giorno (soglie fisse: 25 min = un pomodoro). */
export function heatLevel(minutes: number): HeatCell['level'] {
  if (minutes <= 0) return 0
  if (minutes <= 25) return 1
  if (minutes <= 60) return 2
  if (minutes <= 120) return 3
  return 4
}

/** Ultime `weeks` settimane, da lunedì a domenica; i giorni futuri della settimana corrente sono esclusi. */
export function buildHeatmap(sessions: SessionLike[], today: string, weeks = 53): HeatCell[][] {
  const byDay = new Map<string, number>()
  for (const s of sessions) byDay.set(s.studied_on, (byDay.get(s.studied_on) ?? 0) + s.duration_minutes)
  const first = addDays(weekStart(today), -7 * (weeks - 1))
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(first, w * 7 + d))
      .filter((date) => date <= today)
      .map((date) => ({ date, minutes: byDay.get(date) ?? 0, level: heatLevel(byDay.get(date) ?? 0) })),
  )
}

export interface PlanRow { subjectId: number; name: string; planned: number; done: number; minutes: number }

/** Ultimi `days` giorni per materia: task in scadenza (pianificati) e completati, minuti studiati davvero. */
export function planVsActual(subjects: { id: number; name: string }[], tasks: TaskLike[], sessions: SessionLike[], today: string, days = 30): PlanRow[] {
  const from = addDays(today, -(days - 1))
  const inRange = (date: string | null) => date !== null && date >= from && date <= today
  return subjects
    .map((subject) => {
      const planned = tasks.filter((t) => t.subject_id === subject.id && inRange(t.due_date))
      return {
        subjectId: subject.id,
        name: subject.name,
        planned: planned.length,
        done: planned.filter((t) => t.status === 'done').length,
        minutes: sessions.filter((s) => s.subject_id === subject.id && inRange(s.studied_on)).reduce((sum, s) => sum + s.duration_minutes, 0),
      }
    })
    .filter((row) => row.planned > 0 || row.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes || b.planned - a.planned)
}

/** `created_at` dell'API è UTC senza fuso: senza la Z il browser lo leggerebbe come ora locale. */
export const parseUtc = (iso: string) => new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`)

/**
 * Minuti studiati per giorno della settimana (0 = lunedì) e ora (0-23), nel fuso del browser.
 * La sessione viene salvata alla fine: dall'ora di fine si conta all'indietro, ora per ora.
 */
export function hourGrid(sessions: { created_at: string; duration_minutes: number }[]): number[][] {
  const grid = Array.from({ length: 7 }, () => Array<number>(24).fill(0))
  for (const s of sessions) {
    let end = parseUtc(s.created_at).getTime()
    let left = s.duration_minutes
    while (left > 0) {
      const at = new Date(end - 1)
      const hourStart = new Date(at).setMinutes(0, 0, 0)
      const chunk = Math.min(left, Math.ceil((end - hourStart) / 60000))
      grid[(at.getDay() + 6) % 7][at.getHours()] += chunk
      left -= chunk
      end -= chunk * 60000
    }
  }
  return grid
}

interface ReviewTask { id: number; due_date: string | null; status: string; subject_id: number | null }

export interface WeekReview {
  from: string; to: string
  planned: number; done: number
  /** In scadenza da lunedì a ieri e non completati. */
  skipped: number
  minutes: number; previousMinutes: number
  bySubject: { subjectId: number; name: string; minutes: number; previous: number }[]
  /** Tutti i task aperti con scadenza passata, da spostare. */
  overdue: ReviewTask[]
}

/** Settimana corrente (lunedì → domenica) a confronto con la precedente. */
export function weeklyReview<T extends ReviewTask>(tasks: T[], sessions: SessionLike[], subjects: { id: number; name: string }[], today: string): WeekReview & { overdue: T[] } {
  const from = weekStart(today)
  const to = addDays(from, 6)
  const prevFrom = addDays(from, -7)
  const inWeek = (d: string | null) => d !== null && d >= from && d <= to
  const inPrev = (d: string) => d >= prevFrom && d < from
  const planned = tasks.filter((t) => inWeek(t.due_date))
  const sum = (list: SessionLike[]) => list.reduce((total, s) => total + s.duration_minutes, 0)
  const week = sessions.filter((s) => inWeek(s.studied_on))
  const prev = sessions.filter((s) => inPrev(s.studied_on))
  return {
    from, to,
    planned: planned.length,
    done: planned.filter((t) => t.status === 'done').length,
    skipped: planned.filter((t) => t.status !== 'done' && t.due_date! < today).length,
    minutes: sum(week),
    previousMinutes: sum(prev),
    bySubject: subjects
      .map((s) => ({ subjectId: s.id, name: s.name, minutes: sum(week.filter((x) => x.subject_id === s.id)), previous: sum(prev.filter((x) => x.subject_id === s.id)) }))
      .filter((row) => row.minutes > 0 || row.previous > 0)
      .sort((a, b) => b.minutes - a.minutes || b.previous - a.previous),
    overdue: tasks.filter((t) => t.status !== 'done' && t.due_date !== null && t.due_date < today),
  }
}

/** Nuova scadenza di un task scaduto: avanti di settimane intere (stesso giorno) finché non è più nel passato. */
export function postponeByWeeks(due: string, today: string): string {
  let next = addDays(due, 7)
  while (next < today) next = addDays(next, 7)
  return next
}

/** Minuti per tipo di attività (studio, lezione, esercizi...), dal più frequente. */
export function minutesByKind(sessions: { kind: string; duration_minutes: number }[]): { kind: string; minutes: number }[] {
  const totals = new Map<string, number>()
  for (const s of sessions) totals.set(s.kind, (totals.get(s.kind) ?? 0) + s.duration_minutes)
  return [...totals].map(([kind, minutes]) => ({ kind, minutes })).sort((a, b) => b.minutes - a.minutes)
}

/** Focus medio (1-3) per materia, solo sui blocchi valutati; le sessioni libere finiscono sotto `null`. */
export function focusBySubject(sessions: { subject_id: number | null; focus: number | null }[]): { subjectId: number | null; average: number; count: number }[] {
  const acc = new Map<number | null, { sum: number; count: number }>()
  for (const s of sessions) {
    if (!s.focus) continue
    const entry = acc.get(s.subject_id) ?? { sum: 0, count: 0 }
    acc.set(s.subject_id, { sum: entry.sum + s.focus, count: entry.count + 1 })
  }
  return [...acc].map(([subjectId, { sum, count }]) => ({ subjectId, average: sum / count, count })).sort((a, b) => b.average - a.average)
}
