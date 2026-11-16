import { EmptyState } from '../ui/Feedback'
import ProgressBar from '../ui/ProgressBar'
import type { StudySession } from '../../services/sessionService'
import { studyQuality } from '../../utils/studyStats'
import type { FocusRow } from '../../utils/studyStats'
import type { TranslationKey } from '../../i18n/translations'
import { useLanguage } from '../../i18n/useLanguage'

/** Focus medio per gruppo, in ordine naturale; il migliore è l'unico in accento. */
function FocusList<K extends string>({ rows, label, name }: { rows: FocusRow<K>[]; label: string; name: (key: K) => string }) {
  const { t, locale } = useLanguage()
  const best = Math.max(...rows.map((r) => r.average))
  return (
    <ol className="ranked ranked-natural" aria-label={label}>
      {rows.map((row) => (
        <li className={`ranked-row${rows.length > 1 && row.average === best ? ' is-best' : ''}`} key={row.key}
          title={t('stats.focusDetail', { value: row.average.toLocaleString(locale, { maximumFractionDigits: 1 }), count: row.count })}>
          <span className="ranked-name">{name(row.key)}</span>
          <span className="ranked-track" aria-hidden="true"><span style={{ width: `${Math.max(4, ((row.average - 1) / 2) * 100)}%` }} /></span>
          <span className="ranked-value">{t(`session.focus.${Math.round(row.average) as 1 | 2 | 3}`)}</span>
        </li>
      ))}
    </ol>
  )
}

/**
 * Come studi, non solo quanto: blocchi finiti contro interrotti, distrazioni per blocco,
 * e con quale durata e in che momento del giorno il focus è più alto.
 */
function StudyQuality({ sessions }: { sessions: StudySession[] }) {
  const { t, locale } = useLanguage()
  const q = studyQuality(sessions)
  const number = (value: number) => value.toLocaleString(locale, { maximumFractionDigits: 1 })

  return (
    <div className="stats-pair">
      <section className="panel progress-panel" aria-labelledby="stats-quality-title">
        <h2 id="stats-quality-title" className="panel-title">{t('stats.qualityTitle')}</h2>
        {q.completion === null ? (
          <EmptyState compact title={t('stats.qualityEmptyTitle')}>{t('stats.qualityEmptyBody')}</EmptyState>
        ) : (
          <>
            <div className="progress-stat">
              <div className="progress-stat-line">
                <span>{t('stats.completedBlocks')}</span>
                <span className="num">{t('stats.ofBlocks', { done: q.blocks - q.partial, total: q.blocks })}</span>
              </div>
              <ProgressBar percent={Math.round(q.completion * 100)} label={t('stats.completedBlocks')} />
            </div>
            <div className="progress-stat-line">
              <span>{t('stats.distractionsPerBlock')}</span>
              <span className="num">{number(q.distractions ?? 0)}</span>
            </div>
          </>
        )}
        {q.byLength.length > 0 && (
          <div className="progress-stat">
            <h3 className="quality-subtitle">{t('stats.focusByLength')}</h3>
            <FocusList rows={q.byLength} label={t('stats.focusByLength')} name={(k) => t(`stats.length.${k}` as TranslationKey)} />
          </div>
        )}
      </section>

      <section className="panel" aria-labelledby="stats-band-title">
        <h2 id="stats-band-title" className="panel-title panel-head">{t('stats.focusByBand')}</h2>
        {q.byBand.length === 0 ? (
          <EmptyState compact title={t('stats.focusEmptyTitle')}>{t('stats.focusEmptyBody')}</EmptyState>
        ) : (
          <FocusList rows={q.byBand} label={t('stats.focusByBand')} name={(k) => t(`stats.band.${k}` as TranslationKey)} />
        )}
      </section>
    </div>
  )
}

export default StudyQuality
