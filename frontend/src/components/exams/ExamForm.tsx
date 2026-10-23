import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import type { CreateExamPayload } from '../../services/examService'
import { errorMessage } from '../../utils/errors'
import { useLanguage } from '../../i18n/useLanguage'

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
  const { t } = useLanguage()
  const [data, setData] = useState<CreateExamPayload>(initial ?? {
    title: '',
    subject: '',
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

    const passed = data.status === 'passed'
    const grade = passed && data.grade ? Number(data.grade) : null
    try {
      await onSave({ ...data, exam_date: data.exam_date || null, cfu: data.cfu ? Number(data.cfu) : null, grade, honors: grade === 30 && Boolean(data.honors) })
    } catch (saveError) {
      setError(errorMessage(saveError, t('exams.saveError')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="stacked-form" onSubmit={handleSubmit}>
      <fieldset className="form-block">
        <legend>{t('exams.formExam')}</legend>
        <div className="form-grid">
          <label className="field">
            <span className="field-label">{t('exams.formName')}</span>
            <input
              name="title"
              required
              maxLength={120}
              placeholder={t('exams.formNamePlaceholder')}
              value={data.title}
              onChange={handleChange}
            />
          </label>
          <label className="field">
            <span className="field-label">{t('exams.formSubject')}</span>
            <input
              name="subject"
              required
              maxLength={120}
              placeholder={t('exams.formSubjectPlaceholder')}
              value={data.subject}
              onChange={handleChange}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="form-block">
        <legend>{t('exams.formWhenWhere')}</legend>
        <div className="form-grid form-grid-3">
          <label className="field">
            <span className="field-label">{t('exams.formDate')} <em>{t('exams.formDateHint')}</em></span>
            <input
              name="exam_date"
              type="date"
              value={data.exam_date ?? ''}
              onChange={handleChange}
            />
          </label>
          <label className="field">
            <span className="field-label">{t('exams.formTime')} <em>{t('common.optional')}</em></span>
            <input
              name="exam_time"
              type="time"
              value={data.exam_time ?? ''}
              onChange={handleChange}
            />
          </label>
          <label className="field">
            <span className="field-label">{t('exams.formLocation')} <em>{t('common.optional')}</em></span>
            <input
              name="location"
              maxLength={120}
              placeholder={t('exams.formLocationPlaceholder')}
              value={data.location ?? ''}
              onChange={handleChange}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="form-block">
        <legend>{t('exams.formPreparation')}</legend>
        <label className="field form-narrow">
          <span className="field-label">{t('exams.formStatus')}</span>
          <select name="status" value={data.status} onChange={handleChange}>
            <option value="planned">{t('exams.status.planned')}</option>
            <option value="in_progress">{t('exams.status.in_progress')}</option>
            <option value="passed">{t('exams.status.passed')}</option>
            <option value="failed">{t('exams.status.failed')}</option>
          </select>
        </label>
        <div className="form-grid form-grid-3">
          <label className="field">
            <span className="field-label">{t('exams.formCfu')} <em>{t('common.optional')}</em></span>
            <input name="cfu" type="number" min={1} max={30} inputMode="numeric" value={data.cfu ?? ''} onChange={handleChange} />
          </label>
          {data.status === 'passed' && (
            <>
              <label className="field">
                <span className="field-label">{t('exams.formGrade')}</span>
                <input name="grade" type="number" min={18} max={30} inputMode="numeric" value={data.grade ?? ''} onChange={handleChange} />
              </label>
              <label className="settings-toggle exam-honors">
                <input
                  className="check"
                  type="checkbox"
                  checked={Boolean(data.honors) && Number(data.grade) === 30}
                  disabled={Number(data.grade) !== 30}
                  onChange={(e) => setData((d) => ({ ...d, honors: e.target.checked }))}
                />
                <span>{t('exams.formHonors')}</span>
              </label>
            </>
          )}
        </div>
        <label className="field">
          <span className="field-label">{t('exams.formNotes')} <em>{t('common.optional')}</em></span>
          <textarea
            name="notes"
            maxLength={2000}
            placeholder={t('exams.formNotesPlaceholder')}
            value={data.notes ?? ''}
            onChange={handleChange}
            rows={3}
          />
        </label>
      </fieldset>

      {error && <p className="notice notice-error" role="alert">{error}</p>}

      <div className="form-actions">
        <button className="btn btn-ghost" type="button" onClick={onCancel}>
          {t('common.cancel')}
        </button>
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? t('common.saving') : initial ? t('exams.saveChanges') : t('exams.newExam')}
        </button>
      </div>
    </form>
  )
}

export default ExamForm
