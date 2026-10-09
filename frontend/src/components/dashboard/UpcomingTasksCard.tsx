import { ArrowRight, CalendarClock, ListTodo } from 'lucide-react'
import { Link } from 'react-router-dom'
import DashboardCardHeading from './DashboardCardHeading'

function UpcomingTasksCard() {
  return (
    <article className="dashboard-card tasks-card">
      <DashboardCardHeading
        icon={<ListTodo />}
        eyebrow="Planner"
        title="Prossime attività"
      />
      <div className="empty-card-state compact">
        <span className="empty-state-icon">
          <CalendarClock aria-hidden="true" />
        </span>
        <h3>Nessuna attività da mostrare</h3>
        <p>Le attività pianificate appariranno qui.</p>
      </div>
      {/* TODO: Recuperare le attività dal servizio del Planner quando
          sarà disponibile e collegare il completamento all'azione esistente. */}
      <Link className="text-action" to="/planner">
        Apri Planner <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </article>
  )
}

export default UpcomingTasksCard
