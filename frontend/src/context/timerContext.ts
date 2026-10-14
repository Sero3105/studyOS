import { createContext } from 'react'
import type { StudySessionConfig } from '../components/timer/types'

export type TimerMode = 'Work' | 'Break'
export type TimerSaveState = 'idle' | 'saved' | 'error'

export interface TimerContextValue {
  /** Sessione in corso, `null` se non ne è stata impostata nessuna. */
  config: StudySessionConfig | null
  mode: TimerMode
  isRunning: boolean
  remainingSeconds: number
  totalSeconds: number
  hasStarted: boolean
  saveState: TimerSaveState
  /** Imposta una nuova sessione (ferma, pronta da avviare). */
  start: (config: StudySessionConfig) => void
  /** Avvia, mette in pausa o riprende. */
  toggle: () => void
  /** Torna all'inizio del blocco di studio. */
  reset: () => void
  /** Chiude la sessione corrente. */
  clear: () => void
}

export const TimerContext = createContext<TimerContextValue | undefined>(undefined)
