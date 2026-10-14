import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { EmptyState, ErrorNotice } from '../ui/Feedback'
import Meta from '../ui/Meta'
import { updateTask } from '../../services/taskService'
import type { Task } from '../../services/taskService'
import { daysUntil, relativeDay } from '../../utils/dates'
import { errorMessage } from '../../utils/errors'

const priorityLabels = { low: 'Bassa', medium: 'Media', high: 'Alta' }

/**
 * Task aperti in ordine di scadenza, completabili direttamente dalla
 * dashboard: la spunta salva lo stato "Fatto" e toglie il task dall'elenco.
 * Le scadenze passate sono segnate in rosso.
 */
function OpenTasks({ tasks: initialTasks }: { tasks: Task[] }) {
  const [tasks, setTasks] = useState(initialTasks)
  const [error, setError] = useState('')

  const complete = async (task: Task) => {
    setError('')
    try {
      await updateTask(task.id, { status: 'done' })
      setTasks((current) => current.filter((item) => item.id !== task.id))
    } catch (e) {
      setError(errorMessage(e, 'Impossibile aggiornare il task'))
    }
  }

  return (
    <section className="panel" aria-labelledby="dash-tasks-title">
      <div className="panel-head">
        <h2 id="dash-tasks-title" className="panel-title">Da fare</h2>
        <Link className="text-link" to="/planner">
          Planner <ArrowRight aria-hidden="true" />
        </Link>
      </div>

      {error && <ErrorNotice message={error} onDismiss={() => setError('')} />}

      {tasks.length === 0 ? (
        <EmptyState
          compact
          title="Niente in sospeso"
          action={<Link className="text-link" to="/planner">Pianifica un task <ArrowRight aria-hidden="true" /></Link>}
        >
          I task aperti del planner compariranno qui, in ordine di scadenza.
        </EmptyState>
      ) : (
        <ul className="rows">
          {tasks.map((task) => {
            const overdue = task.due_date !== null && daysUntil(task.due_date) < 0
            return (
              <li className="row task-mini" key={task.id}>
                <input
                  className="check"
                  type="checkbox"
                  checked={false}
                  onChange={() => void complete(task)}
                  aria-label={`Segna come fatto: ${task.title}`}
                />
                <span className="row-main">
                  <span className="row-title">{task.title}</span>
                  <Meta
                    items={[
                      <span className={`priority priority-${task.priority}`}>{priorityLabels[task.priority]}</span>,
                      <span className={overdue ? 'text-danger' : undefined}>
                        {task.due_date ? relativeDay(task.due_date) : 'Senza scadenza'}
                      </span>,
                    ]}
                  />
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default OpenTasks
