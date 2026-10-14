import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteSession, getSessions } from '../services/sessionService'
import type { StudySession } from '../services/sessionService'
import { getSubjects } from '../services/subjectService'
import type { Subject } from '../services/subjectService'

function HistoryPage() {
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async (): Promise<void> => {
    try {
      setError('')
      const [sessionList, subjectList] = await Promise.all([getSessions(), getSubjects()])
      setSessions(sessionList); setSubjects(subjectList)
    } catch (e) { setError(e instanceof Error ? e.message : 'Impossibile caricare lo storico') }
    finally { setLoading(false) }
  }
  useEffect(() => { queueMicrotask(() => { void load() }) }, [])

  const remove = async (id: number) => {
    await deleteSession(id)
    setSessions((s) => s.filter((x) => x.id !== id))
  }

  const subjectName = (id: number | null) => subjects.find((s) => s.id === id)?.name ?? 'Senza materia'
  const topicName = (session: StudySession) =>
    subjects.find((s) => s.id === session.subject_id)?.topics.find((t) => t.id === session.topic_id)?.title
  const total = sessions.reduce((sum, s) => sum + s.duration_minutes, 0)

  return (
    <section className="dashboard-page">
      <div className="dashboard-section-heading">
        <div><p className="section-kicker">Track</p><h1>History</h1><p className="muted-note">Sessioni registrate: {sessions.length} · Totale {total} minuti.</p></div>
      </div>
      {loading ? <p>Caricamento storico…</p> : error ? (
        <div className="dashboard-card" role="alert"><h2>Caricamento non riuscito</h2><p>{error}</p><button className="button button-secondary" type="button" onClick={() => void load()}>Riprova</button></div>
      ) : sessions.length === 0 ? (
        <div className="dashboard-card"><h2>Nessuna sessione</h2><p>Completa una sessione dal Timer per vederla qui.</p></div>
      ) : (
        <div>
          {[...new Set(sessions.map((s) => s.studied_on))].map((day) => {
            const daySessions = sessions.filter((s) => s.studied_on === day)
            const dayTotal = daySessions.reduce((sum, s) => sum + s.duration_minutes, 0)
            return (
              <div className="history-day" key={day}>
                <div className="history-day-head"><h2>{new Intl.DateTimeFormat('it-IT', { dateStyle: 'full' }).format(new Date(`${day}T00:00:00`))}</h2><span className="muted-note">{dayTotal} minuti · {daySessions.length} sessioni</span></div>
                {daySessions.map((session) => (
                  <article className="dashboard-card task-row" key={session.id}>
                    <div>
                      <h3>{subjectName(session.subject_id)}{topicName(session) ? ` / ${topicName(session)}` : ''}</h3>
                      <p className="muted-note">{session.duration_minutes} minuti{session.notes ? ` · ${session.notes}` : ''}</p>
                    </div>
                    <button className="icon-action" type="button" onClick={() => void remove(session.id)} aria-label="Elimina sessione"><Trash2 size={16} /></button>
                  </article>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default HistoryPage
