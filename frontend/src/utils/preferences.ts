import { apiRequest } from '../services/apiClient'
import { getTheme, setTheme } from './theme'
import type { Theme } from './theme'

/**
 * Preferenze dell'interfaccia. Il valore buono sta sul server (`/settings`: segue l'utente su ogni
 * browser e finisce nel backup); il localStorage è la cache letta in modo sincrono dai componenti.
 */
type Value = boolean | number | number[] | string | string[]
const KEYS = {
  reviews: 'studyos.reviews',
  timerAlerts: 'studyos.timerAlerts',
  degreeCfu: 'studyos.degreeCfu',
  restDays: 'studyos.restDays',
  planPrefs: 'studyos.planPrefs',
  planDaysOff: 'studyos.planDaysOff',
  planWeekdays: 'studyos.planWeekdays',
} as const
type Name = keyof typeof KEYS | 'theme'

function read(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

function write(key: string, value: string): void {
  try { localStorage.setItem(key, value) } catch { /* storage bloccato: resta il default */ }
}

const encode = (value: Value) => (typeof value === 'boolean' ? (value ? '1' : '0') : Array.isArray(value) ? value.join(',') : String(value))

/** Salva in locale e, senza aspettare, sul server: un errore di rete non blocca l'interfaccia. */
function save(name: Name, value: Value): void {
  if (name !== 'theme') write(KEYS[name], encode(value))
  apiRequest('/settings', { method: 'PATCH', body: JSON.stringify({ [name]: value }) }).catch(() => {})
}

/** Ripassi automatici al completamento di un argomento: attivi salvo scelta contraria. */
export const reviewsEnabled = (): boolean => read(KEYS.reviews) !== '0'
export const setReviewsEnabled = (enabled: boolean): void => save('reviews', enabled)

/** Suono (e notifica, se permessa) a fine blocco e a fine pausa: attivi salvo scelta contraria. */
export const timerAlertsEnabled = (): boolean => read(KEYS.timerAlerts) !== '0'
export const setTimerAlertsEnabled = (enabled: boolean): void => save('timerAlerts', enabled)

/** CFU totali del corso: triennale, magistrale, ciclo unico da 5 o 6 anni. */
export const DEGREE_CFU_OPTIONS = [180, 120, 300, 360] as const
export const degreeCfu = (): number => Number(read(KEYS.degreeCfu)) || DEGREE_CFU_OPTIONS[0]
export const setDegreeCfu = (cfu: number): void => save('degreeCfu', cfu)

/** Giorni della settimana senza studio nel piano d'esame (1 = lunedì ... 7 = domenica). */
export const restDays = (): number[] => (read(KEYS.restDays) ?? '').split(',').map(Number).filter((d) => d >= 1 && d <= 7)
export const setRestDays = (days: number[]): void => save('restDays', days)

/**
 * Preferenze del piano d'esame scelte dallo studente (l'algoritmo si adatta a queste).
 * Le scelte in una stringa JSON corta, i giorni liberi a parte come lista di date (il server limita le stringhe a 200 caratteri).
 */
export interface PlanPrefs {
  daysOff: string[]
  limitUnit: 'auto' | 'tasks' | 'hours'
  limitValue: number
  reviews: 'light' | 'standard' | 'intense'
  finalDays: number // 0 = automatico
  restBeforeExam: boolean
  order: 'course' | 'hardest'
  studyMinutes: 25 | 50 | 90
  weekdayLimits: (number | null)[] // lunedì..domenica, stessa unità del limite; null = come il limite
  adapt: boolean // adatta durate e date allo storico
  focusDays: number // giorni prima di ogni esame riservati a quella materia
}
const NO_WEEKDAY_LIMITS = [null, null, null, null, null, null, null]
export const PLAN_DEFAULTS: PlanPrefs = { daysOff: [], limitUnit: 'auto', limitValue: 4, reviews: 'standard', finalDays: 0, restBeforeExam: false, order: 'course', studyMinutes: 50, weekdayLimits: NO_WEEKDAY_LIMITS, adapt: true, focusDays: 3 }
export function planPrefs(): PlanPrefs {
  const daysOff = (read(KEYS.planDaysOff) ?? '').split(',').filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
  const stored = (read(KEYS.planWeekdays) ?? '').split(',').map((v) => Number(v) > 0 ? Number(v) : null)
  const weekdayLimits = stored.length === 7 ? stored : NO_WEEKDAY_LIMITS
  try { return { ...PLAN_DEFAULTS, ...JSON.parse(read(KEYS.planPrefs) ?? '{}'), daysOff, weekdayLimits } } catch { return { ...PLAN_DEFAULTS, daysOff, weekdayLimits } }
}
export function setPlanPrefs({ daysOff, weekdayLimits, ...rest }: PlanPrefs): void {
  save('planPrefs', JSON.stringify(rest))
  save('planDaysOff', daysOff)
  // Stringa "2,,,,,4,": il server accetta liste solo di interi, i limiti in ore possono essere 1,5.
  save('planWeekdays', weekdayLimits.map((v) => v ?? '').join(','))
}

/** Tema: lo applica `utils/theme`, qui solo il salvataggio sul server. */
export function chooseTheme(theme: Theme): void {
  setTheme(theme)
  save('theme', theme)
}

/**
 * All'avvio: il server vince sulla cache locale. Se il server è ancora vuoto (primo avvio dopo
 * l'aggiornamento) ci si copiano le preferenze di questo browser, così nessuno perde le sue scelte.
 * shortcut: le pagine già aperte rileggono i valori solo quando si rimontano; basta finché la sync parte all'avvio.
 */
export async function syncPreferences(): Promise<void> {
  const server = await apiRequest<Partial<Record<Name, Value>>>('/settings')
  if (Object.keys(server).length === 0) {
    const local: Partial<Record<Name, Value>> = { reviews: reviewsEnabled(), timerAlerts: timerAlertsEnabled(), degreeCfu: degreeCfu(), restDays: restDays(), theme: getTheme() }
    await apiRequest('/settings', { method: 'PATCH', body: JSON.stringify(local) })
    return
  }
  for (const name of Object.keys(KEYS) as (keyof typeof KEYS)[]) {
    if (server[name] !== undefined) write(KEYS[name], encode(server[name]))
  }
  if (server.theme === 'dark' || server.theme === 'light' || server.theme === 'system') setTheme(server.theme)
}
