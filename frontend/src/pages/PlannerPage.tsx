import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, GraduationCap, Plus, Trash2 } from 'lucide-react'
import { createTask, deleteTask, getTasks, updateTask } from '../services/taskService'
import type { Task, TaskPriority, TaskStatus } from '../services/taskService'
import { getSubjects } from '../services/subjectService'
import type { Subject } from '../services/subjectService'
import { getExams } from '../services/examService'
import type { Exam } from '../services/examService'

const statusLabels: Record<TaskStatus, string> = { todo: 'Da fare', in_progress: 'In corso', done: 'Fatto' }
const priorityLabels: Record<TaskPriority, string> = { low: 'Bassa', medium: 'Media', high: 'Alta' }

function PlannerPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
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
    } catch (e) { setError(e instanceof Error ? e.message : 'Impossibile caricare il planner') }
    finally { setLoading(false) }
  }
  useEffect(() => { queueMicrotask(() => { void load() }) }, [])

  const selectedSubject = subjects.find((s) => s.id === Number(subjectId))

  const addTask = async (event: FormEvent) => {
    event.preventDefault()
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
    } catch (e) { setError(e instanceof Error ? e.message : 'Salvataggio non riuscito') }
    finally { setSaving(false) }
  }

  const changeStatus = async (task: Task, status: TaskStatus) => {
    const updated = await updateTask(task.id, { status })
    setTasks((t) => t.map((x) => x.id === task.id ? updated : x))
  }

  const removeTask = async (id: number) => {
    await deleteTask(id)
    setTasks((t) => t.filter((x) => x.id !== id))
  }

  const subjectName = (id: number | null) => subjects.find((s) => s.id === id)?.name
  const topicName = (task: Task) => subjects.find((s) => s.id === task.subject_id)?.topics.find((t) => t.id === task.topic_id)?.title
  const upcomingExams = exams.filter((e) => e.status === 'planned' || e.status === 'in_progress').slice(0, 5)

  return (
    <section className="dashboard-page">
      <div className="dashboard-section-heading">
        <div><p className="section-kicker">Planning</p><h1>Planner</h1><p className="muted-note">Task e prossime scadenze in un unico posto.</p></div>
      </div>

      <form className="dashboard-card task-form" onSubmit={addTask}>
        <label>Titolo<input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} placeholder="Es. Ripasso capitolo 4" /></label>
        <label>Descrizione<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={2000} /></label>
        <div className="form-grid">
          <label>Scadenza<input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label>
          <label>Priorità
            <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              {Object.entries(priorityLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label>Materia
            <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setTopicId('') }}>
              <option value="">Nessuna</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label>Argomento
            <select value={topicId} onChange={(e) => setTopicId(e.target.value)} disabled={!selectedSubject}>
              <option value="">Nessuno</option>
              {selectedSubject?.topics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </label>
        </div>
        <button className="button button-primary" type="submit" disabled={saving}><Plus size={16} aria-hidden="true" /> Aggiungi task</button>
      </form>

      {loading ? <p>Caricamento planner…</p> : error ? (
        <div className="dashboard-card" role="alert"><h2>Caricamento non riuscito</h2><p>{error}</p><button className="button button-secondary" type="button" onClick={() => void load()}>Riprova</button></div>
      ) : (
        <>
          <div className="card-list">
            {tasks.length === 0 ? (
              <div className="dashboard-card"><h2>Nessun task</h2><p>Aggiungi il primo task per pianificare lo studio.</p></div>
            ) : tasks.map((task) => (
              <article className="dashboard-card task-row" key={task.id}>
                <div>
                  <h3 className={task.status === 'done' ? 'done-text' : ''}>{task.title}</h3>
                  {task.description && <p>{task.description}</p>}
                  <p className="muted-note">
                    Priorità {priorityLabels[task.priority]}
                    {task.due_date && <> · Scade {task.due_date}</>}
                    {subjectName(task.subject_id) && <> · {subjectName(task.subject_id)}</>}
                    {topicName(task) && <> / {topicName(task)}</>}
                  </p>
                </div>
                <div className="task-actions">
                  <select value={task.status} onChange={(e) => void changeStatus(task, e.target.value as TaskStatus)} aria-label={`Stato di ${task.title}`}>
                    {Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <button className="icon-action" type="button" onClick={() => void removeTask(task.id)} aria-label={`Elimina ${task.title}`}><Trash2 size={16} /></button>
                </div>
              </article>
            ))}
          </div>

          <article className="dashboard-card">
            <h2><GraduationCap size={18} aria-hidden="true" /> Prossimi esami</h2>
            {upcomingExams.length === 0 ? <p className="muted-note">Nessun esame pianificato.</p> : (
              <ul className="topic-list">
                {upcomingExams.map((exam) => (
                  <li key={exam.id}><span><CalendarClock size={14} aria-hidden="true" /> {exam.title} — {exam.subject}</span><span>{exam.exam_date}{exam.exam_time ? ` ${exam.exam_time.slice(0, 5)}` : ''}</span></li>
                ))}
              </ul>
            )}
            <Link className="text-action" to="/exams">Apri Exams</Link>
          </article>
        </>
      )}
    </section>
  )
}

export default PlannerPage
