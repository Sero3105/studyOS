import { ArrowRight, CalendarClock, ListTodo } from 'lucide-react'
import { Link } from 'react-router-dom'
import DashboardCardHeading from './DashboardCardHeading'
import type { Task } from '../../services/taskService'

function UpcomingTasksCard({ tasks }: { tasks: Task[] }) {
  return (
    <article className="dashboard-card tasks-card">
      <DashboardCardHeading icon={<ListTodo />} eyebrow="Planner" title="Prossime attività" />
      {tasks.length === 0 ? (
        <div className="empty-card-state compact">
          <span className="empty-state-icon"><CalendarClock aria-hidden="true" /></span>
          <h3>Nessuna attività da mostrare</h3>
          <p>Le attività pianificate appariranno qui.</p>
        </div>
      ) : (
        <ul className="topic-list">
          {tasks.map((task) => (
            <li key={task.id}><span>{task.title}</span><span>{task.due_date ?? 'Senza scadenza'}</span></li>
          ))}
        </ul>
      )}
      <Link className="text-action" to="/planner">
        Apri Planner <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </article>
  )
}

export default UpcomingTasksCard
