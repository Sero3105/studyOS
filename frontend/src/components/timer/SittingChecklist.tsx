import { useState } from 'react'
import type { FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { useTimer } from '../../context/useTimer'
import { useLanguage } from '../../i18n/useLanguage'
import { CHECKLIST_MAX, ITEM_MAX } from '../../utils/sitting'

/**
 * Obiettivo e checklist della seduta: si spunta mentre si studia, si aggiunge una voce
 * quando salta fuori. Resta uguale nel riepilogo, dove le voci rimaste diventano task.
 */
function SittingChecklist() {
  const { t } = useLanguage()
  const { config, sitting, toggleItem, addItem } = useTimer()
  const [draft, setDraft] = useState('')
  if (!config || !sitting) return null
  const done = sitting.checklist.filter((item) => item.done).length

  const add = (event: FormEvent) => {
    event.preventDefault()
    addItem(draft)
    setDraft('')
  }

  return (
    <section className="panel sitting-panel" aria-labelledby="sitting-checklist-title">
      <div className="panel-head">
        <h2 id="sitting-checklist-title" className="panel-title">{config.goal || t('sitting.checklist')}</h2>
        {sitting.checklist.length > 0 && <span className="panel-meta num">{t('sitting.progress', { done, total: sitting.checklist.length })}</span>}
      </div>
      {sitting.checklist.length > 0 && (
        <ul className="sitting-checklist">
          {sitting.checklist.map((item, index) => (
            <li key={index}>
              <label className="sitting-item">
                <input className="check" type="checkbox" checked={item.done} onChange={() => toggleItem(index)} />
                <span className={item.done ? 'is-done' : undefined}>{item.text}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      {sitting.checklist.length < CHECKLIST_MAX && (
        <form className="sitting-add" onSubmit={add}>
          <label className="visually-hidden" htmlFor="sitting-add-item">{t('sitting.addItem')}</label>
          <input id="sitting-add-item" className="input" value={draft} maxLength={ITEM_MAX}
            onChange={(e) => setDraft(e.target.value)} placeholder={t('sitting.addItemPlaceholder')} />
          <button className="btn btn-secondary" type="submit" disabled={!draft.trim()}>
            <Plus aria-hidden="true" /> {t('sitting.add')}
          </button>
        </form>
      )}
    </section>
  )
}

export default SittingChecklist
