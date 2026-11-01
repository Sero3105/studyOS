import type { Readiness } from '../../utils/planning'
import { formatMinutes } from '../../utils/dates'
import { useLanguage } from '../../i18n/useLanguage'

/** Prontezza per un esame: percentuale e barra; il dettaglio (argomenti, carte, piano, ore) è scritto sotto o nel tooltip. */
function ReadinessMeter({ readiness, compact = false }: { readiness: Readiness; compact?: boolean }) {
  const { t } = useLanguage()
  if (readiness.score === null) return null
  const percent = Math.round(readiness.score * 100)
  const tone = percent >= 75 ? 'is-good' : percent >= 40 ? 'is-mid' : 'is-low'
  const details = [
    readiness.topics && t('readiness.topics', { done: readiness.topics.done, total: readiness.topics.total }),
    readiness.cards && t('readiness.cards', { mastered: readiness.cards.mastered, total: readiness.cards.total }),
    readiness.plan && (readiness.plan.late ? t('readiness.late', { count: readiness.plan.late }) : t('readiness.onTrack')),
    readiness.minutes > 0 && t('readiness.studied', { value: formatMinutes(readiness.minutes) }),
  ].filter(Boolean) as string[]

  if (compact) {
    return <span className={`readiness-chip num ${tone}`} title={`${t('readiness.title')}: ${details.join(' · ')}`}>{t('readiness.short', { percent })}</span>
  }
  return (
    <div className={`readiness ${tone}`}>
      <div className="readiness-head">
        <span>{t('readiness.title')}</span>
        <span className="num readiness-value">{percent}%</span>
      </div>
      <div className="readiness-track" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={t('readiness.title')}>
        <span style={{ width: `${percent}%` }} />
      </div>
      <p className="readiness-details">{details.join(' · ')}</p>
    </div>
  )
}

export default ReadinessMeter
