import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ChevronLeft, ChevronRight, GraduationCap } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Segmented from '../components/ui/Segmented'
import { ErrorNotice, LoadingRows } from '../components/ui/Feedback'
import { createTask, getTasks, updateTask } from '../services/taskService'
import type { Task } from '../services/taskService'
import { getExams } from '../services/examService'
import type { Exam } from '../services/examService'
import { getSessions } from '../services/sessionService'
import type { StudySession } from '../services/sessionService'
import { addDays, formatDay, formatMinutes, parseDay, todayIso, weekStart } from '../utils/dates'
import { heatLevel } from '../utils/studyStats'
import { errorMessage } from '../utils/errors'
import { useLanguage } from '../i18n/useLanguage'

type View = 'week' | 'month'

/** Primo giorno del mese della data indicata. */
const monthStart = (iso: string) => `${iso.slice(0, 8)}01`
const addMonths = (iso: string, n: number) => {
  const d = parseDay(monthStart(iso))
  d.setMonth(d.getMonth() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

/**
 * Calendario: settimana (pianificazione giorno per giorno, con task da
 * aggiungere e spuntare) o mese (panoramica di esami, task e studio).
 * Ogni giorno mette accanto il piano (task, esami) e la realtà (minuti studiati).
 */
function CalendarPage() {
  const { t, locale } = useLanguage()
  const today = todayIso()
  const [view, setView] = useState<View>('week')
  const [anchor, setAnchor] = useState(today)
  const [tasks, setTasks] = useState<Task[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async (): Promise<void> => {
    try {
      setError('')
      const [taskList, examList, sessionList] = await Promise.all([getTasks(), getExams(), getSessions()])
      setTasks(taskList); setExams(examList); setSessions(sessionList)
    } catch (e) { setError(errorMessage(e, t('calendar.loadError'))) }
    finally { setLoading(false) }
  }, [t])
  useEffect(() => { queueMicrotask(() => { void load() }) }, [load])

  const start = view === 'week' ? weekStart(anchor) : weekStart(monthStart(anchor))
  const days = Array.from({ length: view === 'week' ? 7 : 42 }, (_, i) => addDays(start, i))
  const weekDays = days.slice(0, 7)

  // Su mobile i giorni sono in colonna: si parte da oggi, non da lunedì.
  useEffect(() => {
    if (!loading && view === 'week' && window.matchMedia('(max-width: 1100px)').matches) {
      document.querySelector('.calendar-day.is-today')?.scrollIntoView({ block: 'start' })
    }
  }, [loading, view, start])

  const minutesOn = (day: string) => sessions.filter((s) => s.studied_on === day).reduce((sum, s) => sum + s.duration_minutes, 0)
  const tasksOn = (day: string) => tasks.filter((x) => x.due_date === day)
  const examsOn = (day: string) => exams.filter((e) => e.exam_date === day)

  const inRange = (iso: string | null) => iso !== null && iso >= weekDays[0] && iso <= weekDays[6]
  const weekTasks = tasks.filter((x) => inRange(x.due_date))
  const summary = [
    { label: t('calendar.summaryStudied'), value: formatMinutes(sessions.filter((s) => inRange(s.studied_on)).reduce((sum, s) => sum + s.duration_minutes, 0)) },
    { label: t('calendar.summaryTasks'), value: `${weekTasks.filter((x) => x.status === 'done').length}/${weekTasks.length}` },
    { label: t('calendar.summaryExams'), value: String(exams.filter((e) => inRange(e.exam_date)).length) },
  ]

  const move = (step: number) => setAnchor(view === 'week' ? addDays(anchor, 7 * step) : addMonths(anchor, step))
  const openWeek = (day: string) => { setAnchor(day); setView('week') }

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

  const title = view === 'week'
    ? t('calendar.weekOf', { from: formatDay(weekDays[0], 'short', locale), to: formatDay(weekDays[6], 'long', locale) })
    : new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(parseDay(monthStart(anchor)))
  const weekdayShort = (day: string) => new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(parseDay(day))

  return (
    <div className="page calendar-page">
      <PageHeader
        title={t('calendar.title')}
        description={title.charAt(0).toUpperCase() + title.slice(1)}
        actions={
          <div className="calendar-nav">
            <Segmented
              label={t('calendar.view')}
              value={view}
              onChange={setView}
              options={[{ value: 'week', label: t('calendar.viewWeek') }, { value: 'month', label: t('calendar.viewMonth') }]}
            />
            <div className="calendar-steps">
              <button className="icon-btn" type="button" onClick={() => move(-1)} aria-label={view === 'week' ? t('calendar.prevWeek') : t('calendar.prevMonth')}><ChevronLeft aria-hidden="true" /></button>
              <button className="btn btn-secondary" type="button" onClick={() => setAnchor(today)}>{t('common.today')}</button>
              <button className="icon-btn" type="button" onClick={() => move(1)} aria-label={view === 'week' ? t('calendar.nextWeek') : t('calendar.nextMonth')}><ChevronRight aria-hidden="true" /></button>
            </div>
          </div>
        }
      />

      {error && <ErrorNotice message={error} onRetry={loading ? undefined : () => void load()} onDismiss={() => setError('')} />}

      {loading ? <LoadingRows label={t('calendar.loading')} /> : view === 'week' ? (
        <>
          <dl className="calendar-summary">
            {summary.map((item) => (
              <div className="panel calendar-stat" key={item.label}>
                <dt>{item.label}</dt>
                <dd className="num">{item.value}</dd>
              </div>
            ))}
          </dl>

          <ol className="calendar-week">
            {weekDays.map((day) => {
              const dayExams = examsOn(day)
              const dayTasks = tasksOn(day)
              const minutes = minutesOn(day)
              const isToday = day === today
              return (
                <li key={day} className={`calendar-day${isToday ? ' is-today' : ''}${day < today ? ' is-past' : ''}`}>
                  <h2 className="calendar-day-head">
                    <span className="calendar-weekday">{weekdayShort(day)}</span>
                    <span className="calendar-date num">{parseDay(day).getDate()}</span>
                    {isToday && <span className="tag tag-accent calendar-today">{t('common.today')}</span>}
                  </h2>

                  <ul className="calendar-items">
                    {dayExams.map((exam) => (
                      <li key={`e${exam.id}`} className="calendar-exam">
                        <GraduationCap aria-hidden="true" />
                        <span>
                          <span className="calendar-exam-title">{exam.title}</span>
                          {exam.exam_time && <span className="calendar-exam-time num">{exam.exam_time.slice(0, 5)}</span>}
                        </span>
                      </li>
                    ))}
                    {dayTasks.map((task) => (
                      <li key={task.id}>
                        <label className={`calendar-task${task.status === 'done' ? ' is-done' : ''}`}>
                          <input className="check" type="checkbox" checked={task.status === 'done'} onChange={() => void toggle(task)} />
                          <span className={`priority priority-${task.priority}`} aria-hidden="true" />
                          <span className="calendar-task-title">{task.title}</span>
                        </label>
                      </li>
                    ))}
                    {dayExams.length === 0 && dayTasks.length === 0 && <li className="calendar-free">{t('calendar.free')}</li>}
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
                  </form>

                  <p className={`calendar-studied${minutes ? ' has-time' : ''}`} data-level={heatLevel(minutes)}>
                    {minutes ? t('calendar.studiedValue', { value: formatMinutes(minutes) }) : t('calendar.notStudied')}
                  </p>
                </li>
              )
            })}
          </ol>
        </>
      ) : (
        <div className="panel calendar-month">
          <div className="calendar-month-head" aria-hidden="true">
            {weekDays.map((day) => <span key={day}>{weekdayShort(day)}</span>)}
          </div>
          <ol className="calendar-month-grid">
            {days.map((day) => {
              const dayExams = examsOn(day)
              const open = tasksOn(day).filter((x) => x.status !== 'done').length
              const minutes = minutesOn(day)
              const outside = day.slice(0, 7) !== monthStart(anchor).slice(0, 7)
              return (
                <li key={day}>
                  <button
                    type="button"
                    className={`calendar-cell${day === today ? ' is-today' : ''}${outside ? ' is-outside' : ''}`}
                    data-level={heatLevel(minutes)}
                    onClick={() => openWeek(day)}
                    aria-label={[
                      formatDay(day, 'full', locale),
                      ...dayExams.map((e) => `${t('calendar.exam')}: ${e.title}`),
                      open ? t('calendar.openTasks', { count: open }) : '',
                      minutes ? t('calendar.studiedValue', { value: formatMinutes(minutes) }) : '',
                    ].filter(Boolean).join(', ')}
                  >
                    <span className="calendar-cell-date num">{parseDay(day).getDate()}</span>
                    {dayExams.slice(0, 2).map((e) => <span key={e.id} className="calendar-cell-exam">{e.title}</span>)}
                    {open > 0 && <span className="calendar-cell-tasks num">{t('calendar.openTasks', { count: open })}</span>}
                    {minutes > 0 && <span className="calendar-cell-minutes num">{formatMinutes(minutes)}</span>}
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </div>
  )
}

export default CalendarPage
