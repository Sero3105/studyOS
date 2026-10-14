import type { DayMinutes } from '../../services/statsService'
import { formatDay, formatMinutes, weekdayShort } from '../../utils/dates'

interface WeekChartProps {
  daily: DayMinutes[]
  tall?: boolean
}

/**
 * Colonne dei minuti studiati negli ultimi giorni.
 *
 * Oggi è l'unica colonna evidenziata con l'accento; i valori sono scritti
 * sopra ogni colonna, così il grafico si legge senza tooltip. L'etichetta
 * accessibile riporta tutti i valori per gli screen reader.
 */
function WeekChart({ daily, tall = false }: WeekChartProps) {
  const max = Math.max(1, ...daily.map((day) => day.minutes))
  const summary = daily
    .map((day) => `${formatDay(day.date, 'full')}: ${formatMinutes(day.minutes)}`)
    .join('; ')

  return (
    <div className={`week-chart${tall ? ' week-chart-tall' : ''}`} role="img" aria-label={summary}>
      {daily.map((day, index) => {
        const isToday = index === daily.length - 1
        return (
          <div className={`week-chart-col${isToday ? ' is-today' : ''}`} key={day.date} aria-hidden="true">
            <span className="week-chart-value num">{day.minutes > 0 ? day.minutes : ''}</span>
            <span className="week-chart-track">
              <span
                className="week-chart-bar"
                style={{ height: day.minutes ? `${Math.max(4, (day.minutes / max) * 100)}%` : '0%' }}
              />
            </span>
            <span className="week-chart-label">{isToday ? 'Oggi' : weekdayShort(day.date)}</span>
          </div>
        )
      })}
    </div>
  )
}

export default WeekChart
