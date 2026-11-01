import type { SessionKind } from '../../services/sessionService'

export interface StudySessionConfig {
  focusMinutes: number
  breakMinutes: number
  /** Assenti nelle sessioni create prima della pausa lunga: vedi `LONG_BREAK_DEFAULTS`. */
  longBreakMinutes?: number
  blocksBeforeLongBreak?: number
  notes: string
  subjectId: number | null
  topicId: number | null
  subject: string
  topic: string
  /** Tipo di attività salvato con ogni blocco; assente = studio. */
  kind?: SessionKind
  /** Task del Planner da cui è partita la sessione: a fine blocco si propone di chiuderlo. */
  taskId?: number | null
  taskTitle?: string
}
