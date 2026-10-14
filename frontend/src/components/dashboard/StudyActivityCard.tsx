import { BarChart3 } from 'lucide-react'
import DashboardCardHeading from './DashboardCardHeading'
import type { DayMinutes } from '../../services/statsService'

function StudyActivityCard({ daily }: { daily: DayMinutes[] }) {
  const max = Math.max(1, ...daily.map((d) => d.minutes))
  const total = daily.reduce((sum, d) => sum + d.minutes, 0)
  return (
    <article className="dashboard-card activity-card">
      <DashboardCardHeading icon={<BarChart3 />} eyebrow="Attività recente" title="Study activity" />
      {total === 0 ? (
        <div className="activity-empty">
          <BarChart3 size={34} strokeWidth={1.5} aria-hidden="true" />
          <h3>Ancora nessuna attività</h3>
          <p>Il riepilogo degli ultimi sette giorni apparirà qui.</p>
        </div>
      ) : (
        <div className="activity-bars" role="img" aria-label="Minuti di studio degli ultimi sette giorni">
          {daily.map((day) => (
            <div className="activity-bar" key={day.date} title={`${day.date}: ${day.minutes} min`}>
              <span style={{ height: day.minutes ? `${Math.max(6, (day.minutes / max) * 100)}%` : '0%' }} />
              <small>{day.date.slice(5)}</small>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}

export default StudyActivityCard
