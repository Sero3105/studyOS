import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { TimerContext } from './timerContext'
import type { TimerMode, TimerSaveState } from './timerContext'
import type { StudySessionConfig } from '../components/timer/types'
import { createSession } from '../services/sessionService'
import { todayIso } from '../utils/dates'

/**
 * Stato del timer Pomodoro, condiviso da tutte le pagine protette.
 *
 * Vive in `AppLayout`, che resta montato tra un cambio di route e l'altro:
 * il countdown continua anche lasciando la pagina Timer.
 *
 * Il tempo rimasto non è un contatore decrementato a ogni tick: quando il
 * timer corre si salva l'istante di fine (`endsAt`) e il rimanente si
 * calcola da `Date.now()`. Così il countdown resta esatto anche se il
 * browser rallenta gli intervalli (scheda in background, sospensione).
 * In pausa si conserva invece il rimanente (`remainingMs`).
 *
 * Ciclo: fine studio → pausa che parte da sola; fine pausa → studio, fermo.
 * Ogni blocco di studio completato viene salvato una sola volta nello storico.
 */

interface TimerState {
  sessionId: number
  config: StudySessionConfig | null
  mode: TimerMode
  isRunning: boolean
  endsAt: number | null
  remainingMs: number
  now: number
  completedBlocks: number
}

const TICK_MS = 250

const minutesMs = (minutes: number) => minutes * 60000

const idleState: TimerState = {
  sessionId: 0,
  config: null,
  mode: 'Work',
  isRunning: false,
  endsAt: null,
  remainingMs: 0,
  now: 0,
  completedBlocks: 0,
}

/**
 * Porta lo stato all'istante `time`, attraversando anche più cambi di fase
 * se ne sono passati (es. computer sospeso durante studio e pausa).
 * Ogni fase successiva parte dalla fine esatta della precedente.
 */
function advance(state: TimerState, time: number): TimerState {
  let next = { ...state, now: time }
  while (next.config && next.isRunning && next.endsAt !== null && time >= next.endsAt) {
    if (next.mode === 'Work') {
      next = {
        ...next,
        mode: 'Break',
        endsAt: next.endsAt + minutesMs(next.config.breakMinutes),
        completedBlocks: next.completedBlocks + 1,
      }
    } else {
      next = {
        ...next,
        mode: 'Work',
        isRunning: false,
        endsAt: null,
        remainingMs: minutesMs(next.config.focusMinutes),
      }
    }
  }
  return next
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TimerState>(idleState)
  const [saveState, setSaveState] = useState<TimerSaveState>('idle')
  // Blocchi già inviati al backend, per sessione: evita salvataggi doppi.
  const savedRef = useRef({ sessionId: 0, blocks: 0 })

  // Un solo intervallo, attivo solo mentre il timer corre; serve a ridisegnare
  // e a far scattare i cambi di fase, non a misurare il tempo.
  useEffect(() => {
    if (!state.isRunning) return
    const interval = setInterval(() => setState((current) => advance(current, Date.now())), TICK_MS)
    return () => clearInterval(interval)
  }, [state.isRunning])

  // Salva nello storico ogni blocco di studio completato (stesso payload di prima).
  useEffect(() => {
    const { config, sessionId, completedBlocks } = state
    if (!config) return
    if (savedRef.current.sessionId !== sessionId) savedRef.current = { sessionId, blocks: 0 }
    const pending = completedBlocks - savedRef.current.blocks
    if (pending <= 0) return
    savedRef.current.blocks = completedBlocks
    for (let i = 0; i < pending; i += 1) {
      createSession({
        subject_id: config.subjectId ?? undefined,
        topic_id: config.topicId ?? undefined,
        duration_minutes: config.focusMinutes,
        studied_on: todayIso(),
        notes: config.notes || undefined,
      })
        .then(() => setSaveState('saved'))
        .catch(() => setSaveState('error'))
    }
  }, [state])

  const start = useCallback((config: StudySessionConfig) => {
    setSaveState('idle')
    setState((current) => ({
      ...idleState,
      sessionId: current.sessionId + 1,
      config,
      remainingMs: minutesMs(config.focusMinutes),
      now: Date.now(),
    }))
  }, [])

  const toggle = useCallback(() => {
    const time = Date.now()
    setState((current) => {
      if (!current.config) return current
      const synced = advance(current, time)
      if (synced.isRunning && synced.endsAt !== null) {
        return { ...synced, isRunning: false, endsAt: null, remainingMs: Math.max(0, synced.endsAt - time) }
      }
      return { ...synced, isRunning: true, endsAt: time + synced.remainingMs, now: time }
    })
  }, [])

  const reset = useCallback(() => {
    setState((current) =>
      current.config
        ? { ...current, mode: 'Work', isRunning: false, endsAt: null, remainingMs: minutesMs(current.config.focusMinutes) }
        : current,
    )
  }, [])

  const clear = useCallback(() => {
    setSaveState('idle')
    setState((current) => ({ ...idleState, sessionId: current.sessionId + 1 }))
  }, [])

  const { config, mode, isRunning, endsAt, remainingMs, now } = state
  const totalMs = config ? minutesMs(mode === 'Work' ? config.focusMinutes : config.breakMinutes) : 0
  const leftMs = isRunning && endsAt !== null ? Math.max(0, endsAt - now) : remainingMs
  const remainingSeconds = Math.ceil(leftMs / 1000)
  const totalSeconds = Math.round(totalMs / 1000)

  return (
    <TimerContext.Provider
      value={{
        config,
        mode,
        isRunning,
        remainingSeconds,
        totalSeconds,
        hasStarted: remainingSeconds < totalSeconds,
        saveState,
        start,
        toggle,
        reset,
        clear,
      }}
    >
      {children}
    </TimerContext.Provider>
  )
}
