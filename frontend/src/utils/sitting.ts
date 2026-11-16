import type { StudySessionConfig } from '../components/timer/types'
import type { Focus } from '../services/sessionService'

/**
 * Seduta al timer: tutti i blocchi fatti di fila su un obiettivo, con la checklist,
 * le distrazioni annotate e la riga "riparto da qui". Vive nello stato del timer
 * (localStorage) e viene copiata sul server con `PUT /sittings/{id}`.
 */
export interface ChecklistItem { text: string; done: boolean }
/** `block` è il blocco (da 1) durante il quale è stata annotata. */
export interface Distraction { text: string; block: number }
export interface SittingBlock { minutes: number; partial: boolean; focus: Focus | null; note: string }
export interface Sitting {
  id: string
  startedOn: string
  checklist: ChecklistItem[]
  distractions: Distraction[]
  blocks: SittingBlock[]
  resume: string
  /** Terminata: la pagina Timer mostra il riepilogo invece del quadrante. */
  ended: boolean
}

export interface SittingPayload {
  subject_id: number | null; topic_id: number | null; started_on: string; goal: string | null
  checklist: ChecklistItem[]; distractions: Distraction[]; resume_note: string | null
}

export interface SavedSitting extends SittingPayload { id: number; uid: string; created_at: string; updated_at: string }

// Gli stessi limiti del backend (schemas/session_schemas.py).
export const CHECKLIST_MAX = 50
export const ITEM_MAX = 200
export const DISTRACTION_MAX = 300

/** Id scelto dal browser; `crypto.randomUUID` manca fuori da https, questo basta per le sedute di un utente. */
export function sittingId(now = Date.now()): string {
  return `${now.toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** Una voce per riga; righe vuote scartate, voci troppo lunghe tagliate. */
export function parseChecklist(text: string): string[] {
  return text.split('\n').map((line) => line.trim().slice(0, ITEM_MAX)).filter(Boolean).slice(0, CHECKLIST_MAX)
}

export function newSitting(config: StudySessionConfig, startedOn: string, id = sittingId()): Sitting {
  return {
    id, startedOn,
    checklist: (config.checklist ?? []).map((text) => ({ text, done: false })),
    distractions: [], blocks: [], resume: '', ended: false,
  }
}

export const fullBlock = (minutes: number): SittingBlock => ({ minutes, partial: false, focus: null, note: '' })

export function interruptionsIn(sitting: Sitting, block: number): number {
  return sitting.distractions.filter((d) => d.block === block).length
}

export function sittingSummary(sitting: Sitting) {
  const rated = sitting.blocks.filter((b) => b.focus !== null)
  return {
    minutes: sitting.blocks.reduce((sum, b) => sum + b.minutes, 0),
    blocks: sitting.blocks.length,
    partial: sitting.blocks.filter((b) => b.partial).length,
    focus: rated.length ? rated.reduce((sum, b) => sum + (b.focus ?? 0), 0) / rated.length : null,
    done: sitting.checklist.filter((i) => i.done).length,
    total: sitting.checklist.length,
  }
}

export function sittingPayload(sitting: Sitting, config: StudySessionConfig): SittingPayload {
  return {
    subject_id: config.subjectId, topic_id: config.topicId, started_on: sitting.startedOn,
    goal: config.goal?.trim() || null, checklist: sitting.checklist, distractions: sitting.distractions,
    resume_note: sitting.resume.trim() || null,
  }
}

/**
 * "Riparto da qui" dell'ultima seduta sullo stesso argomento; senza argomento, l'ultima della
 * stessa materia. Sessione libera: niente, non c'è un filo da riprendere.
 */
export function lastResume(sittings: SavedSitting[], config: Pick<StudySessionConfig, 'subjectId' | 'topicId'>, currentId?: string): SavedSitting | null {
  if (config.subjectId === null && config.topicId === null) return null
  return sittings
    .filter((s) => s.uid !== currentId && s.resume_note
      && (config.topicId !== null ? s.topic_id === config.topicId : s.subject_id === config.subjectId))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0] ?? null
}
