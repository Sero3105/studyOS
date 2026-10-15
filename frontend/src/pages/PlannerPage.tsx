import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronDown, Plus } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Segmented from '../components/ui/Segmented'
import ConfirmButton from '../components/ui/ConfirmButton'
import Meta from '../components/ui/Meta'
import { EmptyState, ErrorNotice, LoadingRows } from '../components/ui/Feedback'
import { createTask, deleteTask, getTasks, updateTask } from '../services/taskService'
import type { Task, TaskPriority, TaskStatus } from '../services/taskService'
import { getSubjects } from '../services/subjectService'
import type { Subject } from '../services/subjectService'
import { getExams } from '../services/examService'
import type { Exam } from '../services/examService'
import { daysUntil, formatDay, monthShort, parseDay, relativeDay, urgencyClass } from '../utils/dates'
import { errorMessage } from '../utils/errors'
import { useLanguage } from '../i18n/useLanguage'
import type { TranslationKey } from '../i18n/translations'

const priorityKeys: Record<TaskPriority, TranslationKey> = { low: 'priority.low', medium: 'priority.medium', high: 'priority.high' }
const priorityRank: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 }

type TaskFilter = 'open' | 'done' | 'all'

/** Gruppi per scadenza, nell'ordine in cui vanno affrontati. */
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
  const [tasks, setTasks] = useState<Task[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<TaskFilter>('open')
  const [showDetails, setShowDetails] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [subjectId, setSubjectId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async (): Promise<void> => {
    try {
      setError('')
      const [taskList, subjectList, examList] = await Promise.all([getTasks(), getSubjects(), getExams()])
      setTasks(taskList); setSubjects(subjectList); setExams(examList)
    } catch (e) { setError(errorMessage(e, t('planner.loadError'))) }
    finally { setLoading(false) }
  }
  useEffect(() => { queueMicrotask(() => { void load() }) }, [])

  const selectedSubject = subjects.find((s) => s.id === Number(subjectId))

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
      })
      setTasks((t) => [...t, created])
      setTitle(''); setDescription(''); setDueDate(''); setTopicId('')
    } catch (e) { setError(errorMessage(e, t('planner.saveError'))) }
    finally { setSaving(false) }
  }

  const changeStatus = async (task: Task, status: TaskStatus) => {
    try {
      const updated = await updateTask(task.id, { status })
      setTasks((t) => t.map((x) => x.id === task.id ? updated : x))
    } catch (e) { setError(errorMessage(e, t('planner.updateError'))) }
  }

  const removeTask = async (id: number) => {
    try {
      await deleteTask(id)
      setTasks((t) => t.filter((x) => x.id !== id))
    } catch (e) { setError(errorMessage(e, t('planner.deleteError'))) }
  }

  const subjectName = (id: number | null) => subjects.find((s) => s.id === id)?.name
  const topicName = (task: Task) => subjects.find((s) => s.id === task.subject_id)?.topics.find((t) => t.id === task.topic_id)?.title
  const upcomingExams = exams
    .filter((e) => (e.status === 'planned' || e.status === 'in_progress') && daysUntil(e.exam_date) >= 0)
    .slice(0, 5)

  const openTasks = sortTasks(tasks.filter((t) => t.status !== 'done'))
  const doneTasks = sortTasks(tasks.filter((t) => t.status === 'done'))
  const overdueCount = openTasks.filter((t) => t.due_date && daysUntil(t.due_date) < 0).length

  const renderTask = (task: Task) => {
    const days = task.due_date ? daysUntil(task.due_date) : null
    const done = task.status === 'done'
    const subject = subjectName(task.subject_id)
    const topic = topicName(task)
    return (
      <li className={`row task-row${done ? ' is-complete' : ''}`} key={task.id}>
        <input
          className="check"
          type="checkbox"
          checked={done}
          onChange={(e) => void changeStatus(task, e.target.checked ? 'done' : 'todo')}
          aria-label={done ? t('planner.reopen', { title: task.title }) : t('planner.markDone', { title: task.title })}
        />
        <span className="row-main">
          <span className={`row-title${done ? ' is-done' : ''}`}>{task.title}</span>
          {task.description && <span className="task-description">{task.description}</span>}
          <Meta
            className="row-meta task-meta"
            items={[
              <span className={`priority priority-${task.priority}`}>{t(priorityKeys[task.priority])}</span>,
              task.due_date && (
                <span className={!done && days !== null && days < 0 ? 'text-danger' : undefined} title={formatDay(task.due_date, 'long', locale)}>
                  {relativeDay(task.due_date, locale)}
                </span>
              ),
              subject && `${subject}${topic ? ` / ${topic}` : ''}`,
            ]}
          />
        </span>
        <span className="row-actions">
          {!done && (
            <button
              className={`tag tag-button${task.status === 'in_progress' ? ' tag-accent' : ' row-reveal'}`}
              type="button"
              aria-pressed={task.status === 'in_progress'}
              onClick={() => void changeStatus(task, task.status === 'in_progress' ? 'todo' : 'in_progress')}
            >
              {t('planner.inProgress')}
            </button>
          )}
          <span className="row-reveal">
            <ConfirmButton label={t('planner.deleteLabel', { title: task.title })} onConfirm={() => removeTask(task.id)} />
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
      : [{ id: filter, titleKey: (filter === 'done' ? 'planner.group.done' : 'planner.group.all') as TranslationKey, items: filter === 'done' ? doneTasks : sortTasks(tasks) }]

  return (
    <div className="page planner-page">
      <PageHeader
        title={t('planner.title')}
        description={
          loading
            ? t('planner.descriptionLoading')
            : t('planner.descriptionWith', { count: openTasks.length, countLabel: openTasks.length === 1 ? t('planner.taskOpenOne') : t('planner.taskOpenMany'), overdue: overdueCount ? t('planner.overdueSuffix', { count: overdueCount }) : '' })
        }
      />

      {error && <ErrorNotice message={error} onRetry={tasks.length ? undefined : () => void load()} onDismiss={tasks.length ? () => setError('') : undefined} />}

      <div className="planner-layout">
        <div className="planner-main">
          <form className="panel composer" onSubmit={addTask} aria-label={t('planner.newTask')}>
            <div className="composer-row">
              <label className="visually-hidden" htmlFor="task-title">{t('planner.taskTitle')}</label>
              <input
                id="task-title"
                className="input composer-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
                placeholder={t('planner.titlePlaceholder')}
              />
              <label className="field composer-compact">
                <span className="visually-hidden">{t('planner.dueDate')}</span>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} aria-label={t('planner.dueDate')} />
              </label>
              <label className="field composer-compact">
                <span className="visually-hidden">{t('planner.priority')}</span>
                <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} aria-label={t('planner.priority')}>
                  {(Object.keys(priorityKeys) as TaskPriority[]).map((v) => <option key={v} value={v}>{t('planner.priorityOption', { label: t(priorityKeys[v]).toLowerCase() })}</option>)}
                </select>
              </label>
              <button className="btn btn-primary" type="submit" disabled={saving || !title.trim()}>
                <Plus aria-hidden="true" /> {t('common.add')}
              </button>
            </div>

            <button
              className="btn btn-ghost composer-toggle"
              type="button"
              aria-expanded={showDetails}
              aria-controls="composer-details"
              onClick={() => setShowDetails((v) => !v)}
            >
              <ChevronDown aria-hidden="true" className={showDetails ? 'is-flipped' : undefined} />
              {showDetails ? t('planner.lessDetails') : t('planner.moreDetails')}
            </button>

            {showDetails && (
              <div id="composer-details" className="composer-details">
                <label className="field">
                  <span className="field-label">{t('planner.description')} <em>{t('common.optional')}</em></span>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={2000} />
                </label>
                <div className="form-grid">
                  <label className="field">
                    <span className="field-label">{t('planner.subject')}</span>
                    <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setTopicId('') }}>
                      <option value="">{t('common.noneFeminine')}</option>
                      {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">{t('planner.topic')}</span>
                    <select value={topicId} onChange={(e) => setTopicId(e.target.value)} disabled={!selectedSubject || selectedSubject.topics.length === 0}>
                      <option value="">{t('common.noneMasculine')}</option>
                      {selectedSubject?.topics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                    </select>
                  </label>
                </div>
              </div>
            )}
          </form>

          {loading ? (
            <LoadingRows label={t('planner.loading')} />
          ) : tasks.length === 0 ? (
            <section className="panel">
              <EmptyState title={t('planner.noTasksTitle')}>
                {t('planner.noTasksBody')}
              </EmptyState>
            </section>
          ) : (
            <section className="page-section" aria-label={t('planner.tasksLabel')}>
              <div className="toolbar">
                <Segmented
                  label={t('planner.filter')}
                  value={filter}
                  onChange={setFilter}
                  options={[
                    { value: 'open', label: t('planner.filterOpen'), count: openTasks.length },
                    { value: 'done', label: t('planner.filterDone'), count: doneTasks.length },
                    { value: 'all', label: t('planner.filterAll'), count: tasks.length },
                  ]}
                />
              </div>

              {visibleGroups.length === 0 || visibleGroups.every((g) => g.items.length === 0) ? (
                <section className="panel">
                  <EmptyState title={filter === 'open' ? t('planner.allDoneTitle') : t('planner.noDoneTitle')}>
                    {filter === 'open' ? t('planner.allDoneBody') : t('planner.noDoneBody')}
                  </EmptyState>
                </section>
              ) : (
                <div className="panel grouped-list">
                  {visibleGroups.map((group) => (
                    <div className="list-group" key={group.id}>
                      <h2 className={`list-group-title${group.id === 'overdue' ? ' text-danger' : ''}`}>
                        {t(group.titleKey)} <span className="num">{group.items.length}</span>
                      </h2>
                      <ul className="rows">{group.items.map(renderTask)}</ul>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        <aside className="planner-side" aria-labelledby="planner-exams-title">
          <section className="panel">
            <div className="panel-head">
              <h2 id="planner-exams-title" className="panel-title">{t('planner.upcomingExams')}</h2>
              <Link className="text-link" to="/exams">{t('exams.title')} <ArrowRight aria-hidden="true" /></Link>
            </div>
            {upcomingExams.length === 0 ? (
              <EmptyState compact title={t('exams.noUpcomingTitle')}>{t('planner.noUpcomingBody')}</EmptyState>
            ) : (
              <ul className="rows">
                {upcomingExams.map((exam) => {
                  const days = daysUntil(exam.exam_date)
                  return (
                    <li className="row" key={exam.id}>
                      <span className="date-block" aria-hidden="true">
                        <span className="date-block-day num">{parseDay(exam.exam_date).getDate()}</span>
                        <span className="date-block-month">{monthShort(exam.exam_date, locale)}</span>
                      </span>
                      <span className="row-main">
                        <span className="row-title">{exam.title}</span>
                        <Meta
                          items={[
                            <>
                              <span className="visually-hidden">{formatDay(exam.exam_date, 'long', locale)}, </span>
                              <span className={`exam-row-days ${urgencyClass(days)}`}>{relativeDay(exam.exam_date, locale)}</span>
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
          </section>
        </aside>
      </div>
    </div>
  )
}

export default PlannerPage
