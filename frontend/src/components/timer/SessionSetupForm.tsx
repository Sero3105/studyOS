import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Play } from 'lucide-react'
import type { StudySessionConfig } from './types'
import { getSubjects } from '../../services/subjectService'
import type { Subject } from '../../services/subjectService'

interface SessionSetupFormProps {
  onSubmit: (config: StudySessionConfig) => void
  onCancel?: () => void
  showCancel?: boolean
}

/**
 * Durate rapide: scorciatoie per i ritmi di studio più comuni.
 * Restano modificabili nei campi sotto; "Personalizzata" lascia scrivere.
 */
const presets = [
  { id: '25-5', label: 'Pomodoro', focus: 25, rest: 5 },
  { id: '50-10', label: 'Lunga', focus: 50, rest: 10 },
  { id: '90-15', label: 'Profonda', focus: 90, rest: 15 },
]

function SessionSetupForm({
  onSubmit,
  onCancel,
  showCancel = false,
}: SessionSetupFormProps) {
  const [focusMinutes, setFocusMinutes] = useState('25')
  const [breakMinutes, setBreakMinutes] = useState('5')
  const [notes, setNotes] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    getSubjects().then(setSubjects).catch(() => setSubjects([]))
  }, [])

  const selectedSubject = subjects.find((s) => s.id === Number(subjectId))
  const selectedTopic = selectedSubject?.topics.find((t) => t.id === Number(topicId))
  const activePreset = presets.find(
    (preset) => String(preset.focus) === focusMinutes && String(preset.rest) === breakMinutes,
  )

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const focusDuration = Number(focusMinutes)
    const breakDuration = Number(breakMinutes)

    if (!Number.isInteger(focusDuration) || !Number.isInteger(breakDuration) || focusDuration <= 0 || breakDuration <= 0) {
      setError('Inserisci durate intere maggiori di zero.')
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
    <form className="session-form" onSubmit={handleSubmit} noValidate>
      <fieldset className="session-form-block">
        <legend className="field-label">Durata</legend>
        <div className="preset-list">
          {presets.map((preset) => (
            <button
              key={preset.id}
              className="preset"
              type="button"
              aria-pressed={activePreset?.id === preset.id}
              onClick={() => {
                setFocusMinutes(String(preset.focus))
                setBreakMinutes(String(preset.rest))
                setError('')
              }}
            >
              <span className="preset-name">{preset.label}</span>
              <span className="preset-time num">{preset.focus} + {preset.rest} min</span>
            </button>
          ))}
        </div>
        <div className="form-grid">
          <label className="field">
            <span className="field-label">Studio (minuti)</span>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              value={focusMinutes}
              onChange={(event) => { setFocusMinutes(event.target.value); setError('') }}
              required
              aria-invalid={Boolean(error)}
            />
          </label>
          <label className="field">
            <span className="field-label">Pausa (minuti)</span>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              step="1"
              value={breakMinutes}
              onChange={(event) => { setBreakMinutes(event.target.value); setError('') }}
              required
              aria-invalid={Boolean(error)}
            />
          </label>
        </div>
        {error && <p className="field-error" role="alert">{error}</p>}
      </fieldset>

      <fieldset className="session-form-block">
        <legend className="field-label">Cosa studi</legend>
        <div className="form-grid">
          <label className="field">
            <span className="field-label">Materia <em>opzionale</em></span>
            <select value={subjectId} onChange={(event) => { setSubjectId(event.target.value); setTopicId('') }}>
              <option value="">Nessuna</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Argomento <em>opzionale</em></span>
            <select value={topicId} onChange={(event) => setTopicId(event.target.value)} disabled={!selectedSubject || selectedSubject.topics.length === 0}>
              <option value="">Nessuno</option>
              {selectedSubject?.topics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </label>
        </div>
        <label className="field">
          <span className="field-label">Nota <em>opzionale</em></span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Es. esercizi 1–12 del capitolo 3"
            rows={2}
          />
        </label>
      </fieldset>

      <div className="form-actions">
        {showCancel && onCancel && (
          <button className="btn btn-ghost" type="button" onClick={onCancel}>
            Annulla
          </button>
        )}
        <button className="btn btn-primary btn-lg" type="submit">
          <Play aria-hidden="true" />
          Avvia sessione
        </button>
      </div>
    </form>
  )
}

export default SessionSetupForm
