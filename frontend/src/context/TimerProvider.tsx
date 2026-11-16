import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { TimerContext } from './timerContext'
import type { TimerMode, TimerSaveState } from './timerContext'
import type { StudySessionConfig } from '../components/timer/types'
import { createSession, saveSitting, updateSession } from '../services/sessionService'
import type { CreateSessionPayload, Focus } from '../services/sessionService'
import { ApiError } from '../services/apiClient'
import { useAuth } from './useAuth'
import { todayIso } from '../utils/dates'
import { breakMinutes, elapsedMinutes } from '../utils/pomodoro'
import { timerAlertsEnabled } from '../utils/preferences'
import { notificationsSupported } from '../utils/reminders'
import { CHECKLIST_MAX, DISTRACTION_MAX, ITEM_MAX, fullBlock, interruptionsIn, newSitting, sittingPayload } from '../utils/sitting'
import type { Sitting, SittingPayload } from '../utils/sitting'
import { useLanguage } from '../i18n/useLanguage'

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
 * Ciclo: fine studio → pausa che parte da sola (lunga ogni N blocchi); fine pausa → studio, fermo.
 * A ogni fine fase suona un avviso e, con la finestra non in primo piano, arriva una notifica.
 * Ogni blocco di studio completato viene salvato una sola volta nello storico.
 *
 * La seduta (`sitting`) raccoglie i blocchi fatti di fila: checklist, distrazioni annotate,
 * blocchi con focus e nota, "riparto da qui". Terminandola si può salvare il blocco a metà,
 * poi la pagina Timer ne mostra il riepilogo finché non la si chiude.
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
  sitting: Sitting | null
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
  sitting: null,
}

/** Stato salvato da una versione precedente: `notes` era l'obiettivo e la seduta non esisteva (blocchi già salvati). */
function normalize(state: TimerState): TimerState {
  if (!state.config) return { ...state, sitting: null }
  const legacy = state.config as StudySessionConfig & { notes?: string }
  const config = { ...state.config, goal: state.config.goal ?? legacy.notes ?? '' }
  const sitting = state.sitting ?? { ...newSitting(config, todayIso()), blocks: Array.from({ length: state.completedBlocks }, () => fullBlock(config.focusMinutes)) }
  return { ...state, config, sitting }
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
        endsAt: next.endsAt + minutesMs(breakMinutes(next.config, next.completedBlocks + 1)),
        completedBlocks: next.completedBlocks + 1,
        sitting: next.sitting && { ...next.sitting, blocks: [...next.sitting.blocks, fullBlock(next.config.focusMinutes)] },
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

// localStorage, una chiave per utente: il timer sopravvive a reload e chiusura della scheda
// ed è condiviso tra le schede (pausa in una = pausa in tutte).
// `savedBlocks` conta i blocchi della seduta già inviati al backend.
interface Stored { state: TimerState; savedBlocks: number }

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage non disponibile: resta solo in memoria */ }
}

const RETRY_MS = 60000

/** Due note brevi sintetizzate con Web Audio: nessun file da scaricare. */
function chime() {
  try {
    const ctx = new AudioContext()
    ;[880, 660].forEach((frequency, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const at = ctx.currentTime + i * 0.25
      gain.gain.setValueAtTime(0.2, at)
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.6)
      osc.frequency.value = frequency
      osc.connect(gain).connect(ctx.destination)
      osc.start(at)
      osc.stop(at + 0.6)
    })
    setTimeout(() => void ctx.close(), 1500)
  } catch { /* audio non disponibile o bloccato dal browser */ }
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { t } = useLanguage()
  const key = `studyos.timer.${user?.id ?? 0}`
  const queueKey = `${key}.unsaved`
  const sittingQueueKey = `${key}.sittings`
  const [stored] = useState(() => readJson<Stored>(key))
  // I blocchi finiti mentre la pagina era chiusa vengono contati da `advance` e salvati sotto.
  const [state, setState] = useState<TimerState>(() => (stored ? advance(normalize(stored.state), Date.now()) : idleState))
  const [saveState, setSaveState] = useState<TimerSaveState>('idle')
  // Ultimo blocco salvato da questa scheda e ancora da valutare: id sul server e posizione nella seduta.
  const [lastBlock, setLastBlock] = useState<{ id: number; index: number; sitting: string } | null>(null)
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state }, [state])
  // Blocchi già inviati al backend, per sessione: evita salvataggi doppi (anche dopo un reload).
  const savedRef = useRef(stored ? { sessionId: stored.state.sessionId, blocks: stored.savedBlocks } : { sessionId: 0, blocks: 0 })
  const lastWrittenRef = useRef<string | null>(null)

  // Un solo intervallo, attivo solo mentre il timer corre; serve a ridisegnare
  // e a far scattare i cambi di fase, non a misurare il tempo.
  useEffect(() => {
    if (!state.isRunning) return
    const interval = setInterval(() => setState((current) => advance(current, Date.now())), TICK_MS)
    return () => clearInterval(interval)
  }, [state.isRunning])

  // Un blocco che non si riesce a salvare finisce in coda e viene riprovato dopo.
  const saveBlock = useCallback(async (payload: CreateSessionPayload, index: number) => {
    try {
      const saved = await createSession(payload)
      setSaveState('saved')
      setLastBlock({ id: saved.id, index, sitting: payload.sitting_id ?? '' })
    } catch {
      writeJson(queueKey, [...(readJson<CreateSessionPayload[]>(queueKey) ?? []), payload])
      setSaveState('error')
    }
  }, [queueKey])

  // Seduta: il PUT sostituisce tutto, quindi in coda basta l'ultima versione di ognuna.
  const syncSitting = useCallback(async (uid: string, payload: SittingPayload) => {
    try {
      await saveSitting(uid, payload)
      const queued = readJson<Record<string, SittingPayload>>(sittingQueueKey) ?? {}
      if (uid in queued) { delete queued[uid]; writeJson(sittingQueueKey, queued) }
    } catch (error) {
      // 422: dati non più validi (es. materia eliminata), riprovare non serve. Tutto il resto (anche 401) resta in coda.
      if (error instanceof ApiError && error.status === 422) return
      writeJson(sittingQueueKey, { ...(readJson<Record<string, SittingPayload>>(sittingQueueKey) ?? {}), [uid]: payload })
    }
  }, [sittingQueueKey])

  const retryUnsaved = useCallback(async () => {
    const sittings = readJson<Record<string, SittingPayload>>(sittingQueueKey) ?? {}
    for (const [uid, payload] of Object.entries(sittings)) await syncSitting(uid, payload)
    const queue = readJson<CreateSessionPayload[]>(queueKey) ?? []
    if (!queue.length) return
    // Svuota prima di inviare: le altre schede non riprovano gli stessi blocchi.
    // shortcut: se la scheda si chiude mentre il retry è in corso, i blocchi in volo si perdono; serve un id per blocco lato server per rimediare.
    writeJson(queueKey, [])
    const failed: CreateSessionPayload[] = []
    for (const payload of queue) {
      try { await createSession(payload) } catch { failed.push(payload) }
    }
    if (failed.length) writeJson(queueKey, [...(readJson<CreateSessionPayload[]>(queueKey) ?? []), ...failed])
    setSaveState(failed.length ? 'error' : 'saved')
  }, [queueKey, sittingQueueKey, syncSitting])

  useEffect(() => {
    const retry = () => { void retryUnsaved() }
    const timeout = setTimeout(retry, 0)
    const interval = setInterval(retry, RETRY_MS)
    window.addEventListener('online', retry)
    return () => {
      clearTimeout(timeout)
      clearInterval(interval)
      window.removeEventListener('online', retry)
    }
  }, [retryUnsaved])

  // Salva nello storico ogni blocco della seduta (completo o fermato a metà), poi scrive lo stato per reload e altre schede.
  useEffect(() => {
    const { config, sessionId, sitting } = state
    if (config && sitting) {
      if (savedRef.current.sessionId !== sessionId) savedRef.current = { sessionId, blocks: 0 }
      // Un'altra scheda con lo stesso timer può aver già salvato questo blocco.
      // shortcut: due schede che chiudono il blocco nello stesso millisecondo lo salvano entrambe; raro, serve un lock (navigator.locks) se capita.
      const shared = readJson<Stored>(key)
      if (shared?.state.sessionId === sessionId) savedRef.current.blocks = Math.max(savedRef.current.blocks, shared.savedBlocks)
      const from = savedRef.current.blocks
      if (sitting.blocks.length > from) {
        savedRef.current.blocks = sitting.blocks.length
        sitting.blocks.slice(from).forEach((block, i) => {
          const index = from + i
          void saveBlock({
            subject_id: config.subjectId ?? undefined,
            topic_id: config.topicId ?? undefined,
            duration_minutes: block.minutes,
            studied_on: todayIso(),
            kind: config.kind,
            sitting_id: sitting.id,
            partial: block.partial,
            interruptions: interruptionsIn(sitting, index + 1) || undefined,
          }, index)
        })
      }
    }
    // Senza `now` lo stato cambia solo a ogni azione o cambio di fase: niente scritture a ogni tick.
    const value = JSON.stringify({ state: { ...state, now: 0 }, savedBlocks: savedRef.current.blocks })
    if (value === lastWrittenRef.current) return
    lastWrittenRef.current = value
    try { localStorage.setItem(key, value) } catch { /* storage non disponibile: timer solo in memoria */ }
  }, [state, key, saveBlock])

  // Avviso a fine fase. Non per i cambi recuperati all'apertura (lo stato iniziale) né per un reset:
  // la pausa è finita solo se il tempo ha superato la sua fine.
  // shortcut: con più schede aperte il suono parte in ognuna (la notifica no, ha un tag); serve una scheda "leader" se dà fastidio.
  const previousRef = useRef(state)
  useEffect(() => {
    const previous = previousRef.current
    previousRef.current = state
    if (previous.sessionId !== state.sessionId || !timerAlertsEnabled()) return
    const workEnded = state.completedBlocks > previous.completedBlocks
    const breakEnded = previous.mode === 'Break' && state.mode === 'Work' && previous.endsAt !== null && state.now >= previous.endsAt
    if (!workEnded && !breakEnded) return
    chime()
    if (notificationsSupported() && Notification.permission === 'granted' && !document.hasFocus()) {
      new Notification(t(state.mode === 'Break' ? 'timer.alertWorkDone' : 'timer.alertBreakDone'), { tag: 'studyos-timer', icon: '/favicon.svg' })
    }
  }, [state, t])

  // La seduta finisce sul server appena ha un blocco; ritardo breve per non mandare un PUT a ogni spunta.
  const { config: currentConfig, sitting: currentSitting } = state
  useEffect(() => {
    if (!currentConfig || !currentSitting?.blocks.length) return
    const timeout = setTimeout(() => void syncSitting(currentSitting.id, sittingPayload(currentSitting, currentConfig)), 800)
    return () => clearTimeout(timeout)
  }, [currentConfig, currentSitting, syncSitting])

  // Avvio, pausa o reset fatti in un'altra scheda.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== key) return
      lastWrittenRef.current = event.newValue
      const next = readJson<Stored>(key)
      setState(next ? advance(normalize(next.state), Date.now()) : idleState)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [key])

  /** La seduta che si sta lasciando va sul server subito: il PUT ritardato verrebbe annullato. */
  const flushSitting = useCallback(() => {
    const { config, sitting } = stateRef.current
    if (config && sitting?.blocks.length) void syncSitting(sitting.id, sittingPayload(sitting, config))
  }, [syncSitting])

  const start = useCallback((config: StudySessionConfig) => {
    // Siamo dentro un clic: unico momento in cui il browser lascia chiedere il permesso.
    if (timerAlertsEnabled() && notificationsSupported() && Notification.permission === 'default') void Notification.requestPermission()
    flushSitting()
    setSaveState('idle')
    setLastBlock(null)
    setState((current) => ({
      ...idleState,
      sessionId: current.sessionId + 1,
      config,
      remainingMs: minutesMs(config.focusMinutes),
      now: Date.now(),
      sitting: newSitting(config, todayIso()),
    }))
  }, [flushSitting])

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
    flushSitting()
    setSaveState('idle')
    setLastBlock(null)
    setState((current) => ({ ...idleState, sessionId: current.sessionId + 1 }))
  }, [flushSitting])

  const updateSitting = useCallback((change: (sitting: Sitting) => Sitting) => {
    setState((current) => (current.sitting ? { ...current, sitting: change(current.sitting) } : current))
  }, [])

  const rateBlock = useCallback((focus: Focus | null, note: string) => {
    const block = lastBlock
    setLastBlock(null)
    if (!block) return
    const text = note.trim()
    if (focus === null && !text) return
    updateSitting((s) => (s.id !== block.sitting ? s : {
      ...s, blocks: s.blocks.map((b, i) => (i === block.index ? { ...b, focus: focus ?? b.focus, note: text || b.note } : b)),
    }))
    // Se il salvataggio fallisce si perde solo la valutazione, non il blocco.
    updateSession(block.id, { ...(focus !== null && { focus }), ...(text && { notes: text }) }).catch(() => {})
  }, [lastBlock, updateSitting])

  const { config, mode, isRunning, endsAt, remainingMs, now, completedBlocks, sitting } = state
  const totalMs = config ? minutesMs(mode === 'Work' ? config.focusMinutes : breakMinutes(config, completedBlocks)) : 0
  const leftMs = isRunning && endsAt !== null ? Math.max(0, endsAt - now) : remainingMs
  // Minuti interi già studiati nel blocco in corso: quelli che "Termina" propone di salvare.
  const partialMinutes = config && mode === 'Work' ? elapsedMinutes(config, leftMs) : 0

  const finish = useCallback((savePartial: boolean) => {
    const time = Date.now()
    setState((current) => {
      const synced = advance(current, time)
      const { config, sitting } = synced
      if (!config || !sitting) return current
      const left = synced.isRunning && synced.endsAt !== null ? Math.max(0, synced.endsAt - time) : synced.remainingMs
      const minutes = synced.mode === 'Work' ? elapsedMinutes(config, left) : 0
      const blocks = savePartial && minutes >= 1 ? [...sitting.blocks, { ...fullBlock(minutes), partial: true }] : sitting.blocks
      // Niente da riepilogare: si torna direttamente al modulo.
      if (!blocks.length) return { ...idleState, sessionId: current.sessionId + 1 }
      return { ...synced, isRunning: false, endsAt: null, remainingMs: left, sitting: { ...sitting, blocks, ended: true } }
    })
  }, [])

  const toggleItem = useCallback((index: number) => updateSitting((s) => ({
    ...s, checklist: s.checklist.map((item, i) => (i === index ? { ...item, done: !item.done } : item)),
  })), [updateSitting])

  const addItem = useCallback((text: string) => {
    const value = text.trim().slice(0, ITEM_MAX)
    if (value) updateSitting((s) => (s.checklist.length >= CHECKLIST_MAX ? s : { ...s, checklist: [...s.checklist, { text: value, done: false }] }))
  }, [updateSitting])

  const addDistraction = useCallback((text: string) => {
    const value = text.trim().slice(0, DISTRACTION_MAX)
    if (!value) return
    setState((current) => (current.sitting ? {
      ...current,
      sitting: { ...current.sitting, distractions: [...current.sitting.distractions, { text: value, block: current.completedBlocks + 1 }].slice(-100) },
    } : current))
  }, [])

  const removeDistraction = useCallback((index: number) => updateSitting((s) => ({
    ...s, distractions: s.distractions.filter((_, i) => i !== index),
  })), [updateSitting])

  const setResume = useCallback((resume: string) => updateSitting((s) => ({ ...s, resume })), [updateSitting])
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
        completedBlocks,
        saveState,
        lastBlockId: lastBlock?.id ?? null,
        rateBlock,
        sitting,
        partialMinutes,
        finish,
        toggleItem,
        addItem,
        addDistraction,
        removeDistraction,
        setResume,
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
