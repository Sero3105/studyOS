import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { StudySessionConfig } from './types'
import { getSubjects } from '../../services/subjectService'
import type { Subject } from '../../services/subjectService'

interface SessionSetupFormProps {
  onSubmit: (config: StudySessionConfig) => void
  onCancel?: () => void
  showCancel?: boolean
}

function SessionSetupForm({
  onSubmit,
  onCancel,
  showCancel = false,
}: SessionSetupFormProps) {
  const [focusMinutes, setFocusMinutes] = useState('')
  const [breakMinutes, setBreakMinutes] = useState('')
  const [notes, setNotes] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [subjects, setSubjects] = useState<Subject[]>([])

  useEffect(() => {
    getSubjects().then(setSubjects).catch(() => setSubjects([]))
  }, [])

  const selectedSubject = subjects.find((s) => s.id === Number(subjectId))
  const selectedTopic = selectedSubject?.topics.find((t) => t.id === Number(topicId))

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const focusDuration = Number(focusMinutes)
    const breakDuration = Number(breakMinutes)

    if (focusDuration <= 0 || breakDuration <= 0) {
      return
    }

    onSubmit({
      focusMinutes: focusDuration,
      breakMinutes: breakDuration,
      notes: notes.trim(),
      subjectId: subjectId ? Number(subjectId) : null,
      topicId: topicId ? Number(topicId) : null,
      subject: selectedSubject?.name ?? '',
      topic: selectedTopic?.title ?? '',
    })
  }

  return (
    <form className="session-setup-form" onSubmit={handleSubmit}>
      <div className="session-setup-fields session-setup-durations">
        <label>
          Durata studio (minuti)
          <input
            type="number"
            min="1"
            step="1"
            value={focusMinutes}
            onChange={(event) => setFocusMinutes(event.target.value)}
            placeholder="Inserisci la durata"
            required
          />
        </label>
        <label>
          Durata pausa (minuti)
          <input
            type="number"
            min="1"
            step="1"
            value={breakMinutes}
            onChange={(event) => setBreakMinutes(event.target.value)}
            placeholder="Inserisci la durata"
            required
          />
        </label>
      </div>

      <div className="session-setup-fields">
        <label>
          Materia
          <select value={subjectId} onChange={(event) => { setSubjectId(event.target.value); setTopicId('') }}>
            <option value="">Nessuna</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label>
          Argomento
          <select value={topicId} onChange={(event) => setTopicId(event.target.value)} disabled={!selectedSubject}>
            <option value="">Nessuno</option>
            {selectedSubject?.topics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </label>
        <label>
          Note
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Aggiungi una nota per questa sessione"
            rows={3}
          />
        </label>
      </div>

      <div className="session-setup-actions">
        {showCancel && onCancel && (
          <button className="button button-secondary" type="button" onClick={onCancel}>
            Annulla
          </button>
        )}
        <button className="button button-primary" type="submit">
          Avvia sessione
        </button>
      </div>
    </form>
  )
}

export default SessionSetupForm
