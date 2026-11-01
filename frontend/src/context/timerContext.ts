import { createContext } from 'react'
import type { StudySessionConfig } from '../components/timer/types'
import type { Focus } from '../services/sessionService'

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
  /** Blocchi di studio completati nella sessione corrente. */
  completedBlocks: number
  saveState: TimerSaveState
  /** Ultimo blocco salvato da questa scheda e ancora da valutare (focus), altrimenti null. */
  lastBlockId: number | null
  /** Salva il focus dell'ultimo blocco; null chiude la domanda senza salvare. */
  rateFocus: (focus: Focus | null) => void
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
