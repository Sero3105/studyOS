import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import type { CreateExamPayload } from '../../services/examService'
import { errorMessage } from '../../utils/errors'

interface ExamFormProps {
  onSave: (payload: CreateExamPayload) => Promise<void>
  onCancel: () => void
  initial?: CreateExamPayload
}

/**
 * Modulo esame in tre gruppi, nell'ordine in cui lo studente ragiona:
 * cosa è, quando e dove, a che punto sono. Annulla e Salva stanno in fondo
 * a destra, con Salva come unica azione primaria.
 */
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
      setError(errorMessage(saveError, 'Salvataggio non riuscito'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="stacked-form" onSubmit={handleSubmit}>
      <fieldset className="form-block">
        <legend>Esame</legend>
        <div className="form-grid">
          <label className="field">
            <span className="field-label">Nome esame</span>
            <input
              name="title"
              required
              maxLength={120}
              placeholder="Es. Analisi 1"
              value={data.title}
              onChange={handleChange}
            />
          </label>
          <label className="field">
            <span className="field-label">Materia</span>
            <input
              name="subject"
              required
              maxLength={120}
              placeholder="Es. Matematica"
              value={data.subject}
              onChange={handleChange}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="form-block">
        <legend>Quando e dove</legend>
        <div className="form-grid form-grid-3">
          <label className="field">
            <span className="field-label">Data</span>
            <input
              name="exam_date"
              type="date"
              required
              value={data.exam_date}
              onChange={handleChange}
            />
          </label>
          <label className="field">
            <span className="field-label">Ora <em>opzionale</em></span>
            <input
              name="exam_time"
              type="time"
              value={data.exam_time ?? ''}
              onChange={handleChange}
            />
          </label>
          <label className="field">
            <span className="field-label">Luogo <em>opzionale</em></span>
            <input
              name="location"
              maxLength={120}
              placeholder="Es. Aula A2"
              value={data.location ?? ''}
              onChange={handleChange}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="form-block">
        <legend>Preparazione</legend>
        <label className="field form-narrow">
          <span className="field-label">Stato</span>
          <select name="status" value={data.status} onChange={handleChange}>
            <option value="planned">Da preparare</option>
            <option value="in_progress">In preparazione</option>
            <option value="passed">Superato</option>
            <option value="failed">Non superato</option>
          </select>
        </label>
        <label className="field">
          <span className="field-label">Note <em>opzionale</em></span>
          <textarea
            name="notes"
            maxLength={2000}
            placeholder="Capitoli da ripassare, materiale, obiettivo di voto…"
            value={data.notes ?? ''}
            onChange={handleChange}
            rows={3}
          />
        </label>
      </fieldset>

      {error && <p className="notice notice-error" role="alert">{error}</p>}

      <div className="form-actions">
        <button className="btn btn-ghost" type="button" onClick={onCancel}>
          Annulla
        </button>
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? 'Salvataggio…' : initial ? 'Salva modifiche' : 'Aggiungi esame'}
        </button>
      </div>
    </form>
  )
}

export default ExamForm
