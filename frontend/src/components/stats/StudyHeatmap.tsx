import { cn } from '@/lib/utils'
import type { HeatCell } from '../../utils/studyStats'
import { HEAT } from '../../utils/studyStats'
import { formatDay, formatMinutes } from '../../utils/dates'
import { useLanguage } from '../../i18n/useLanguage'

const cellClass = (level: number) => cn('size-3 rounded-[3px]', HEAT[level] || 'bg-muted')

/** Un anno di studio, stile GitHub: colonne = settimane, righe = lun→dom. */
function StudyHeatmap({ weeks }: { weeks: HeatCell[][] }) {
  const { t, locale } = useLanguage()
  const cells = weeks.flat()
  const active = cells.filter((c) => c.minutes > 0).length
  const total = cells.reduce((sum, c) => sum + c.minutes, 0)
  return (
    <figure className="flex flex-col gap-3">
      <div className="overflow-x-auto pb-1">
        <div className="flex w-max gap-1" role="img" aria-label={t('stats.heatmapLabel', { days: active, total: formatMinutes(total) })}>
          {weeks.map((week) => (
            <div className="flex flex-col gap-1" key={week[0]?.date}>
              {week.map((cell) => (
                <span
                  key={cell.date}
                  className={cellClass(cell.level)}
                  title={`${formatDay(cell.date, 'long', locale)} · ${cell.minutes ? formatMinutes(cell.minutes) : t('stats.heatmapNone')}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{t('stats.heatmapActive', { days: active, total: formatMinutes(total) })}</span>
        <span className="flex items-center gap-1" aria-hidden="true">
          {t('stats.heatmapLess')}
          {[0, 1, 2, 3, 4].map((level) => <span key={level} className={cellClass(level)} />)}
          {t('stats.heatmapMore')}
        </span>
      </figcaption>
    </figure>
  )
}

export default StudyHeatmap
