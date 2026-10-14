import { Play, Timer } from 'lucide-react'
import { Link } from 'react-router-dom'
import DashboardCardHeading from './DashboardCardHeading'
import type { Goal } from '../../services/goalService'
import type { LastSession } from '../../services/statsService'

interface TodayFocusCardProps {
  todayMinutes: number
  goal: Goal | null
  lastSession: LastSession | null
}

function TodayFocusCard({ todayMinutes, goal, lastSession }: TodayFocusCardProps) {
  return (
    <article className="dashboard-card today-card">
      <DashboardCardHeading icon={<Timer />} eyebrow="Oggi" title="Focus di oggi" />
      <div className="today-main">
        <strong className="today-value">{todayMinutes}<span> min</span></strong>
        {goal ? (
          <div className="today-goal">
            <div className="progress-track" role="progressbar" aria-valuenow={goal.percent} aria-valuemin={0} aria-valuemax={100} aria-label={goal.title}>
              <span style={{ width: `${goal.percent}%` }} />
            </div>
            <p className="muted-note">{goal.title}: {goal.current}/{goal.target} min questa settimana ({goal.percent}%).</p>
          </div>
        ) : (
          <p className="muted-note">Nessun obiettivo settimanale. <Link className="text-action" to="/goals">Crea un obiettivo</Link></p>
        )}
      </div>
      {lastSession && (
        <p className="muted-note">
          Ultima sessione: {lastSession.subject ?? 'Sessione libera'}{lastSession.topic ? ` / ${lastSession.topic}` : ''} · {lastSession.duration_minutes} min · {lastSession.studied_on}
        </p>
      )}
      <Link className="primary-action today-cta" to="/timer">
        <Play size={16} aria-hidden="true" /> {lastSession ? 'Riprendi a studiare' : 'Inizia una sessione'}
      </Link>
    </article>
  )
}

export default TodayFocusCard
