import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Task } from '../../services/taskService'
import { useLanguage } from '../../i18n/useLanguage'
import DatePicker from '../ui/DatePicker'
import { Button } from '../ui/button'
import { Field, FieldGroup, FieldLabel } from '../ui/field'
import { Input } from '../ui/input'
import { NativeSelect, NativeSelectOption } from '../ui/native-select'

const DURATIONS = [25, 50, 90, 120, 180]

/**
 * Giorno, ora e durata di un task: il blocco orario nel calendario.
 * È anche l'alternativa da tastiera (e da telefono) al trascinamento tra i giorni.
 */
function BlockEditor({ task, defaultDay, onSave, onCancel }: {
  task: Task
  defaultDay: string
  onSave: (patch: Partial<Task>) => Promise<void>
  onCancel: () => void
}) {
  const { t } = useLanguage()
  const [day, setDay] = useState(task.due_date ?? defaultDay)
  const [time, setTime] = useState(task.scheduled_time?.slice(0, 5) ?? '09:00')
  const [minutes, setMinutes] = useState(String(task.planned_minutes ?? 50))
  const [busy, setBusy] = useState(false)

  const save = async (patch: Partial<Task>) => {
    setBusy(true)
    try { await onSave(patch) } finally { setBusy(false) }
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!day || !time) return
    void save({ due_date: day, scheduled_time: `${time}:00`, planned_minutes: Number(minutes) })
  }

  return (
    <form onSubmit={submit} onKeyDown={(e) => { if (e.key === 'Escape') onCancel() }}>
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="block-day">{t('calendar.blockDay')}</FieldLabel>
          <DatePicker id="block-day" required value={day} onChange={setDay} aria-label={t('calendar.blockDay')} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="block-time">{t('calendar.blockTime')}</FieldLabel>
            <Input id="block-time" type="time" required step={300} className="font-mono" value={time} onChange={(e) => setTime(e.target.value)} autoFocus />
          </Field>
          <Field>
            <FieldLabel htmlFor="block-minutes">{t('calendar.blockMinutes')}</FieldLabel>
            <NativeSelect id="block-minutes" className="w-full" value={minutes} onChange={(e) => setMinutes(e.target.value)}>
              {DURATIONS.map((m) => <NativeSelectOption key={m} value={m}>{m} min</NativeSelectOption>)}
            </NativeSelect>
          </Field>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {task.scheduled_time && (
            <Button type="button" variant="ghost" className="sm:mr-auto" disabled={busy} onClick={() => void save({ scheduled_time: null, planned_minutes: null })}>
              {t('calendar.blockRemove')}
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onCancel}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={busy}>{t('history.save')}</Button>
        </div>
      </FieldGroup>
    </form>
  )
}

export default BlockEditor
