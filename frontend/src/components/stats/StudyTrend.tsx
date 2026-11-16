import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
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
    <span className={`trend-delta num${minutes > 0 ? ' is-up' : minutes < 0 ? ' is-down' : ''}`}>
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
    <div className="stats-split">
      <section className="panel" aria-labelledby="stats-trend-title">
        <div className="panel-head">
          <h2 id="stats-trend-title" className="panel-title">{t('stats.trendTitle')}</h2>
          <span className="panel-meta">{t('stats.trendMeta', { avg: formatMinutes(Math.round(weeks.reduce((s, w) => s + w.minutes, 0) / weeks.length)) })}</span>
        </div>
        <WeekChart daily={weeks} tall valueFor={hours}
          labelFor={(date, last) => (last ? t('stats.thisWeekShort') : weeks.findIndex((w) => w.date === date) % 4 === 0 ? shortDate.format(new Date(`${date}T00:00:00`)) : '')}
          describe={(date) => t('stats.weekOf', { day: formatDay(date, 'long', locale) })} />
      </section>

      <section className="panel progress-panel" aria-labelledby="stats-vs-title">
        <h2 id="stats-vs-title" className="panel-title">{t('stats.vsTitle')}</h2>
        <div className="trend-total">
          <span className="figure-value num">{formatMinutes(review.minutes)}</span>
          <Delta minutes={review.minutes - review.previousMinutes} />
        </div>
        {review.bySubject.length > 0 && (
          <ul className="trend-subjects" aria-label={t('stats.vsBySubject')}>
            {review.bySubject.map((row) => (
              <li key={row.subjectId}>
                <span className="trend-name"><SubjectDot subject={subjects.find((s) => s.id === row.subjectId)} />{row.name}</span>
                <span className="num">{formatMinutes(row.minutes)}</span>
                <Delta minutes={row.minutes - row.previous} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default StudyTrend
