import { useCallback, useEffect, useState } from 'react'
import type { DragEvent, FormEvent } from 'react'
import { ChevronLeft, ChevronRight, Clock3, GraduationCap, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import PageHeader from '../components/ui/PageHeader'
import Figures from '../components/ui/Figures'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Checkbox } from '../components/ui/checkbox'
import { Input } from '../components/ui/input'
import Segmented from '../components/ui/Segmented'
import { ErrorNotice, LoadingRows } from '../components/ui/Feedback'
import { createTask, getTasks, updateTask } from '../services/taskService'
import type { Task } from '../services/taskService'
import { getExams } from '../services/examService'
import type { Exam } from '../services/examService'
import { getSessions } from '../services/sessionService'
import type { StudySession } from '../services/sessionService'
import { getSubjects, subjectColor } from '../services/subjectService'
import type { Subject } from '../services/subjectService'
import SubjectDot from '../components/ui/SubjectDot'
import BlockEditor from '../components/calendar/BlockEditor'
import Modal from '../components/ui/Modal'
import { addDays, formatDay, formatMinutes, parseDay, todayIso, weekStart } from '../utils/dates'
import { HEAT, heatLevel } from '../utils/studyStats'
import { errorMessage } from '../utils/errors'
import { useLanguage } from '../i18n/useLanguage'

type View = 'week' | 'month'

/** "09:30:00" + 90 → "11:00". */
function endTime(start: string, minutes: number): string {
  const total = Number(start.slice(0, 2)) * 60 + Number(start.slice(3, 5)) + minutes
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

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
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  // Time blocking: task in modifica (giorno/ora/durata) e task che si sta trascinando.
  const [editing, setEditing] = useState<number | null>(null)
  const [dragId, setDragId] = useState<number | null>(null)
  const [dropDay, setDropDay] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async (): Promise<void> => {
    try {
      setError('')
      const [taskList, examList, sessionList] = await Promise.all([getTasks(), getExams(), getSessions()])
      setTasks(taskList); setExams(examList); setSessions(sessionList)
      // Solo per i colori delle materie: senza, il calendario funziona lo stesso.
      getSubjects().then(setSubjects).catch(() => setSubjects([]))
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
  // Prima i blocchi orari in ordine di ora, poi i task senza orario.
  const tasksOn = (day: string) => tasks.filter((x) => x.due_date === day)
    .sort((a, b) => (a.scheduled_time ?? '99').localeCompare(b.scheduled_time ?? '99') || a.id - b.id)
  const unplanned = tasks.filter((x) => x.status !== 'done' && x.due_date === null)
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
      // Un task ricorrente completato crea il successivo sul backend: si ricarica la lista.
      if (updated.status === 'done' && task.recurrence) setTasks(await getTasks())
      else setTasks((list) => list.map((x) => (x.id === task.id ? updated : x)))
    } catch (e) { setError(errorMessage(e, t('planner.updateError'))) }
  }

  const schedule = async (task: Task, patch: Partial<Task>) => {
    try {
      const updated = await updateTask(task.id, patch)
      setTasks((list) => list.map((x) => (x.id === task.id ? updated : x)))
      setEditing(null)
    } catch (e) { setError(errorMessage(e, t('planner.updateError'))) }
  }

  const drop = (day: string) => {
    const task = tasks.find((x) => x.id === dragId)
    setDragId(null); setDropDay(null)
    if (task && task.due_date !== day) void schedule(task, { due_date: day })
  }

  const dragProps = (task: Task) => ({
    draggable: true,
    onDragStart: (e: DragEvent) => { e.dataTransfer.effectAllowed = 'move'; setDragId(task.id) },
    onDragEnd: () => { setDragId(null); setDropDay(null) },
  })

  const renderTask = (task: Task) => {
    const subject = subjects.find((x) => x.id === task.subject_id)
    const done = task.status === 'done'
    return (
      <li key={task.id}
        style={subject ? { borderLeftColor: `var(--subject-${subjectColor(subject)})` } : undefined}
        className={cn(
          'group/item flex cursor-grab items-start gap-1 rounded-md border border-l-2 bg-card px-2 py-1.5 text-xs active:cursor-grabbing',
          task.scheduled_time && 'bg-primary/5',
          dragId === task.id && 'opacity-40',
        )}
        {...dragProps(task)}>
        <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
          <Checkbox className="mt-px" checked={done} onCheckedChange={() => void toggle(task)} />
          <span className="flex min-w-0 flex-col gap-0.5">
            {task.scheduled_time && (
              <span className="font-mono text-[0.6875rem] text-primary tabular-nums">{task.scheduled_time.slice(0, 5)}–{endTime(task.scheduled_time, task.planned_minutes ?? 50)}</span>
            )}
            <span className={cn('leading-snug font-medium break-words', done && 'text-muted-foreground line-through')}>{task.title}</span>
            {subject && <span className="truncate text-muted-foreground">{subject.name}</span>}
          </span>
        </label>
        {!done && (
          <Button variant="ghost" size="icon-xs" className="text-muted-foreground md:opacity-0 md:group-hover/item:opacity-100 md:focus-visible:opacity-100" onClick={() => setEditing(editing === task.id ? null : task.id)}
            aria-expanded={editing === task.id} aria-label={t('calendar.blockEdit', { title: task.title })} title={t('calendar.blockEditTitle')}>
            <Clock3 aria-hidden="true" />
          </Button>
        )}
      </li>
    )
  }

  const editingTask = tasks.find((x) => x.id === editing)

  const title = view === 'week'
    ? t('calendar.weekOf', { from: formatDay(weekDays[0], 'short', locale), to: formatDay(weekDays[6], 'long', locale) })
    : new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(parseDay(monthStart(anchor)))
  const weekdayShort = (day: string) => new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(parseDay(day))

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={t('calendar.title')}
        description={title.charAt(0).toUpperCase() + title.slice(1)}
        actions={
          <>
            <Segmented
              label={t('calendar.view')}
              value={view}
              onChange={setView}
              options={[{ value: 'week', label: t('calendar.viewWeek') }, { value: 'month', label: t('calendar.viewMonth') }]}
            />
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => move(-1)} aria-label={view === 'week' ? t('calendar.prevWeek') : t('calendar.prevMonth')}><ChevronLeft aria-hidden="true" /></Button>
              <Button variant="outline" onClick={() => setAnchor(today)}>{t('common.today')}</Button>
              <Button variant="ghost" size="icon" onClick={() => move(1)} aria-label={view === 'week' ? t('calendar.nextWeek') : t('calendar.nextMonth')}><ChevronRight aria-hidden="true" /></Button>
            </div>
          </>
        }
      />

      {error && <ErrorNotice message={error} onRetry={loading ? undefined : () => void load()} onDismiss={() => setError('')} />}

      {editingTask && (
        <Modal title={t('calendar.blockEditTitle')} description={editingTask.title} onClose={() => setEditing(null)}>
          <BlockEditor task={editingTask} defaultDay={editingTask.due_date ?? today} onSave={(patch) => schedule(editingTask, patch)} onCancel={() => setEditing(null)} />
        </Modal>
      )}

      {loading ? <LoadingRows label={t('calendar.loading')} /> : view === 'week' ? (
        <>
          <Figures items={summary.map((item) => ({ label: item.label, value: item.value }))} className="grid-cols-3 sm:grid-cols-3" />

          {unplanned.length > 0 && (
            <Card size="sm">
              <CardHeader>
                <CardTitle><h2 id="calendar-tray-title">{t('calendar.trayTitle', { count: unplanned.length })}</h2></CardTitle>
                <CardDescription>{t('calendar.trayHint')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-wrap gap-2" aria-labelledby="calendar-tray-title">
                  {unplanned.map((task) => (
                    <li key={task.id} className={cn('flex cursor-grab items-center gap-1.5 rounded-md border bg-muted/40 py-1 pr-2.5 pl-1 text-sm active:cursor-grabbing', dragId === task.id && 'opacity-40')} {...dragProps(task)}>
                      <GripVertical aria-hidden="true" className="size-3.5 text-muted-foreground" />
                      <SubjectDot subject={subjects.find((x) => x.id === task.subject_id)} />
                      <button type="button" className="rounded-sm outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50" onClick={() => setEditing(editing === task.id ? null : task.id)} aria-expanded={editing === task.id}
                        aria-label={t('calendar.blockEdit', { title: task.title })}>
                        {task.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <ol className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-7">
            {weekDays.map((day) => {
              const dayExams = examsOn(day)
              const dayTasks = tasksOn(day)
              const minutes = minutesOn(day)
              const isToday = day === today
              return (
                <li
                  key={day}
                  className={cn(
                    'flex min-h-48 min-w-0 flex-col gap-3 bg-card p-3 transition-colors',
                    day < today && 'bg-card/60',
                    isToday && 'bg-primary/5',
                    dropDay === day && 'bg-primary/10 ring-2 ring-primary ring-inset',
                  )}
                  onDragOver={(e) => { if (dragId !== null) { e.preventDefault(); setDropDay(day) } }}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropDay(null) }}
                  onDrop={(e) => { e.preventDefault(); drop(day) }}
                >
                  <h2 className="flex items-baseline gap-2" aria-label={isToday ? `${formatDay(day, 'full', locale)}, ${t('common.today')}` : formatDay(day, 'full', locale)}>
                    <span className={cn('font-mono text-[0.6875rem] tracking-wider uppercase', isToday ? 'text-primary' : 'text-muted-foreground')} aria-hidden="true">{weekdayShort(day)}</span>
                    <span className={cn('font-mono text-xl font-semibold tabular-nums', isToday && 'text-primary', day < today && 'text-muted-foreground')} aria-hidden="true">{parseDay(day).getDate()}</span>
                  </h2>

                  <ul className="flex flex-col gap-1.5">
                    {dayExams.map((exam) => (
                      <li key={`e${exam.id}`} className="flex items-start gap-2 rounded-md bg-warning/15 px-2 py-1.5 text-xs text-warning">
                        <GraduationCap className="mt-px size-3.5 shrink-0" aria-hidden="true" />
                        <span className="flex min-w-0 flex-col">
                          <span className="font-medium break-words">{exam.title}</span>
                          {exam.exam_time && <span className="font-mono tabular-nums">{exam.exam_time.slice(0, 5)}</span>}
                        </span>
                      </li>
                    ))}
                    {dayTasks.map(renderTask)}
                    {dayExams.length === 0 && dayTasks.length === 0 && <li className="text-xs text-muted-foreground/70">{t('calendar.free')}</li>}
                  </ul>

                  <form className="mt-auto" onSubmit={(e) => void addTask(e, day)}>
                    <Input
                      className="h-8 border-dashed bg-transparent text-xs md:h-8 dark:bg-transparent"
                      value={drafts[day] ?? ''}
                      onChange={(e) => setDrafts((d) => ({ ...d, [day]: e.target.value }))}
                      maxLength={200}
                      placeholder={t('calendar.addPlaceholder')}
                      aria-label={t('calendar.addFor', { day: formatDay(day, 'full', locale) })}
                    />
                  </form>

                  <p className={cn('flex items-center gap-1.5 font-mono text-[0.6875rem] tabular-nums', minutes ? 'text-foreground' : 'text-muted-foreground/70')}>
                    <span className={cn('size-2 rounded-sm', HEAT[heatLevel(minutes)] || 'bg-muted')} aria-hidden="true" />
                    {minutes ? t('calendar.studiedValue', { value: formatMinutes(minutes) }) : t('calendar.notStudied')}
                  </p>
                </li>
              )
            })}
          </ol>
        </>
      ) : (
        <Card className="gap-0 py-0">
          <div className="grid grid-cols-7 border-b bg-muted/30" aria-hidden="true">
            {weekDays.map((day) => <span key={day} className="px-2 py-2 text-center font-mono text-[0.6875rem] tracking-wider text-muted-foreground uppercase">{weekdayShort(day)}</span>)}
          </div>
          <ol className="grid grid-cols-7 gap-px bg-border">
            {days.map((day) => {
              const dayExams = examsOn(day)
              const open = tasksOn(day).filter((x) => x.status !== 'done').length
              const minutes = minutesOn(day)
              const outside = day.slice(0, 7) !== monthStart(anchor).slice(0, 7)
              return (
                <li key={day} className="bg-card">
                  <button
                    type="button"
                    className={cn(
                      'relative flex size-full min-h-16 flex-col items-start gap-1 p-1.5 text-left transition-colors outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset sm:min-h-24 sm:p-2',
                      outside && 'opacity-40',
                    )}
                    onClick={() => openWeek(day)}
                    aria-label={[
                      formatDay(day, 'full', locale),
                      ...dayExams.map((e) => `${t('calendar.exam')}: ${e.title}`),
                      open ? t('calendar.openTasks', { count: open }) : '',
                      minutes ? t('calendar.studiedValue', { value: formatMinutes(minutes) }) : '',
                    ].filter(Boolean).join(', ')}
                  >
                    <span className={cn('flex size-6 items-center justify-center rounded-md font-mono text-xs tabular-nums', day === today && 'bg-primary font-semibold text-primary-foreground')}>{parseDay(day).getDate()}</span>
                    {dayExams.slice(0, 2).map((e) => <span key={e.id} className="hidden w-full truncate rounded-sm bg-warning/15 px-1 text-[0.6875rem] text-warning sm:block">{e.title}</span>)}
                    {dayExams.length > 0 && <span className="size-1.5 rounded-full bg-warning sm:hidden" aria-hidden="true" />}
                    {open > 0 && <span className="hidden text-[0.6875rem] text-muted-foreground sm:block">{t('calendar.openTasks', { count: open })}</span>}
                    {minutes > 0 && (
                      <span className="mt-auto flex items-center gap-1 font-mono text-[0.6875rem] tabular-nums">
                        <span className={cn('size-2 rounded-sm', HEAT[heatLevel(minutes)])} aria-hidden="true" />
                        <span className="hidden sm:inline">{formatMinutes(minutes)}</span>
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ol>
        </Card>
      )}
    </div>
  )
}

export default CalendarPage
