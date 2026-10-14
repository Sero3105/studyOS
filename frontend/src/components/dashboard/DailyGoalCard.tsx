import { Target } from 'lucide-react'
import { Link } from 'react-router-dom'
import DashboardCardHeading from './DashboardCardHeading'
import type { Goal } from '../../services/goalService'

function DailyGoalCard({ todayMinutes, goal }: { todayMinutes: number; goal: Goal | null }) {
  return (
    <article className="dashboard-card goal-card">
      <DashboardCardHeading icon={<Target />} eyebrow="Obiettivo" title="Obiettivo settimanale" />
      {goal ? (
        <div className="goal-empty">
          <div className="progress-track" role="progressbar" aria-valuenow={goal.percent} aria-valuemin={0} aria-valuemax={100} aria-label={goal.title}>
            <span style={{ width: `${goal.percent}%` }} />
          </div>
          <div className="goal-values">
            <span>Questa settimana <strong>{goal.current} / {goal.target} min</strong></span>
            <span>Oggi <strong>{todayMinutes} min</strong></span>
          </div>
          <p className="muted-note">{goal.title}: {goal.percent}% completato.</p>
        </div>
      ) : (
        <div className="goal-empty">
          <div className="goal-values">
            <span>Tempo studiato oggi <strong>{todayMinutes} min</strong></span>
            <span>Obiettivo <strong>Da configurare</strong></span>
          </div>
          <Link className="text-action" to="/goals">Crea un obiettivo</Link>
        </div>
      )}
    </article>
  )
}

export default DailyGoalCard
