import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Plus } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import ProgressBar from '../components/ui/ProgressBar'
import ConfirmButton from '../components/ui/ConfirmButton'
import { EmptyState, ErrorNotice, LoadingRows } from '../components/ui/Feedback'
import type { StudySessionConfig } from '../components/timer/types'
import { createSubject, createTopic, deleteSubject, deleteTopic, getSubjects, updateTopic } from '../services/subjectService'
import type { Subject, Topic } from '../services/subjectService'
import { getStatsSummary } from '../services/statsService'
import { formatMinutes } from '../utils/dates'
import { errorMessage } from '../utils/errors'

function progressOf(topics: Topic[]): number {
  if (topics.length === 0) return 0
  return Math.round((topics.filter((topic) => topic.completed).length / topics.length) * 100)
}

/**
 * Materie: elenco a sinistra, dettaglio della materia scelta a destra.
 * Il dettaglio mostra avanzamento, tempo studiato e argomenti, con l'azione
 * per iniziare subito una sessione su quella materia.
 */
function SubjectsPage() {
  const navigate = useNavigate()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [minutesBySubject, setMinutesBySubject] = useState<Record<string, number>>({})
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [topicTitle, setTopicTitle] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async (): Promise<void> => {
    try {
      setError('')
      const list = await getSubjects()
      setSubjects(list)
      setSelectedId((current) => current ?? list[0]?.id ?? null)
    } catch (e) {
      setError(errorMessage(e, 'Impossibile caricare le materie'))
    } finally {
      setLoading(false)
    }
    // Il tempo per materia è un dato di contorno: se non arriva, la pagina funziona lo stesso.
    getStatsSummary()
      .then((stats) => setMinutesBySubject(Object.fromEntries(stats.by_subject.map((x) => [x.name, x.minutes]))))
      .catch(() => setMinutesBySubject({}))
  }
  useEffect(() => { queueMicrotask(() => { void load() }) }, [])

  const selected = subjects.find((subject) => subject.id === selectedId) ?? null

  const run = async (action: () => Promise<void>, fallback: string) => {
    try { setError(''); await action() }
    catch (e) { setError(errorMessage(e, fallback)) }
  }

  const addSubject = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await run(async () => {
      const created = await createSubject(name.trim())
      setSubjects((s) => [...s, created])
      setSelectedId(created.id)
      setName('')
    }, 'Salvataggio non riuscito')
    setSaving(false)
  }

  const addTopic = async (event: FormEvent) => {
    event.preventDefault()
    const title = topicTitle.trim()
    if (!selected || !title) return
    await run(async () => {
      const topic = await createTopic(selected.id, title)
      setSubjects((s) => s.map((x) => x.id === selected.id ? { ...x, topics: [...x.topics, topic] } : x))
      setTopicTitle('')
    }, 'Impossibile aggiungere l\'argomento')
  }

  const toggleTopic = (subjectId: number, topicId: number, completed: boolean) =>
    run(async () => {
      const updated = await updateTopic(topicId, completed)
      setSubjects((s) => s.map((x) => x.id === subjectId ? { ...x, topics: x.topics.map((t) => t.id === topicId ? updated : t) } : x))
    }, 'Impossibile aggiornare l\'argomento')

  const removeTopic = (subjectId: number, topicId: number) =>
    run(async () => {
      await deleteTopic(topicId)
      setSubjects((s) => s.map((x) => x.id === subjectId ? { ...x, topics: x.topics.filter((t) => t.id !== topicId) } : x))
    }, 'Impossibile eliminare l\'argomento')

  const removeSubject = (id: number) =>
    run(async () => {
      await deleteSubject(id)
      const remaining = subjects.filter((x) => x.id !== id)
      setSubjects(remaining)
      setSelectedId(remaining[0]?.id ?? null)
    }, 'Impossibile eliminare la materia')

  const startSession = (subject: Subject) => {
    const config: StudySessionConfig = {
      focusMinutes: 25,
      breakMinutes: 5,
      notes: '',
      subjectId: subject.id,
      topicId: null,
      subject: subject.name,
      topic: '',
    }
    navigate('/timer', { state: config })
  }

  const addSubjectForm = (
    <form className="inline-form" onSubmit={addSubject}>
      <label className="visually-hidden" htmlFor="new-subject">Nuova materia</label>
      <input
        id="new-subject"
        className="input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nuova materia"
        maxLength={120}
      />
      <button className="btn btn-secondary" type="submit" disabled={saving || !name.trim()}>
        <Plus aria-hidden="true" /> Aggiungi
      </button>
    </form>
  )

  return (
    <div className="page subjects-page">
      <PageHeader
        title="Materie"
        description="Ogni materia raccoglie i suoi argomenti: spuntali man mano che li completi."
      />

      {error && <ErrorNotice message={error} onDismiss={() => setError('')} />}

      {loading ? (
        <LoadingRows label="Caricamento materie" />
      ) : subjects.length === 0 ? (
        <section className="panel subjects-empty">
          <EmptyState title="Nessuna materia">
            Crea la prima materia, poi aggiungi gli argomenti da studiare.
          </EmptyState>
          {addSubjectForm}
        </section>
      ) : (
        <div className="subjects-layout">
          <section className="panel subject-index" aria-labelledby="subject-index-title">
            <h2 id="subject-index-title" className="panel-title">
              {subjects.length} {subjects.length === 1 ? 'materia' : 'materie'}
            </h2>
            <ul className="subject-nav">
              {subjects.map((subject) => {
                const percent = progressOf(subject.topics)
                const minutes = minutesBySubject[subject.name]
                return (
                  <li key={subject.id}>
                    <button
                      type="button"
                      className="subject-nav-item"
                      aria-current={subject.id === selectedId ? 'true' : undefined}
                      onClick={() => setSelectedId(subject.id)}
                    >
                      <span className="subject-nav-name">{subject.name}</span>
                      <span className="subject-nav-meta num">
                        {subject.topics.length ? `${percent}%` : 'Nessun argomento'}
                        {minutes ? ` · ${formatMinutes(minutes)}` : ''}
                      </span>
                      <ProgressBar percent={percent} label={`Avanzamento ${subject.name}`} />
                    </button>
                  </li>
                )
              })}
            </ul>
            {addSubjectForm}
          </section>

          {selected && (
            <section className="panel subject-detail" aria-labelledby="subject-detail-title">
              <div className="subject-detail-head">
                <div>
                  <h2 id="subject-detail-title">{selected.name}</h2>
                  <p className="panel-meta num">
                    {selected.topics.filter((t) => t.completed).length} di {selected.topics.length} argomenti completati
                    {minutesBySubject[selected.name] ? ` · ${formatMinutes(minutesBySubject[selected.name])} studiati` : ''}
                  </p>
                </div>
                <div className="row-actions">
                  <button className="btn btn-primary" type="button" onClick={() => startSession(selected)}>
                    <Play aria-hidden="true" /> Studia 25 min
                  </button>
                  <ConfirmButton label={`Elimina la materia ${selected.name} e i suoi argomenti`} onConfirm={() => removeSubject(selected.id)} />
                </div>
              </div>

              {selected.topics.length > 0 && (
                <ProgressBar percent={progressOf(selected.topics)} label={`Avanzamento ${selected.name}`} />
              )}

              <form className="inline-form" onSubmit={addTopic}>
                <label className="visually-hidden" htmlFor="new-topic">Nuovo argomento per {selected.name}</label>
                <input
                  id="new-topic"
                  className="input"
                  value={topicTitle}
                  onChange={(e) => setTopicTitle(e.target.value)}
                  placeholder="Aggiungi un argomento e premi Invio"
                  maxLength={200}
                />
                <button className="btn btn-secondary" type="submit" disabled={!topicTitle.trim()}>
                  <Plus aria-hidden="true" /> Aggiungi
                </button>
              </form>

              {selected.topics.length === 0 ? (
                <EmptyState compact title="Ancora nessun argomento">
                  Dividi la materia in capitoli o temi: il progresso si calcola da qui.
                </EmptyState>
              ) : (
                <ul className="rows topic-rows">
                  {selected.topics.map((topic) => (
                    <li className="row" key={topic.id}>
                      <label className="topic-label">
                        <input
                          className="check"
                          type="checkbox"
                          checked={topic.completed}
                          onChange={(e) => void toggleTopic(selected.id, topic.id, e.target.checked)}
                        />
                        <span className={topic.completed ? 'is-done' : undefined}>{topic.title}</span>
                      </label>
                      <span className="row-reveal">
                        <ConfirmButton label={`Elimina ${topic.title}`} onConfirm={() => removeTopic(selected.id, topic.id)} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  )
}

export default SubjectsPage
