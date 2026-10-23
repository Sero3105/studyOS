import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import { ErrorNotice, LoadingRows } from '../components/ui/Feedback'
import { createTask, getTasks, updateTask } from '../services/taskService'
import type { Task } from '../services/taskService'
import { getExams } from '../services/examService'
import type { Exam } from '../services/examService'
import { getSessions } from '../services/sessionService'
import type { StudySession } from '../services/sessionService'
import { addDays, formatDay, formatMinutes, parseDay, todayIso, weekStart } from '../utils/dates'
import { errorMessage } from '../utils/errors'
import { useLanguage } from '../i18n/useLanguage'

/**
 * Calendario settimanale: per ogni giorno esami, task in scadenza e minuti
 * studiati davvero. Da qui si pianifica la settimana aggiungendo task al
 * giorno scelto.
 */
function CalendarPage() {
  const { t, locale } = useLanguage()
  const today = todayIso()
  const [start, setStart] = useState(() => weekStart(today))
  const [tasks, setTasks] = useState<Task[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async (): Promise<void> => {
    try {
      setError('')
      const [taskList, examList, sessionList] = await Promise.all([getTasks(), getExams(), getSessions()])
      setTasks(taskList); setExams(examList); setSessions(sessionList)
    } catch (e) { setError(errorMessage(e, t('calendar.loadError'))) }
    finally { setLoading(false) }
  }
  useEffect(() => { queueMicrotask(() => { void load() }) }, [])

  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))

  const addTask = async (event: FormEvent, day: string) => {
    event.preventDefault()
    const title = drafts[day]?.trim()
    if (!title) return
    try {
      const created = await createTask({ title, due_date: day, priority: 'medium' })
      setTasks((list) => [...list, created])
      setDrafts((d) => ({ ...d, [day]: '' }))
    } catch (e) { setError(errorMessage(e, t('planner.saveError'))) }
  }

  const toggle = async (task: Task) => {
    try {
      const updated = await updateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' })
      setTasks((list) => list.map((x) => (x.id === task.id ? updated : x)))
    } catch (e) { setError(errorMessage(e, t('planner.updateError'))) }
  }

  return (
    <div className="page calendar-page">
      <PageHeader
        title={t('calendar.title')}
        description={t('calendar.weekOf', { from: formatDay(days[0], 'short', locale), to: formatDay(days[6], 'long', locale) })}
        actions={
          <div className="calendar-nav">
            <button className="icon-btn" type="button" onClick={() => setStart(addDays(start, -7))} aria-label={t('calendar.prevWeek')}><ChevronLeft aria-hidden="true" /></button>
            <button className="btn btn-secondary" type="button" onClick={() => setStart(weekStart(today))}>{t('common.today')}</button>
            <button className="icon-btn" type="button" onClick={() => setStart(addDays(start, 7))} aria-label={t('calendar.nextWeek')}><ChevronRight aria-hidden="true" /></button>
          </div>
        }
      />

      {error && <ErrorNotice message={error} onRetry={loading ? undefined : () => void load()} onDismiss={() => setError('')} />}

      {loading ? <LoadingRows label={t('calendar.loading')} /> : (
        <ol className="calendar-week">
          {days.map((day) => {
            const dayExams = exams.filter((e) => e.exam_date === day)
            const dayTasks = tasks.filter((x) => x.due_date === day)
            const minutes = sessions.filter((s) => s.studied_on === day).reduce((sum, s) => sum + s.duration_minutes, 0)
            const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(parseDay(day))
            return (
              <li key={day} className={`panel calendar-day${day === today ? ' is-today' : ''}${day < today ? ' is-past' : ''}`}>
                <h2 className="calendar-day-head">
                  <span className="calendar-weekday">{weekday}</span>
                  <span className="calendar-date num">{parseDay(day).getDate()}</span>
                  {minutes > 0 && <span className="tag tag-success num" title={t('calendar.studied')}>{formatMinutes(minutes)}</span>}
                </h2>
                <ul className="calendar-items">
                  {dayExams.map((exam) => (
                    <li key={`e${exam.id}`} className="calendar-exam">
                      <span className="tag tag-danger">{t('calendar.exam')}</span> {exam.title}{exam.exam_time && <span className="num"> · {exam.exam_time.slice(0, 5)}</span>}
                    </li>
                  ))}
                  {dayTasks.map((task) => (
                    <li key={task.id}>
                      <label className={`calendar-task${task.status === 'done' ? ' is-done' : ''}`}>
                        <input className="check" type="checkbox" checked={task.status === 'done'} onChange={() => void toggle(task)} />
                        <span className={`priority priority-${task.priority}`} aria-hidden="true" />
                        <span>{task.title}</span>
                      </label>
                    </li>
                  ))}
                </ul>
                <form className="calendar-add" onSubmit={(e) => void addTask(e, day)}>
                  <input
                    className="input"
                    value={drafts[day] ?? ''}
                    onChange={(e) => setDrafts((d) => ({ ...d, [day]: e.target.value }))}
                    maxLength={200}
                    placeholder={t('calendar.addPlaceholder')}
                    aria-label={t('calendar.addFor', { day: formatDay(day, 'full', locale) })}
                  />
                  <button className="icon-btn" type="submit" aria-label={t('common.add')} disabled={!drafts[day]?.trim()}><Plus aria-hidden="true" /></button>
                </form>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

export default CalendarPage
