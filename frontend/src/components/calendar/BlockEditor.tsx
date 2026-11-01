import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Task } from '../../services/taskService'
import { useLanguage } from '../../i18n/useLanguage'

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
    <form className="block-editor" onSubmit={submit} onKeyDown={(e) => { if (e.key === 'Escape') onCancel() }}>
      <label className="field">
        <span className="field-label">{t('calendar.blockDay')}</span>
        <input type="date" required value={day} onChange={(e) => setDay(e.target.value)} />
      </label>
      <div className="block-editor-row">
        <label className="field">
          <span className="field-label">{t('calendar.blockTime')}</span>
          <input type="time" required step={300} value={time} onChange={(e) => setTime(e.target.value)} autoFocus />
        </label>
        <label className="field">
          <span className="field-label">{t('calendar.blockMinutes')}</span>
          <select value={minutes} onChange={(e) => setMinutes(e.target.value)}>
            {DURATIONS.map((m) => <option key={m} value={m}>{m} min</option>)}
          </select>
        </label>
      </div>
      <div className="block-editor-actions">
        {task.scheduled_time && (
          <button className="btn btn-ghost" type="button" disabled={busy} onClick={() => void save({ scheduled_time: null, planned_minutes: null })}>
            {t('calendar.blockRemove')}
          </button>
        )}
        <button className="btn btn-ghost" type="button" onClick={onCancel}>{t('common.cancel')}</button>
        <button className="btn btn-primary" type="submit" disabled={busy}>{t('history.save')}</button>
      </div>
    </form>
  )
}

export default BlockEditor
