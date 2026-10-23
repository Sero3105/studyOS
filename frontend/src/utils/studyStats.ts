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
