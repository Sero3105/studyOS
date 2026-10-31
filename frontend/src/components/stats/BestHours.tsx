import { addDays, formatMinutes, weekdayShort } from '../../utils/dates'
import { useLanguage } from '../../i18n/useLanguage'

const MONDAY = '2026-11-02'
const hourLabel = (h: number) => `${String(h).padStart(2, '0')}:00`

/** Quando studi: ore del giorno × giorni della settimana; più scuro = più minuti. */
function BestHours({ grid }: { grid: number[][] }) {
  const { t, locale } = useLanguage()
  const max = Math.max(0, ...grid.flat())
  const byHour = Array.from({ length: 24 }, (_, h) => grid.reduce((sum, day) => sum + day[h], 0))
  const byDay = grid.map((day) => day.reduce((a, b) => a + b, 0))
  const bestHour = byHour.indexOf(Math.max(...byHour))
  const bestDay = byDay.indexOf(Math.max(...byDay))
  const dayName = (d: number) => weekdayShort(addDays(MONDAY, d), locale)
  const level = (m: number) => (m <= 0 ? 0 : Math.ceil((m / max) * 4))

  if (max === 0) return <p className="panel-meta">{t('stats.bestHoursEmpty')}</p>
  return (
    <figure className="best-hours">
      <figcaption className="panel-meta">
        {t('stats.bestHoursSummary', { hour: `${hourLabel(bestHour)}–${hourLabel((bestHour + 1) % 24)}`, day: new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(new Date(`${addDays(MONDAY, bestDay)}T00:00:00`)) })}
      </figcaption>
      <div className="heatmap-scroll">
        <div className="best-hours-grid" role="img" aria-label={t('stats.bestHoursLabel', { hour: hourLabel(bestHour), total: formatMinutes(byHour[bestHour]) })}>
          <span />
          {byHour.map((_, h) => <span key={h} className="best-hours-hour">{h % 3 === 0 ? h : ''}</span>)}
          {grid.map((day, d) => [
            <span key={`d${d}`} className="best-hours-day">{dayName(d)}</span>,
            ...day.map((m, h) => (
              <span key={`${d}-${h}`} className="heatmap-cell" data-level={level(m)} title={`${dayName(d)} ${hourLabel(h)} · ${m ? formatMinutes(m) : t('stats.heatmapNone')}`} />
            )),
          ])}
        </div>
      </div>
    </figure>
  )
}

export default BestHours
