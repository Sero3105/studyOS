import { useState } from 'react'
import { EmptyState, ErrorNotice } from '../ui/Feedback'
import Meta from '../ui/Meta'
import MoreLink from '../ui/MoreLink'
import Priority from '../ui/Priority'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Checkbox } from '../ui/checkbox'
import ReviewRating from '../ReviewRating'
import { updateTask } from '../../services/taskService'
import type { ReviewRating as Rating, Task } from '../../services/taskService'
import { daysUntil, relativeDay } from '../../utils/dates'
import { errorMessage } from '../../utils/errors'
import { useLanguage } from '../../i18n/useLanguage'

/**
 * Task aperti in ordine di scadenza, completabili direttamente dalla
 * dashboard: la spunta salva lo stato "Fatto" e toglie il task dall'elenco.
 * Le scadenze passate sono segnate in rosso.
 */
function OpenTasks({ tasks: initialTasks }: { tasks: Task[] }) {
  const { t, locale } = useLanguage()
  const [tasks, setTasks] = useState(initialTasks)
  const [error, setError] = useState('')

  const complete = async (task: Task, rating?: Rating) => {
    setError('')
    try {
      await updateTask(task.id, { status: 'done', review_rating: rating })
      setTasks((current) => current.filter((item) => item.id !== task.id))
    } catch (e) {
      setError(errorMessage(e, t('dashboard.updateTaskError')))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle><h2 id="dash-tasks-title">{t('dashboard.toDo')}</h2></CardTitle>
        <CardAction><MoreLink to="/planner">{t('nav.planner')}</MoreLink></CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error && <ErrorNotice message={error} onDismiss={() => setError('')} />}

        {tasks.length === 0 ? (
          <EmptyState
            compact
            title={t('dashboard.nothingPending')}
            action={<MoreLink to="/planner">{t('dashboard.planTask')}</MoreLink>}
          >
            {t('dashboard.openTasksBody')}
          </EmptyState>
        ) : (
          <ul className="flex flex-col divide-y" aria-labelledby="dash-tasks-title">
            {tasks.map((task) => {
              const overdue = task.due_date !== null && daysUntil(task.due_date) < 0
              return (
                <li className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0" key={task.id}>
                  <Checkbox
                    className="size-5"
                    checked={false}
                    onCheckedChange={() => void complete(task)}
                    aria-label={t('dashboard.markDone', { title: task.title })}
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium">{task.title}</span>
                    <Meta
                      items={[
                        <Priority value={task.priority} />,
                        <span className={overdue ? 'text-destructive' : undefined}>
                          {task.due_date ? relativeDay(task.due_date, locale) : t('dashboard.noDeadline')}
                        </span>,
                      ]}
                    />
                  </span>
                  {task.review_interval !== null && task.due_date !== null && daysUntil(task.due_date) <= 0 && <ReviewRating onRate={(rating) => void complete(task, rating)} />}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export default OpenTasks
