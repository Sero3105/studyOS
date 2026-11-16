import { useState } from 'react'
import { Check, ListPlus } from 'lucide-react'
import SittingChecklist from './SittingChecklist'
import { DistractionList } from './Distractions'
import { useTimer } from '../../context/useTimer'
import { useLanguage } from '../../i18n/useLanguage'
import { createTask } from '../../services/taskService'
import { addDays, formatMinutes, todayIso } from '../../utils/dates'
import { sittingSummary } from '../../utils/sitting'

/**
 * Riepilogo a fine seduta: quanto, come (focus), cosa è stato fatto blocco per blocco,
 * cosa resta della checklist (diventa task per domani) e da dove ripartire la prossima volta.
 * "Chiudi" salva la seduta e torna al modulo.
 */
function SittingRecap() {
  const { t } = useLanguage()
  const { config, sitting, setResume, clear } = useTimer()
  const [tasks, setTasks] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  // Voci già diventate task: un nuovo tentativo dopo un errore riparte dalle altre.
  const [created, setCreated] = useState(0)
  if (!config || !sitting) return null
  const summary = sittingSummary(sitting)
  const left = sitting.checklist.filter((item) => !item.done)

  const leftToTasks = async () => {
    setTasks('busy')
    try {
      for (const [i, item] of left.entries()) {
        if (i < created) continue
        await createTask({
          title: item.text, priority: 'medium', due_date: addDays(todayIso(), 1),
          subject_id: config.subjectId ?? undefined, topic_id: config.topicId ?? undefined,
        })
        setCreated(i + 1)
      }
      setTasks('done')
    } catch { setTasks('error') }
  }

  return (
    <div className="sitting-recap">
      <section className="panel figures recap-figures" aria-label={t('sitting.recapTitle')}>
        <div className="figure figure-lead">
          <span className="figure-label">{t('sitting.studied')}</span>
          <span className="figure-value num">{formatMinutes(summary.minutes)}</span>
        </div>
        <dl className="figure-grid">
          <div className="figure">
            <dt className="figure-label">{t('sitting.blocks')}</dt>
            <dd className="figure-value num">{summary.blocks}{summary.partial > 0 && <span className="figure-sub"> · {t('sitting.partialCount', { count: summary.partial })}</span>}</dd>
          </div>
          <div className="figure">
            <dt className="figure-label">{t('session.focus')}</dt>
            <dd className="figure-value">{summary.focus === null ? '—' : t(`session.focus.${Math.round(summary.focus) as 1 | 2 | 3}`)}</dd>
          </div>
          <div className="figure">
            <dt className="figure-label">{t('sitting.checklist')}</dt>
            <dd className="figure-value num">{summary.total ? `${summary.done}/${summary.total}` : '—'}</dd>
          </div>
        </dl>
      </section>

      <section className="panel sitting-panel" aria-labelledby="recap-blocks-title">
        <h2 id="recap-blocks-title" className="panel-title panel-head">{t('sitting.whatYouDid')}</h2>
        <ol className="rows">
          {sitting.blocks.map((block, index) => (
            <li className="row" key={index}>
              <span className="history-duration num">{formatMinutes(block.minutes)}</span>
              <span className="row-main">
                <span className="row-title">{block.note || t('sitting.blockN', { n: index + 1 })}</span>
                <span className="row-meta">
                  {[block.partial && t('sitting.partial'), block.focus && t(`session.focus.${block.focus}`)].filter(Boolean).join(' · ') || t('sitting.notRated')}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <SittingChecklist />
      {left.length > 0 && (
        <div className="recap-tasks" aria-live="polite">
          {tasks === 'done' ? (
            <p className="notice notice-success" role="status"><Check aria-hidden="true" /> {t('sitting.tasksCreated', { count: left.length })}</p>
          ) : (
            <button className="btn btn-secondary" type="button" onClick={() => void leftToTasks()} disabled={tasks === 'busy'}>
              <ListPlus aria-hidden="true" /> {t('sitting.leftToTasks', { count: left.length })}
            </button>
          )}
          {tasks === 'error' && <p className="field-error" role="alert">{t('planner.saveError')}</p>}
        </div>
      )}

      <DistractionList />

      <section className="panel sitting-panel">
        <label className="field">
          <span className="field-label">{t('sitting.resume')} <em>{t('common.optional')}</em></span>
          <textarea rows={2} maxLength={1000} value={sitting.resume} onChange={(e) => setResume(e.target.value)} placeholder={t('sitting.resumePlaceholder')} />
          <span className="field-hint">{t('sitting.resumeHint')}</span>
        </label>
      </section>

      <div className="form-actions">
        <button className="btn btn-primary btn-lg" type="button" onClick={clear}>
          <Check aria-hidden="true" /> {t('sitting.close')}
        </button>
      </div>
    </div>
  )
}

export default SittingRecap
