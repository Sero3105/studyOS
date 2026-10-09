import { useState } from 'react'
import type { FormEvent } from 'react'
import type { StudySessionConfig } from './types'

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
  const [topic, setTopic] = useState('')
  const [subject, setSubject] = useState('')

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
      topic: topic.trim(),
      subject: subject.trim(),
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
          Materia <span>(non ancora implementata)</span>
          <input
            type="text"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Es. Matematica"
          />
        </label>
        <label>
          Argomento <span>(non ancora implementato)</span>
          <input
            type="text"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="Su cosa vuoi lavorare?"
          />
        </label>
        <label>
          Note <span>(non ancora implementate)</span>
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
