import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, Play, Plus, Repeat } from 'lucide-react'
import { cn } from '@/lib/utils'
import PageHeader from '../components/ui/PageHeader'
import MoreLink from '../components/ui/MoreLink'
import Priority from '../components/ui/Priority'
import DateBlock from '../components/ui/DateBlock'
import { Button } from '../components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Checkbox } from '../components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible'
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '../components/ui/field'
import { Input } from '../components/ui/input'
import { NativeSelect, NativeSelectOption } from '../components/ui/native-select'
import { Spinner } from '../components/ui/spinner'
import { Textarea } from '../components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '../components/ui/toggle-group'
import Segmented from '../components/ui/Segmented'
import DeleteButton from '../components/ui/DeleteButton'
import { useUndo } from '../context/undoContext'
import Meta from '../components/ui/Meta'
import { EmptyState, ErrorNotice, LoadingRows } from '../components/ui/Feedback'
import { createTask, deleteTask, getTasks, updateTask } from '../services/taskService'
import { useListMotion } from '../hooks/useListMotion'
import type { ReviewRating as ReviewRatingValue, Task, TaskPriority, TaskStatus } from '../services/taskService'
import ReviewRating from '../components/ReviewRating'
import { sessionFor } from '../utils/pomodoro'
import { getSubjects } from '../services/subjectService'
import type { Subject } from '../services/subjectService'
import { getExams } from '../services/examService'
import { isDated } from '../services/examService'
import type { Exam } from '../services/examService'
import { addDays, daysUntil, formatDay, relativeDay, urgencyClass, weekdayShort } from '../utils/dates'
import SubjectDot from '../components/ui/SubjectDot'
import { errorMessage } from '../utils/errors'
import { archivedSubjectIds } from '../utils/grades'
import { useLanguage } from '../i18n/useLanguage'
import type { TranslationKey } from '../i18n/translations'
import DatePicker from '../components/ui/DatePicker'

const priorityKeys: Record<TaskPriority, TranslationKey> = { low: 'priority.low', medium: 'priority.medium', high: 'priority.high' }
const priorityRank: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 }

type TaskFilter = 'open' | 'done' | 'all'

const ISO_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7]
/** Nome breve del giorno ISO (1 = lunedì): il 2 novembre 2026 è un lunedì. */
const isoWeekdayName = (day: number, locale: string) => weekdayShort(addDays('2026-11-02', day - 1), locale)

/** Gruppi per scadenza, nell'ordine in cui vanno affrontati. */
const GROUP_PREVIEW = 10
const groups: { id: string; titleKey: TranslationKey; test: (d: number | null) => boolean }[] = [
  { id: 'overdue', titleKey: 'planner.group.overdue', test: (d) => d !== null && d < 0 },
  { id: 'today', titleKey: 'planner.group.today', test: (d) => d === 0 },
  { id: 'week', titleKey: 'planner.group.week', test: (d) => d !== null && d > 0 && d <= 7 },
  { id: 'later', titleKey: 'planner.group.later', test: (d) => d !== null && d > 7 },
  { id: 'none', titleKey: 'planner.group.none', test: (d) => d === null },
]

function sortTasks(list: Task[]): Task[] {
  return [...list].sort(
    (a, b) =>
      (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999') ||
      priorityRank[a.priority] - priorityRank[b.priority] ||
      a.id - b.id,
  )
}

/**
 * Planner: inserimento rapido in alto, task raggruppati per scadenza e,
 * a lato, gli esami in arrivo come contesto per pianificare.
 */
function PlannerPage() {
  const { t, locale } = useLanguage()
  const { undoable } = useUndo()
  const navigate = useNavigate()
  const [tasks, setTasks] = useState<Task[]>([])
  const rows = useListMotion<number>()
  // Spuntati in attesa del salvataggio: la spunta si vede subito.
  const [ticked, setTicked] = useState<ReadonlySet<number>>(() => new Set())
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<TaskFilter>('open')
  const [subjectFilter, setSubjectFilter] = useState(0) // 0 = tutte le materie
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [showDetails, setShowDetails] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [subjectId, setSubjectId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [repeat, setRepeat] = useState<'' | 'daily' | 'weekly'>('')
  const [weekdays, setWeekdays] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  // Arrivati con "n" o dalla palette: il cursore è già nel campo del nuovo task.
  const focusNewTask = Boolean((useLocation().state as { focusNewTask?: boolean } | null)?.focusNewTask)

  const load = useCallback(async (): Promise<void> => {
    try {
      setError('')
      const [taskList, subjectList, examList] = await Promise.all([getTasks(), getSubjects(), getExams()])
      setTasks(taskList); setSubjects(subjectList); setExams(examList)
    } catch (e) { setError(errorMessage(e, t('planner.loadError'))) }
    finally { setLoading(false) }
  }, [t])
  useEffect(() => { queueMicrotask(() => { void load() }) }, [load])

  const selectedSubject = subjects.find((s) => s.id === Number(subjectId))
  const archived = archivedSubjectIds(exams)

  const addTask = async (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      const created = await createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        due_date: dueDate || undefined,
        priority,
        subject_id: subjectId ? Number(subjectId) : undefined,
        topic_id: topicId ? Number(topicId) : undefined,
        recurrence: repeat === 'daily' ? 'daily' : repeat === 'weekly' && weekdays.length ? `weekly:${[...weekdays].sort().join(',')}` : undefined,
      })
      setTasks((t) => [...t, created])
      rows.added(created.id)
      setTitle(''); setDescription(''); setDueDate(''); setTopicId(''); setRepeat(''); setWeekdays([])
    } catch (e) { setError(errorMessage(e, t('planner.saveError'))) }
    finally { setSaving(false) }
  }

  const changeStatus = async (task: Task, status: TaskStatus, rating?: ReviewRatingValue) => {
    if (status === 'done') setTicked((current) => new Set(current).add(task.id))
    // Se col nuovo stato la riga esce dal filtro attivo, si chiude invece di sparire (dopo che la spunta si è disegnata).
    const leavesView = (filter === 'open' && status === 'done') || (filter === 'done' && status !== 'done')
    const leaving = leavesView ? rows.leave(task.id, status === 'done' ? 180 : 0) : null
    try {
      const [updated] = await Promise.all([updateTask(task.id, { status, review_rating: rating }), leaving?.done])
      // Un task ricorrente o un ripasso completato crea il successivo sul backend: si ricarica la lista.
      if (status === 'done' && (task.recurrence || task.review_interval)) setTasks(await getTasks())
      else setTasks((t) => t.map((x) => x.id === task.id ? updated : x))
    } catch (e) {
      leaving?.cancel()
      setError(errorMessage(e, t('planner.updateError')))
    } finally {
      setTicked((current) => { const next = new Set(current); next.delete(task.id); return next })
    }
  }

  const removeTask = async (task: Task) => {
    await rows.leave(task.id).done
    setTasks((list) => list.filter((x) => x.id !== task.id))
    undoable(t('common.deleted', { title: task.title }), () => deleteTask(task.id), () => { setTasks((list) => [...list, task]); rows.added(task.id) })
  }

  const subjectOf = (id: number | null) => subjects.find((s) => s.id === id)
  const recurrenceLabel = (recurrence: string) => recurrence === 'daily'
    ? t('planner.repeatDaily')
    : t('planner.repeatOn', { days: recurrence.replace('weekly:', '').split(',').map((d) => isoWeekdayName(Number(d), locale)).join(', ') })
  const topicName = (task: Task) => subjects.find((s) => s.id === task.subject_id)?.topics.find((t) => t.id === task.topic_id)?.title
  const upcomingExams = exams
    .filter(isDated)
    .filter((e) => (e.status === 'planned' || e.status === 'in_progress') && daysUntil(e.exam_date) >= 0)
    .slice(0, 5)

  // Con più esami in piano i task si mescolano: il filtro per materia compare solo se ce ne sono almeno due.
  const taskSubjects = subjects.filter((s) => tasks.some((t) => t.subject_id === s.id))
  const shown = subjectFilter ? tasks.filter((t) => t.subject_id === subjectFilter) : tasks
  const openTasks = sortTasks(shown.filter((t) => t.status !== 'done'))
  const doneTasks = sortTasks(shown.filter((t) => t.status === 'done'))
  const overdueCount = openTasks.filter((t) => t.due_date && daysUntil(t.due_date) < 0).length

  const reveal = 'md:opacity-0 md:transition-opacity md:group-hover/task:opacity-100 md:group-focus-within/task:opacity-100'

  const renderTask = (task: Task) => {
    const days = task.due_date ? daysUntil(task.due_date) : null
    const done = task.status === 'done'
    const subject = subjectOf(task.subject_id)
    const topic = topicName(task)
    return (
      <li ref={rows.ref(task.id)} className={cn('group/task flex flex-wrap items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40 sm:flex-nowrap md:px-5', rows.enter(task.id))} key={task.id}>
        <Checkbox
          className="mt-0.5 size-5"
          checked={done || ticked.has(task.id)}
          onCheckedChange={(checked) => { if (!ticked.has(task.id)) void changeStatus(task, checked === true ? 'done' : 'todo') }}
          aria-label={done ? t('planner.reopen', { title: task.title }) : t('planner.markDone', { title: task.title })}
        />
        <span className="flex min-w-0 flex-1 basis-[calc(100%-2.75rem)] flex-col gap-1 sm:basis-0">
          <span className={cn('text-sm font-medium break-words transition-colors', done && 'text-muted-foreground line-through')}>{task.title}</span>
          {task.description && <span className="line-clamp-1 text-sm text-muted-foreground" title={task.description}>{task.description}</span>}
          <Meta
            className="text-xs text-muted-foreground [&>*]:inline-flex [&>*]:items-center [&>*]:gap-1.5 [&>*]:align-middle"
            items={[
              <Priority value={task.priority} />,
              task.due_date && (
                <span className={!done && days !== null && days < 0 ? 'text-destructive' : undefined} title={formatDay(task.due_date, 'long', locale)}>
                  {relativeDay(task.due_date, locale)}{task.scheduled_time && ` · ${task.scheduled_time.slice(0, 5)}`}
                </span>
              ),
              subject && <span><SubjectDot subject={subject} />{subject.name}{topic ? ` / ${topic}` : ''}</span>,
              task.recurrence && <span><Repeat className="size-3" aria-hidden="true" /> {recurrenceLabel(task.recurrence)}</span>,
            ]}
          />
        </span>
        <span className="ml-8 flex items-center gap-1 sm:ml-0">
          {/* Un ripasso in scadenza si chiude dicendo com'è andato; prima di allora è un task normale. */}
          {!done && task.review_interval !== null && days !== null && days <= 0 ? (
            <ReviewRating onRate={(rating) => void changeStatus(task, 'done', rating)} />
          ) : !done && (
            <Button
              variant={task.status === 'in_progress' ? 'secondary' : 'ghost'}
              size="xs"
              className={cn(task.status === 'in_progress' ? 'text-primary' : reveal)}
              aria-pressed={task.status === 'in_progress'}
              onClick={() => void changeStatus(task, task.status === 'in_progress' ? 'todo' : 'in_progress')}
            >
              {t('planner.inProgress')}
            </Button>
          )}
          <span className={cn('flex items-center gap-0.5', reveal)}>
            {!done && (
              <Button variant="ghost" size="icon-sm" onClick={() => navigate('/timer', { state: sessionFor(subject, subject?.topics.find((x) => x.id === task.topic_id), task) })}
                aria-label={t('planner.startTimer', { title: task.title })} title={t('planner.startTimerTitle')}>
                <Play aria-hidden="true" />
              </Button>
            )}
            <DeleteButton label={t('planner.deleteLabel', { title: task.title })} onDelete={() => void removeTask(task)} />
          </span>
        </span>
      </li>
    )
  }

  const visibleGroups =
    filter === 'open'
      ? groups
          .map((group) => ({ ...group, items: openTasks.filter((t) => group.test(t.due_date ? daysUntil(t.due_date) : null)) }))
          .filter((group) => group.items.length > 0)
      : [{ id: filter, titleKey: (filter === 'done' ? 'planner.group.done' : 'planner.group.all') as TranslationKey, items: filter === 'done' ? doneTasks : sortTasks(shown) }]

  const optional = <span className="font-normal text-muted-foreground">{t('common.optional')}</span>

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={t('planner.title')}
        description={
          loading
            ? t('planner.descriptionLoading')
            : t('planner.descriptionWith', { count: openTasks.length, countLabel: openTasks.length === 1 ? t('planner.taskOpenOne') : t('planner.taskOpenMany'), overdue: overdueCount ? t('planner.overdueSuffix', { count: overdueCount }) : '' })
        }
      />

      {error && <ErrorNotice message={error} onRetry={tasks.length ? undefined : () => void load()} onDismiss={tasks.length ? () => setError('') : undefined} />}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card size="sm">
            <CardContent>
              <form className="flex flex-col gap-3" onSubmit={addTask} aria-label={t('planner.newTask')}>
                <div className="flex flex-col gap-2 md:flex-row">
                  <label className="sr-only" htmlFor="task-title">{t('planner.taskTitle')}</label>
                  <Input
                    id="task-title"
                    className="md:flex-1"
                    autoFocus={focusNewTask}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    maxLength={200}
                    placeholder={t('planner.titlePlaceholder')}
                  />
                  <div className="grid grid-cols-2 gap-2 md:flex">
                    <DatePicker className="md:w-44" value={dueDate} onChange={setDueDate} placeholder={t('planner.dueDate')} aria-label={t('planner.dueDate')} />
                    <NativeSelect className="w-full md:w-36" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} aria-label={t('planner.priority')}>
                      {(Object.keys(priorityKeys) as TaskPriority[]).map((v) => <NativeSelectOption key={v} value={v}>{t('planner.priorityOption', { label: t(priorityKeys[v]).toLowerCase() })}</NativeSelectOption>)}
                    </NativeSelect>
                  </div>
                  <Button type="submit" disabled={saving || !title.trim() || (repeat === 'weekly' && weekdays.length === 0)}>
                    {saving ? <Spinner data-icon="inline-start" /> : <Plus data-icon="inline-start" aria-hidden="true" />} {t('common.add')}
                  </Button>
                </div>

                <Collapsible open={showDetails} onOpenChange={setShowDetails}>
                  <CollapsibleTrigger asChild>
                    <Button type="button" variant="ghost" size="sm" className="-ml-2 self-start text-muted-foreground">
                      <ChevronDown data-icon="inline-start" aria-hidden="true" className={cn('transition-transform', showDetails && 'rotate-180')} />
                      {showDetails ? t('planner.lessDetails') : t('planner.moreDetails')}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <FieldGroup className="gap-4 pt-3">
                      <Field>
                        <FieldLabel htmlFor="task-description">{t('planner.description')} {optional}</FieldLabel>
                        <Textarea id="task-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={2000} />
                      </Field>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field>
                          <FieldLabel htmlFor="task-subject">{t('planner.subject')}</FieldLabel>
                          <NativeSelect id="task-subject" className="w-full" value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setTopicId('') }}>
                            <NativeSelectOption value="">{t('common.noneFeminine')}</NativeSelectOption>
                            {subjects.filter((s) => !archived.has(s.id)).map((s) => <NativeSelectOption key={s.id} value={s.id}>{s.name}</NativeSelectOption>)}
                          </NativeSelect>
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="task-topic">{t('planner.topic')}</FieldLabel>
                          <NativeSelect id="task-topic" className="w-full" value={topicId} onChange={(e) => setTopicId(e.target.value)} disabled={!selectedSubject || selectedSubject.topics.length === 0}>
                            <NativeSelectOption value="">{t('common.noneMasculine')}</NativeSelectOption>
                            {selectedSubject?.topics.map((t) => <NativeSelectOption key={t.id} value={t.id}>{t.title}</NativeSelectOption>)}
                          </NativeSelect>
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="task-repeat">{t('planner.repeat')}</FieldLabel>
                          <NativeSelect id="task-repeat" className="w-full" value={repeat} onChange={(e) => setRepeat(e.target.value as '' | 'daily' | 'weekly')}>
                            <NativeSelectOption value="">{t('planner.repeatNever')}</NativeSelectOption>
                            <NativeSelectOption value="daily">{t('planner.repeatDaily')}</NativeSelectOption>
                            <NativeSelectOption value="weekly">{t('planner.repeatWeekly')}</NativeSelectOption>
                          </NativeSelect>
                        </Field>
                        {repeat === 'weekly' && (
                          <FieldSet className="gap-2">
                            <FieldLegend variant="label">{t('planner.repeatDays')}</FieldLegend>
                            <ToggleGroup
                              type="multiple"
                              variant="outline"
                              spacing={0}
                              value={weekdays.map(String)}
                              onValueChange={(values) => setWeekdays(values.map(Number))}
                              className="w-full [&>*]:flex-1 [&>*]:px-0"
                            >
                              {ISO_WEEKDAYS.map((day) => (
                                <ToggleGroupItem key={day} value={String(day)} className="data-[state=on]:bg-primary/10 data-[state=on]:text-primary">{isoWeekdayName(day, locale)}</ToggleGroupItem>
                              ))}
                            </ToggleGroup>
                          </FieldSet>
                        )}
                      </div>
                    </FieldGroup>
                  </CollapsibleContent>
                </Collapsible>
              </form>
            </CardContent>
          </Card>

          {loading ? (
            <LoadingRows label={t('planner.loading')} />
          ) : tasks.length === 0 ? (
            <EmptyState title={t('planner.noTasksTitle')}>
              {t('planner.noTasksBody')}
            </EmptyState>
          ) : (
            <section className="flex flex-col gap-3" aria-label={t('planner.tasksLabel')}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Segmented
                  label={t('planner.filter')}
                  value={filter}
                  onChange={setFilter}
                  options={[
                    { value: 'open', label: t('planner.filterOpen'), count: openTasks.length },
                    { value: 'done', label: t('planner.filterDone'), count: doneTasks.length },
                    { value: 'all', label: t('planner.filterAll'), count: shown.length },
                  ]}
                />
                {taskSubjects.length > 1 && (
                  <NativeSelect className="w-full sm:w-56" value={subjectFilter} onChange={(e) => setSubjectFilter(Number(e.target.value))} aria-label={t('planner.subjectFilter')}>
                    <NativeSelectOption value={0}>{t('history.allSubjects')}</NativeSelectOption>
                    {taskSubjects.map((s) => <NativeSelectOption key={s.id} value={s.id}>{s.name}</NativeSelectOption>)}
                  </NativeSelect>
                )}
              </div>

              {visibleGroups.length === 0 || visibleGroups.every((g) => g.items.length === 0) ? (
                <EmptyState title={filter === 'open' ? t('planner.allDoneTitle') : t('planner.noDoneTitle')}>
                  {filter === 'open' ? t('planner.allDoneBody') : t('planner.noDoneBody')}
                </EmptyState>
              ) : (
                <Card className="gap-0 py-0">
                  {visibleGroups.map((group) => (
                    <div className="border-b last:border-b-0" key={group.id}>
                      <h2 className={cn('flex items-center gap-2 bg-muted/30 px-4 py-2 font-mono text-[0.6875rem] tracking-wider uppercase md:px-5', group.id === 'overdue' ? 'text-destructive' : 'text-muted-foreground')}>
                        {t(group.titleKey)} <span className="tabular-nums">{group.items.length}</span>
                      </h2>
                      {/* Un piano d'esame crea decine di task: i gruppi lunghi mostrano i primi 10, il resto a richiesta. */}
                      <ul className="flex flex-col divide-y">{(expanded.has(group.id) || group.items.length <= GROUP_PREVIEW + 5 ? group.items : group.items.slice(0, GROUP_PREVIEW)).map(renderTask)}</ul>
                      {!expanded.has(group.id) && group.items.length > GROUP_PREVIEW + 5 && (
                        <Button variant="ghost" className="w-full rounded-none border-t text-muted-foreground" onClick={() => setExpanded((set) => new Set(set).add(group.id))}>
                          {t('planner.showMore', { count: group.items.length - GROUP_PREVIEW })}
                        </Button>
                      )}
                    </div>
                  ))}
                </Card>
              )}
            </section>
          )}
        </div>

        <aside aria-labelledby="planner-exams-title">
          <Card>
            <CardHeader>
              <CardTitle><h2 id="planner-exams-title">{t('planner.upcomingExams')}</h2></CardTitle>
              <CardAction><MoreLink to="/subjects">{t('exams.title')}</MoreLink></CardAction>
            </CardHeader>
            <CardContent>
              {upcomingExams.length === 0 ? (
                <EmptyState compact title={t('exams.noUpcomingTitle')}>{t('planner.noUpcomingBody')}</EmptyState>
              ) : (
                <ul className="flex flex-col divide-y">
                  {upcomingExams.map((exam) => {
                    const days = daysUntil(exam.exam_date)
                    return (
                      <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0" key={exam.id}>
                        <DateBlock iso={exam.exam_date} />
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="truncate text-sm font-medium">{exam.title}</span>
                          <Meta
                            items={[
                              <>
                                <span className="sr-only">{formatDay(exam.exam_date, 'long', locale)}, </span>
                                <span className={urgencyClass(days)}>{relativeDay(exam.exam_date, locale)}</span>
                              </>,
                              exam.subject,
                            ]}
                          />
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}

export default PlannerPage
