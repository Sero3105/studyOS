import { Link } from 'react-router-dom'
import { Play } from 'lucide-react'
import ProgressBar from '../ui/ProgressBar'
import type { StatsSummary } from '../../services/statsService'
import { formatMinutes, relativeDay } from '../../utils/dates'

interface TodayOverviewProps {
  stats: StatsSummary
  onStartSession: () => void
}

/**
 * Il primo blocco della dashboard: quanto ho studiato oggi, a che punto è
 * l'obiettivo della settimana e il pulsante per iniziare. Il numero di oggi è
 * l'elemento più grande della schermata; i dati di contorno stanno a lato.
 */
function TodayOverview({ stats, onStartSession }: TodayOverviewProps) {
  const weeklyGoal = stats.goals.find((goal) => goal.kind === 'weekly_minutes') ?? null
  const last = stats.last_session
  const hours = Math.floor(stats.today_minutes / 60)
  const minutes = stats.today_minutes % 60

  return (
    <section className="panel today" aria-labelledby="today-title">
      <div className="today-main">
        <h2 id="today-title" className="today-label">Studiato oggi</h2>
        <p className="today-value num">
          {hours > 0 && <>{hours}<span className="today-unit">h</span> </>}
          {hours > 0 ? String(minutes).padStart(2, '0') : minutes}
          <span className="today-unit">min</span>
        </p>

        {weeklyGoal ? (
          <div className="today-goal">
            <div className="today-goal-line">
              <span>{weeklyGoal.title}</span>
              <span className="num">
                {formatMinutes(weeklyGoal.current)} di {formatMinutes(weeklyGoal.target)}
              </span>
            </div>
            <ProgressBar percent={weeklyGoal.percent} label={`${weeklyGoal.title}: ${weeklyGoal.percent}%`} />
          </div>
        ) : (
          <p className="today-hint">
            Nessun obiettivo settimanale. <Link className="text-link" to="/goals">Impostane uno</Link>
          </p>
        )}

        <div className="today-actions">
          <button className="btn btn-primary btn-lg" type="button" onClick={onStartSession}>
            <Play aria-hidden="true" />
            {stats.sessions_count === 0 ? 'Inizia la prima sessione' : 'Inizia una sessione'}
          </button>
          {last && (
            <p className="today-last">
              Ultima: {last.subject ?? 'Sessione libera'}
              {last.topic ? ` / ${last.topic}` : ''} · {formatMinutes(last.duration_minutes)} ·{' '}
              {relativeDay(last.studied_on).toLowerCase()}
            </p>
          )}
        </div>
      </div>

      <dl className="today-figures">
        <div>
          <dt>Questa settimana</dt>
          <dd className="num">{formatMinutes(stats.week_minutes)}</dd>
        </div>
        <div>
          <dt>Giorni di fila</dt>
          <dd className="num">{stats.streak_days}</dd>
        </div>
        <div>
          <dt>Task completati</dt>
          <dd className="num">
            {stats.tasks_done}
            <span className="today-figure-total">/{stats.tasks_total}</span>
          </dd>
        </div>
      </dl>
    </section>
  )
}

export default TodayOverview
