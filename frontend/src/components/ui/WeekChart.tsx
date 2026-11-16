import type { DayMinutes } from '../../services/statsService'
import { formatDay, formatMinutes, weekdayShort } from '../../utils/dates'
import { useLanguage } from '../../i18n/useLanguage'

interface WeekChartProps {
  daily: DayMinutes[]
  tall?: boolean
  /** Per colonne che non sono giorni (es. settimane): etichetta sotto, valore sopra, descrizione per screen reader. */
  labelFor?: (date: string, isLast: boolean) => string
  valueFor?: (minutes: number) => string
  describe?: (date: string) => string
}

/**
 * Colonne dei minuti studiati negli ultimi giorni.
 *
 * Oggi è l'unica colonna evidenziata con l'accento; i valori sono scritti
 * sopra ogni colonna, così il grafico si legge senza tooltip. L'etichetta
 * accessibile riporta tutti i valori per gli screen reader.
 */
function WeekChart({ daily, tall = false, labelFor, valueFor, describe }: WeekChartProps) {
  const { t, locale } = useLanguage()
  const max = Math.max(1, ...daily.map((day) => day.minutes))
  const text = (day: DayMinutes) => `${describe ? describe(day.date) : formatDay(day.date, 'full', locale)}: ${formatMinutes(day.minutes)}`
  const summary = daily.map(text).join('; ')

  return (
    <div className={`week-chart${tall ? ' week-chart-tall' : ''}`} role="img" aria-label={summary}
      style={{ gridTemplateColumns: `repeat(${daily.length}, minmax(0, 1fr))` }}>
      {daily.map((day, index) => {
        const isToday = index === daily.length - 1
        return (
          <div className={`week-chart-col${isToday ? ' is-today' : ''}`} key={day.date} aria-hidden="true" title={text(day)}>
            <span className="week-chart-value num">{day.minutes > 0 ? (valueFor ? valueFor(day.minutes) : day.minutes) : ''}</span>
            <span className="week-chart-track">
              <span
                className="week-chart-bar"
                style={{ height: day.minutes ? `${Math.max(4, (day.minutes / max) * 100)}%` : '0%' }}
              />
            </span>
            <span className="week-chart-label">{labelFor ? labelFor(day.date, isToday) : isToday ? t('common.today') : weekdayShort(day.date, locale)}</span>
          </div>
        )
      })}
    </div>
  )
}

export default WeekChart
