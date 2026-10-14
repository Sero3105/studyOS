/**
 * Utility per date e durate, condivise da tutte le schermate.
 *
 * Le date dell'API arrivano come stringhe ISO `YYYY-MM-DD`: vengono sempre
 * interpretate a mezzanotte locale, così "oggi" e "domani" coincidono con il
 * calendario dello studente e non con UTC.
 */

const DAY_MS = 86400000

export function parseDay(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00`)
}

export function todayIso(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

/** Giorni da oggi alla data indicata: negativo se è passata. */
export function daysUntil(isoDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((parseDay(isoDate).getTime() - today.getTime()) / DAY_MS)
}

export function relativeDay(isoDate: string): string {
  const days = daysUntil(isoDate)
  if (days === 0) return 'Oggi'
  if (days === 1) return 'Domani'
  if (days === -1) return 'Ieri'
  if (days < 0) return `${-days} giorni fa`
  return `Tra ${days} giorni`
}

export function formatDay(isoDate: string, style: 'short' | 'long' | 'full' = 'short'): string {
  const options: Intl.DateTimeFormatOptions =
    style === 'short'
      ? { day: 'numeric', month: 'short' }
      : style === 'long'
        ? { day: 'numeric', month: 'long', year: 'numeric' }
        : { weekday: 'long', day: 'numeric', month: 'long' }
  const text = new Intl.DateTimeFormat('it-IT', options).format(parseDay(isoDate))
  return style === 'full' ? text.charAt(0).toUpperCase() + text.slice(1) : text
}

export function weekdayShort(isoDate: string): string {
  return new Intl.DateTimeFormat('it-IT', { weekday: 'short' }).format(parseDay(isoDate))
}

export function monthShort(isoDate: string): string {
  return new Intl.DateTimeFormat('it-IT', { month: 'short' }).format(parseDay(isoDate))
}

/** Minuti in forma leggibile: "45 min", "2 h 05", "3 h". */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} h ${String(rest).padStart(2, '0')}` : `${hours} h`
}

/** Classe di urgenza di una scadenza: rossa entro 3 giorni, ambra entro 7. */
export function urgencyClass(days: number): string {
  if (days <= 3) return 'is-urgent'
  if (days <= 7) return 'is-soon'
  return ''
}
