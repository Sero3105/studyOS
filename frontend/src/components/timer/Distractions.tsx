import { useState } from 'react'
import type { FormEvent } from 'react'
import { Check, ListPlus, Plus, X } from 'lucide-react'
import { useTimer } from '../../context/useTimer'
import { useLanguage } from '../../i18n/useLanguage'
import { createTask } from '../../services/taskService'
import { DISTRACTION_MAX } from '../../utils/sitting'

/**
 * Durante il blocco: un pensiero che distrae si scrive qui e si torna a studiare.
 * Il timer non si ferma; il numero di distrazioni finisce sul blocco.
 */
export function DistractionCapture() {
  const { t } = useLanguage()
  const { sitting, addDistraction } = useTimer()
  const [draft, setDraft] = useState('')
  const [noted, setNoted] = useState(false)
  if (!sitting) return null

  const add = (event: FormEvent) => {
    event.preventDefault()
    addDistraction(draft)
    setDraft('')
    setNoted(true)
  }

  return (
    <form className="distraction-capture" onSubmit={add}>
      <label className="field-label" htmlFor="distraction-input">{t('sitting.distractionLabel')}</label>
      <div className="sitting-add">
        <input id="distraction-input" className="input" value={draft} maxLength={DISTRACTION_MAX}
          onChange={(e) => { setDraft(e.target.value); setNoted(false) }} placeholder={t('sitting.distractionPlaceholder')} />
        <button className="btn btn-secondary" type="submit" disabled={!draft.trim()}>
          <Plus aria-hidden="true" /> {t('sitting.note')}
        </button>
      </div>
      <p className="field-hint" role="status">{noted ? t('sitting.distractionNoted') : ''}</p>
    </form>
  )
}

/** Le distrazioni annotate: in pausa e nel riepilogo, ognuna può diventare un task del Planner. */
export function DistractionList() {
  const { t } = useLanguage()
  const { sitting, removeDistraction } = useTimer()
  const [created, setCreated] = useState<string[]>([])
  const [error, setError] = useState(false)
  if (!sitting?.distractions.length) return null

  const toTask = (text: string) => {
    setError(false)
    createTask({ title: text.slice(0, 200), priority: 'medium' })
      .then(() => setCreated((c) => [...c, text]))
      .catch(() => setError(true))
  }

  return (
    <section className="panel sitting-panel" aria-labelledby="distractions-title">
      <div className="panel-head">
        <h2 id="distractions-title" className="panel-title">{t('sitting.distractionsTitle')}</h2>
        <span className="panel-meta num">{sitting.distractions.length}</span>
      </div>
      <ul className="rows">
        {sitting.distractions.map((d, index) => (
          <li className="row" key={`${index}-${d.text}`}>
            <span className="row-main">
              <span className="row-title">{d.text}</span>
              <span className="row-meta">{t('sitting.duringBlock', { block: d.block })}</span>
            </span>
            <span className="row-actions">
              {created.includes(d.text) ? (
                <span className="tag tag-success"><Check aria-hidden="true" /> {t('sitting.taskCreated')}</span>
              ) : (
                <button className="icon-btn" type="button" onClick={() => toTask(d.text)} aria-label={t('sitting.toTask', { title: d.text })} title={t('sitting.toTaskShort')}>
                  <ListPlus aria-hidden="true" />
                </button>
              )}
              <button className="icon-btn" type="button" onClick={() => removeDistraction(index)} aria-label={t('sitting.removeDistraction')} title={t('sitting.removeDistraction')}>
                <X aria-hidden="true" />
              </button>
            </span>
          </li>
        ))}
      </ul>
      {error && <p className="field-error" role="alert">{t('planner.saveError')}</p>}
    </section>
  )
}
