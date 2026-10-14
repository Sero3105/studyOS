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

const priorityLabels: Record<TaskPriority, string> = { low: 'Bassa', medium: 'Media', high: 'Alta' }
const priorityRank: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 }

type TaskFilter = 'open' | 'done' | 'all'

/** Gruppi per scadenza, nell'ordine in cui vanno affrontati. */
const groups = [
  { id: 'overdue', title: 'In ritardo', test: (d: number | null) => d !== null && d < 0 },
  { id: 'today', title: 'Oggi', test: (d: number | null) => d === 0 },
  { id: 'week', title: 'Prossimi 7 giorni', test: (d: number | null) => d !== null && d > 0 && d <= 7 },
  { id: 'later', title: 'Più avanti', test: (d: number | null) => d !== null && d > 7 },
  { id: 'none', title: 'Senza scadenza', test: (d: number | null) => d === null },
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
    } catch (e) { setError(errorMessage(e, 'Impossibile caricare il planner')) }
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
    } catch (e) { setError(errorMessage(e, 'Salvataggio non riuscito')) }
    finally { setSaving(false) }
  }

  const changeStatus = async (task: Task, status: TaskStatus) => {
    try {
      const updated = await updateTask(task.id, { status })
      setTasks((t) => t.map((x) => x.id === task.id ? updated : x))
    } catch (e) { setError(errorMessage(e, 'Impossibile aggiornare il task')) }
  }

  const removeTask = async (id: number) => {
    try {
      await deleteTask(id)
      setTasks((t) => t.filter((x) => x.id !== id))
    } catch (e) { setError(errorMessage(e, 'Eliminazione non riuscita')) }
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
          aria-label={done ? `Riapri: ${task.title}` : `Segna come fatto: ${task.title}`}
        />
        <span className="row-main">
          <span className={`row-title${done ? ' is-done' : ''}`}>{task.title}</span>
          {task.description && <span className="task-description">{task.description}</span>}
          <Meta
            className="row-meta task-meta"
            items={[
              <span className={`priority priority-${task.priority}`}>{priorityLabels[task.priority]}</span>,
              task.due_date && (
                <span className={!done && days !== null && days < 0 ? 'text-danger' : undefined} title={formatDay(task.due_date, 'long')}>
                  {relativeDay(task.due_date)}
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
              In corso
            </button>
          )}
          <span className="row-reveal">
            <ConfirmButton label={`Elimina ${task.title}`} onConfirm={() => removeTask(task.id)} />
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
      : [{ id: filter, title: filter === 'done' ? 'Completati' : 'Tutti i task', items: filter === 'done' ? doneTasks : sortTasks(tasks) }]

  return (
    <div className="page planner-page">
      <PageHeader
        title="Planner"
        description={
          loading
            ? 'Task e scadenze in un unico posto.'
            : `${openTasks.length} ${openTasks.length === 1 ? 'task aperto' : 'task aperti'}${overdueCount ? ` · ${overdueCount} in ritardo` : ''}`
        }
      />

      {error && <ErrorNotice message={error} onRetry={tasks.length ? undefined : () => void load()} onDismiss={tasks.length ? () => setError('') : undefined} />}

      <div className="planner-layout">
        <div className="planner-main">
          <form className="panel composer" onSubmit={addTask} aria-label="Nuovo task">
            <div className="composer-row">
              <label className="visually-hidden" htmlFor="task-title">Titolo del task</label>
              <input
                id="task-title"
                className="input composer-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
                placeholder="Cosa devi fare? Es. Ripasso capitolo 4"
              />
              <label className="field composer-compact">
                <span className="visually-hidden">Scadenza</span>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} aria-label="Scadenza" />
              </label>
              <label className="field composer-compact">
                <span className="visually-hidden">Priorità</span>
                <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} aria-label="Priorità">
                  {Object.entries(priorityLabels).map(([v, l]) => <option key={v} value={v}>Priorità {l.toLowerCase()}</option>)}
                </select>
              </label>
              <button className="btn btn-primary" type="submit" disabled={saving || !title.trim()}>
                <Plus aria-hidden="true" /> Aggiungi
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
              {showDetails ? 'Meno dettagli' : 'Descrizione, materia e argomento'}
            </button>

            {showDetails && (
              <div id="composer-details" className="composer-details">
                <label className="field">
                  <span className="field-label">Descrizione <em>opzionale</em></span>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={2000} />
                </label>
                <div className="form-grid">
                  <label className="field">
                    <span className="field-label">Materia</span>
                    <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setTopicId('') }}>
                      <option value="">Nessuna</option>
                      {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">Argomento</span>
                    <select value={topicId} onChange={(e) => setTopicId(e.target.value)} disabled={!selectedSubject || selectedSubject.topics.length === 0}>
                      <option value="">Nessuno</option>
                      {selectedSubject?.topics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                    </select>
                  </label>
                </div>
              </div>
            )}
          </form>

          {loading ? (
            <LoadingRows label="Caricamento planner" />
          ) : tasks.length === 0 ? (
            <section className="panel">
              <EmptyState title="Nessun task">
                Scrivi qui sopra la prima cosa da fare: titolo e invio bastano.
              </EmptyState>
            </section>
          ) : (
            <section className="page-section" aria-label="Task">
              <div className="toolbar">
                <Segmented
                  label="Filtra task"
                  value={filter}
                  onChange={setFilter}
                  options={[
                    { value: 'open', label: 'Aperti', count: openTasks.length },
                    { value: 'done', label: 'Completati', count: doneTasks.length },
                    { value: 'all', label: 'Tutti', count: tasks.length },
                  ]}
                />
              </div>

              {visibleGroups.length === 0 || visibleGroups.every((g) => g.items.length === 0) ? (
                <section className="panel">
                  <EmptyState title={filter === 'open' ? 'Tutto fatto' : 'Nessun task completato'}>
                    {filter === 'open' ? 'Non ci sono task aperti. Aggiungine uno o goditi la pausa.' : 'I task spuntati compariranno qui.'}
                  </EmptyState>
                </section>
              ) : (
                <div className="panel grouped-list">
                  {visibleGroups.map((group) => (
                    <div className="list-group" key={group.id}>
                      <h2 className={`list-group-title${group.id === 'overdue' ? ' text-danger' : ''}`}>
                        {group.title} <span className="num">{group.items.length}</span>
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
              <h2 id="planner-exams-title" className="panel-title">Esami in arrivo</h2>
              <Link className="text-link" to="/exams">Esami <ArrowRight aria-hidden="true" /></Link>
            </div>
            {upcomingExams.length === 0 ? (
              <EmptyState compact title="Nessun esame in arrivo">Le prove in calendario aiutano a scegliere le scadenze dei task.</EmptyState>
            ) : (
              <ul className="rows">
                {upcomingExams.map((exam) => {
                  const days = daysUntil(exam.exam_date)
                  return (
                    <li className="row" key={exam.id}>
                      <span className="date-block" aria-hidden="true">
                        <span className="date-block-day num">{parseDay(exam.exam_date).getDate()}</span>
                        <span className="date-block-month">{monthShort(exam.exam_date)}</span>
                      </span>
                      <span className="row-main">
                        <span className="row-title">{exam.title}</span>
                        <Meta
                          items={[
                            <>
                              <span className="visually-hidden">{formatDay(exam.exam_date, 'long')}, </span>
                              <span className={`exam-row-days ${urgencyClass(days)}`}>{relativeDay(exam.exam_date)}</span>
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
