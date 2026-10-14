import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { BookOpen, Plus, Trash2 } from 'lucide-react'
import { createSubject, createTopic, deleteSubject, deleteTopic, getSubjects, updateTopic } from '../services/subjectService'
import type { Subject } from '../services/subjectService'

function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [topicTitles, setTopicTitles] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState(false)

  const load = async (): Promise<void> => {
    try { setError(''); setSubjects(await getSubjects()) }
    catch (e) { setError(e instanceof Error ? e.message : 'Impossibile caricare le materie') }
    finally { setLoading(false) }
  }
  useEffect(() => { queueMicrotask(() => { void load() }) }, [])

  const addSubject = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try { const created = await createSubject(name.trim()); setSubjects((s) => [...s, created]); setName('') }
    catch (e) { setError(e instanceof Error ? e.message : 'Salvataggio non riuscito') }
    finally { setSaving(false) }
  }

  const addTopic = async (subjectId: number) => {
    const title = (topicTitles[subjectId] ?? '').trim()
    if (!title) return
    const topic = await createTopic(subjectId, title)
    setSubjects((s) => s.map((x) => x.id === subjectId ? { ...x, topics: [...x.topics, topic] } : x))
    setTopicTitles((t) => ({ ...t, [subjectId]: '' }))
  }

  const toggleTopic = async (subjectId: number, topicId: number, completed: boolean) => {
    const updated = await updateTopic(topicId, completed)
    setSubjects((s) => s.map((x) => x.id === subjectId ? { ...x, topics: x.topics.map((t) => t.id === topicId ? updated : t) } : x))
  }

  const removeTopic = async (subjectId: number, topicId: number) => {
    await deleteTopic(topicId)
    setSubjects((s) => s.map((x) => x.id === subjectId ? { ...x, topics: x.topics.filter((t) => t.id !== topicId) } : x))
  }

  const removeSubject = async (id: number) => {
    await deleteSubject(id)
    setSubjects((s) => s.filter((x) => x.id !== id))
  }

  return (
    <section className="dashboard-page">
      <div className="dashboard-section-heading">
        <div><p className="section-kicker">Library</p><h1>Materie e argomenti</h1><p className="muted-note">Organizza le materie e i topic da studiare.</p></div>
      </div>

      <form className="dashboard-card inline-create" onSubmit={addSubject}>
        <label>
          Nuova materia
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Computer Networks" required maxLength={120} />
        </label>
        <button className="button button-primary" type="submit" disabled={saving}><Plus size={16} aria-hidden="true" /> Aggiungi</button>
      </form>

      {loading ? <p>Caricamento materie…</p> : error ? (
        <div className="dashboard-card" role="alert"><h2>Caricamento non riuscito</h2><p>{error}</p><button className="button button-secondary" type="button" onClick={load}>Riprova</button></div>
      ) : subjects.length === 0 ? (
        <div className="dashboard-card"><h2>Nessuna materia</h2><p>Crea la prima materia per iniziare a organizzare lo studio.</p></div>
      ) : (
        <div className="card-list">
          {subjects.map((subject) => (
            <article className="dashboard-card" key={subject.id}>
              <div className="card-row-between">
                <h2><BookOpen size={18} aria-hidden="true" /> {subject.name}</h2>
                <button className="icon-action" type="button" onClick={() => removeSubject(subject.id)} aria-label={`Elimina ${subject.name}`}><Trash2 size={16} /></button>
              </div>
              {subject.topics.length === 0 ? <p className="muted-note">Nessun argomento.</p> : (
                <ul className="topic-list">
                  {subject.topics.map((topic) => (
                    <li key={topic.id}>
                      <label><input type="checkbox" checked={topic.completed} onChange={(e) => void toggleTopic(subject.id, topic.id, e.target.checked)} /> <span className={topic.completed ? 'done-text' : ''}>{topic.title}</span></label>
                      <button className="icon-action" type="button" onClick={() => void removeTopic(subject.id, topic.id)} aria-label={`Elimina ${topic.title}`}><Trash2 size={14} /></button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="inline-create">
                <input value={topicTitles[subject.id] ?? ''} onChange={(e) => setTopicTitles((t) => ({ ...t, [subject.id]: e.target.value }))} placeholder="Nuovo argomento" maxLength={200} aria-label={`Nuovo argomento per ${subject.name}`} />
                <button className="button button-secondary" type="button" onClick={() => void addTopic(subject.id)}>Aggiungi topic</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default SubjectsPage
