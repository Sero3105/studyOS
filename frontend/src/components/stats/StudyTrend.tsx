import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import Section from './Section'
import WeekChart from '../ui/WeekChart'
import SubjectDot from '../ui/SubjectDot'
import type { Subject } from '../../services/subjectService'
import type { StudySession } from '../../services/sessionService'
import type { Task } from '../../services/taskService'
import { formatDay, formatMinutes } from '../../utils/dates'
import { weeklyReview, weeklyTotals } from '../../utils/studyStats'
import { useLanguage } from '../../i18n/useLanguage'

/** Differenza con segno e icona: il colore non è l'unico segnale. */
function Delta({ minutes }: { minutes: number }) {
  const { t } = useLanguage()
  const Icon = minutes > 0 ? TrendingUp : minutes < 0 ? TrendingDown : Minus
  return (
    <span className={cn('inline-flex items-center gap-1 font-mono text-xs tabular-nums [&_svg]:size-3.5', minutes > 0 ? 'text-success' : minutes < 0 ? 'text-destructive' : 'text-muted-foreground')}>
      <Icon aria-hidden="true" />
      {minutes === 0 ? t('stats.trendSame') : `${minutes > 0 ? '+' : '−'}${formatMinutes(Math.abs(minutes))}`}
    </span>
  )
}

/**
 * Andamento: le ultime 12 settimane (questa in evidenza) e, accanto, questa settimana
 * contro la scorsa materia per materia.
 */
function StudyTrend({ sessions, subjects, tasks, today }: { sessions: StudySession[]; subjects: Subject[]; tasks: Task[]; today: string }) {
  const { t, locale } = useLanguage()
  const weeks = weeklyTotals(sessions, today)
  const review = weeklyReview(tasks, sessions, subjects, today)
  // "14/9", una settimana ogni quattro più quella corrente: 12 etichette non stanno in un telefono.
  const shortDate = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'numeric' })
  const hours = (m: number) => `${Math.round(m / 60) || '<1'}h`

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Section id="stats-trend-title" className="lg:col-span-2" title={t('stats.trendTitle')} meta={t('stats.trendMeta', { avg: formatMinutes(Math.round(weeks.reduce((s, w) => s + w.minutes, 0) / weeks.length)) })}>
        <WeekChart daily={weeks} tall valueFor={hours}
          labelFor={(date, last) => (last ? t('stats.thisWeekShort') : weeks.findIndex((w) => w.date === date) % 4 === 0 ? shortDate.format(new Date(`${date}T00:00:00`)) : '')}
          describe={(date) => t('stats.weekOf', { day: formatDay(date, 'long', locale) })} />
      </Section>

      <Section id="stats-vs-title" title={t('stats.vsTitle')}>
        <div className="flex flex-col gap-5">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-3xl font-semibold tracking-tight tabular-nums">{formatMinutes(review.minutes)}</span>
            <Delta minutes={review.minutes - review.previousMinutes} />
          </div>
          {review.bySubject.length > 0 && (
            <ul className="flex flex-col divide-y" aria-label={t('stats.vsBySubject')}>
              {review.bySubject.map((row) => (
                <li key={row.subjectId} className="grid grid-cols-[minmax(0,1fr)_auto_5.5rem] items-center gap-3 py-2 text-sm first:pt-0">
                  <span className="flex min-w-0 items-center gap-2 truncate"><SubjectDot subject={subjects.find((s) => s.id === row.subjectId)} />{row.name}</span>
                  <span className="font-mono text-xs tabular-nums">{formatMinutes(row.minutes)}</span>
                  <Delta minutes={row.minutes - row.previous} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>
    </div>
  )
}

export default StudyTrend
