import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import type { CreateExamPayload } from '../../services/examService'

interface ExamFormProps {
  onSave: (payload: CreateExamPayload) => Promise<void>
  onCancel: () => void
  initial?: CreateExamPayload
}

function ExamForm({ onSave, onCancel, initial }: ExamFormProps) {
  const [data, setData] = useState<CreateExamPayload>(initial ?? {
    title: '',
    subject: '',
    exam_date: '',
    status: 'planned',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setData((currentData) => ({
      ...currentData,
      [event.target.name]: event.target.value,
    }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      await onSave(data)
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'Salvataggio non riuscito',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="exam-form" onSubmit={handleSubmit}>
      <div className="exam-form-section">
        <p className="exam-form-section-title">Informazioni principali</p>
        <div className="exam-form-grid exam-form-grid-primary">
          <label className="exam-form-field" htmlFor="exam-title">
            <span className="exam-field-label">Nome esame</span>
            <input
              id="exam-title"
              name="title"
              required
              maxLength={120}
              placeholder="Es. Analisi 1"
              value={data.title}
              onChange={handleChange}
            />
          </label>
          <label className="exam-form-field" htmlFor="exam-subject">
            <span className="exam-field-label">Materia</span>
            <input
              id="exam-subject"
              name="subject"
              required
              maxLength={120}
              placeholder="Es. Matematica"
              value={data.subject}
              onChange={handleChange}
            />
          </label>
        </div>
      </div>

      <div className="exam-form-section">
        <p className="exam-form-section-title">Quando e dove</p>
        <div className="exam-form-grid exam-form-grid-three">
          <label className="exam-form-field" htmlFor="exam-date">
            <span className="exam-field-label">Data</span>
            <input
              id="exam-date"
              name="exam_date"
              type="date"
              required
              value={data.exam_date}
              onChange={handleChange}
            />
          </label>
          <label className="exam-form-field" htmlFor="exam-time">
            <span className="exam-field-label">Ora <em>(opzionale)</em></span>
            <input
              id="exam-time"
              name="exam_time"
              type="time"
              value={data.exam_time ?? ''}
              onChange={handleChange}
            />
          </label>
          <label className="exam-form-field" htmlFor="exam-location">
            <span className="exam-field-label">Luogo <em>(opzionale)</em></span>
            <input
              id="exam-location"
              name="location"
              maxLength={120}
              placeholder="Es. Aula A2"
              value={data.location ?? ''}
              onChange={handleChange}
            />
          </label>
        </div>
      </div>

      <div className="exam-form-section exam-form-section-last">
        <div className="exam-form-grid exam-form-grid-status">
          <label className="exam-form-field" htmlFor="exam-status">
            <span className="exam-field-label">Stato</span>
            <select id="exam-status" name="status" value={data.status} onChange={handleChange}>
              <option value="planned">Da preparare</option>
              <option value="in_progress">In preparazione</option>
              <option value="passed">Superato</option>
              <option value="failed">Non superato</option>
            </select>
          </label>
          <label className="exam-form-field exam-form-field-notes" htmlFor="exam-notes">
            <span className="exam-field-label">Note <em>(opzionale)</em></span>
            <textarea
              id="exam-notes"
              name="notes"
              maxLength={2000}
              placeholder="Aggiungi una nota o un obiettivo di studio..."
              value={data.notes ?? ''}
              onChange={handleChange}
              rows={3}
            />
          </label>
        </div>
      </div>

      {error && (
        <p className="exam-form-error" role="alert">
          {error}
        </p>
      )}

      <div className="exam-actions">
        <button className="button button-secondary" type="button" onClick={onCancel}>
          Annulla
        </button>
        <button className="button" type="submit" disabled={saving}>
          {saving ? 'Salvataggio…' : 'Salva esame'}
        </button>
      </div>
    </form>
  )
}

export default ExamForm
