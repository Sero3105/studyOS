import type { HeatCell } from '../../utils/studyStats'
import { formatDay, formatMinutes } from '../../utils/dates'
import { useLanguage } from '../../i18n/useLanguage'

/** Un anno di studio, stile GitHub: colonne = settimane, righe = lun→dom. */
function StudyHeatmap({ weeks }: { weeks: HeatCell[][] }) {
  const { t, locale } = useLanguage()
  const cells = weeks.flat()
  const active = cells.filter((c) => c.minutes > 0).length
  const total = cells.reduce((sum, c) => sum + c.minutes, 0)
  return (
    <figure className="heatmap">
      <div className="heatmap-scroll">
        <div className="heatmap-grid" role="img" aria-label={t('stats.heatmapLabel', { days: active, total: formatMinutes(total) })}>
          {weeks.map((week) => (
            <div className="heatmap-week" key={week[0]?.date}>
              {week.map((cell) => (
                <span
                  key={cell.date}
                  className="heatmap-cell"
                  data-level={cell.level}
                  title={`${formatDay(cell.date, 'long', locale)} · ${cell.minutes ? formatMinutes(cell.minutes) : t('stats.heatmapNone')}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <figcaption className="heatmap-legend">
        <span>{t('stats.heatmapActive', { days: active, total: formatMinutes(total) })}</span>
        <span className="heatmap-scale" aria-hidden="true">
          {t('stats.heatmapLess')}
          {[0, 1, 2, 3, 4].map((level) => <span key={level} className="heatmap-cell" data-level={level} />)}
          {t('stats.heatmapMore')}
        </span>
      </figcaption>
    </figure>
  )
}

export default StudyHeatmap
