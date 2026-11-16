import { createContext } from 'react'
import type { StudySessionConfig } from '../components/timer/types'
import type { Focus } from '../services/sessionService'
import type { Sitting } from '../utils/sitting'

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
  /** Salva focus e "cosa ho fatto" dell'ultimo blocco; entrambi vuoti chiudono la domanda senza salvare. */
  rateBlock: (focus: Focus | null, note: string) => void
  /** Seduta in corso (o terminata, con il riepilogo da chiudere). */
  sitting: Sitting | null
  /** Minuti interi già studiati nel blocco in corso; 0 in pausa. */
  partialMinutes: number
  /** Termina la seduta, salvando o no il blocco a metà, e passa al riepilogo. */
  finish: (savePartial: boolean) => void
  toggleItem: (index: number) => void
  addItem: (text: string) => void
  /** Annota una distrazione nel blocco in corso, senza fermare il timer. */
  addDistraction: (text: string) => void
  removeDistraction: (index: number) => void
  setResume: (text: string) => void
  /** Imposta una nuova sessione (ferma, pronta da avviare). */
  start: (config: StudySessionConfig) => void
  /** Avvia, mette in pausa o riprende. */
  toggle: () => void
  /** Torna all'inizio del blocco di studio. */
  reset: () => void
  /** Chiude la sessione corrente (dopo il riepilogo, o per cambiarla). */
  clear: () => void
}

export const TimerContext = createContext<TimerContextValue | undefined>(undefined)
