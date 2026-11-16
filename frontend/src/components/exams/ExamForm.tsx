import { useEffect, useId, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import type { CreateExamPayload } from '../../services/examService'
import { errorMessage } from '../../utils/errors'
import { useLanguage } from '../../i18n/useLanguage'
import { getSubjects } from '../../services/subjectService'
import DatePicker from '../ui/DatePicker'
import { Button } from '../ui/button'
import { Checkbox } from '../ui/checkbox'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet } from '../ui/field'
import { Input } from '../ui/input'
import { NativeSelect, NativeSelectOption } from '../ui/native-select'
import { Spinner } from '../ui/spinner'
import { Textarea } from '../ui/textarea'

interface ExamFormProps {
  onSave: (payload: CreateExamPayload) => Promise<void>
  onCancel: () => void
  initial?: CreateExamPayload
  /** Esame dentro una materia: la materia è fissa, non si sceglie. */
  lockedSubject?: string
  /** Nuova materia: un solo nome, che vale per materia ed esame. */
  subjectFromTitle?: boolean
}

/**
 * Modulo esame in tre gruppi, nell'ordine in cui lo studente ragiona:
 * cosa è, quando e dove, a che punto sono. Annulla e Salva stanno in fondo
 * a destra, con Salva come unica azione primaria.
 */
function ExamForm({ onSave, onCancel, initial, lockedSubject, subjectFromTitle = false }: ExamFormProps) {
  const { t } = useLanguage()
  const [data, setData] = useState<CreateExamPayload>(initial ?? {
    title: lockedSubject ?? '',
    subject: lockedSubject ?? '',
    status: 'planned',
  })
  const subjectFixed = Boolean(lockedSubject) || subjectFromTitle
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  // Suggerimenti: con lo stesso nome di una materia, l'esame le viene collegato (per id) dal backend.
  const [subjectNames, setSubjectNames] = useState<string[]>([])
  const listId = useId()
  const dateId = useId()
  const dateHintId = useId()
  useEffect(() => { getSubjects().then((list) => setSubjectNames(list.map((s) => s.name))).catch(() => {}) }, [])

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
      await onSave({ ...data, subject: lockedSubject ?? (subjectFromTitle ? data.title : data.subject), exam_date: data.exam_date || null, cfu: data.cfu ? Number(data.cfu) : null, grade, honors: grade === 30 && Boolean(data.honors) })
    } catch (saveError) {
      setError(errorMessage(saveError, t('exams.saveError')))
    } finally {
      setSaving(false)
    }
  }

  const optional = <span className="font-normal text-muted-foreground">{t('common.optional')}</span>

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup className="gap-6">
        <FieldSet>
          <FieldLegend>{subjectFromTitle ? t('palette.subject') : t('exams.formExam')}</FieldLegend>
          <div className={subjectFixed ? 'grid gap-4' : 'grid gap-4 sm:grid-cols-2'}>
            <Field>
              <FieldLabel htmlFor="exam-title">{subjectFromTitle ? t('subjects.name') : t('exams.formName')}</FieldLabel>
              <Input id="exam-title" name="title" required maxLength={120} placeholder={subjectFromTitle ? t('subjects.newSubjectPlaceholder') : t('exams.formNamePlaceholder')} value={data.title} onChange={handleChange} autoFocus />
            </Field>
            {!subjectFixed && (
              <Field>
                <FieldLabel htmlFor="exam-subject">{t('exams.formSubject')}</FieldLabel>
                <Input id="exam-subject" name="subject" required maxLength={120} placeholder={t('exams.formSubjectPlaceholder')} value={data.subject} onChange={handleChange} list={listId} />
                <datalist id={listId}>{subjectNames.map((name) => <option key={name} value={name} />)}</datalist>
                <FieldDescription>{t('exams.formSubjectHint')}</FieldDescription>
              </Field>
            )}
          </div>
        </FieldSet>

        <FieldSeparator />

        <FieldSet>
          <FieldLegend>{t('exams.formWhenWhere')}</FieldLegend>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor={dateId}>{t('exams.formDate')} {optional}</FieldLabel>
              <DatePicker
                id={dateId}
                aria-describedby={dateHintId}
                value={data.exam_date ?? ''}
                onChange={(exam_date) => setData((d) => ({ ...d, exam_date }))}
              />
              <FieldDescription id={dateHintId}>{t('exams.formDateHint')}</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="exam-time">{t('exams.formTime')} {optional}</FieldLabel>
              <Input id="exam-time" className="font-mono" name="exam_time" type="time" value={data.exam_time ?? ''} onChange={handleChange} />
            </Field>
            <Field>
              <FieldLabel htmlFor="exam-location">{t('exams.formLocation')} {optional}</FieldLabel>
              <Input id="exam-location" name="location" maxLength={120} placeholder={t('exams.formLocationPlaceholder')} value={data.location ?? ''} onChange={handleChange} />
            </Field>
          </div>
        </FieldSet>

        <FieldSeparator />

        <FieldSet>
          <FieldLegend>{t('exams.formPreparation')}</FieldLegend>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="exam-status">{t('exams.formStatus')}</FieldLabel>
              <NativeSelect id="exam-status" className="w-full" name="status" value={data.status} onChange={handleChange}>
                <NativeSelectOption value="planned">{t('exams.status.planned')}</NativeSelectOption>
                <NativeSelectOption value="in_progress">{t('exams.status.in_progress')}</NativeSelectOption>
                <NativeSelectOption value="passed">{t('exams.status.passed')}</NativeSelectOption>
                <NativeSelectOption value="failed">{t('exams.status.failed')}</NativeSelectOption>
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="exam-cfu">{t('exams.formCfu')} {optional}</FieldLabel>
              <Input id="exam-cfu" className="font-mono" name="cfu" type="number" min={1} max={30} inputMode="numeric" placeholder="6" value={data.cfu ?? ''} onChange={handleChange} />
            </Field>
            {data.status === 'passed' && (
              <Field>
                <FieldLabel htmlFor="exam-grade">{t('exams.formGrade')}</FieldLabel>
                <Input id="exam-grade" className="font-mono" name="grade" type="number" min={18} max={30} inputMode="numeric" placeholder="18–30" value={data.grade ?? ''} onChange={handleChange} />
              </Field>
            )}
            {data.status === 'passed' && (
              <Field orientation="horizontal" className="sm:col-span-3" data-disabled={Number(data.grade) !== 30 || undefined}>
                <Checkbox
                  id="exam-honors"
                  checked={Boolean(data.honors) && Number(data.grade) === 30}
                  disabled={Number(data.grade) !== 30}
                  onCheckedChange={(checked) => setData((d) => ({ ...d, honors: checked === true }))}
                />
                <FieldLabel htmlFor="exam-honors" className="font-normal">{t('exams.formHonors')}</FieldLabel>
              </Field>
            )}
            <Field className="sm:col-span-3">
              <FieldLabel htmlFor="exam-notes">{t('exams.formNotes')} {optional}</FieldLabel>
              <Textarea id="exam-notes" name="notes" maxLength={2000} placeholder={t('exams.formNotesPlaceholder')} value={data.notes ?? ''} onChange={handleChange} rows={3} />
            </Field>
          </div>
        </FieldSet>

        {error && <FieldError>{error}</FieldError>}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Spinner data-icon="inline-start" />}
            {saving ? t('common.saving') : initial ? t('exams.saveChanges') : subjectFromTitle ? t('subjects.create') : lockedSubject ? t('subjects.addExam') : t('exams.newExam')}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}

export default ExamForm
