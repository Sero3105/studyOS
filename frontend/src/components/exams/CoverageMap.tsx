import { useNavigate } from 'react-router-dom'
import { COVERAGE_ORDER } from '../../utils/planning'
import type { TopicCoverage } from '../../utils/planning'
import type { Subject } from '../../services/subjectService'
import { sessionFor } from '../../utils/pomodoro'
import { formatDay, formatMinutes } from '../../utils/dates'
import { useLanguage } from '../../i18n/useLanguage'

export interface ExamCoverage { subject: Subject; topics: TopicCoverage[] }

/** Quanti argomenti per stato, solo quelli che ci sono. */
function counts(topics: TopicCoverage[]) {
  return COVERAGE_ORDER.map((status) => ({ status, items: topics.filter((c) => c.status === status) })).filter((g) => g.items.length)
}

/**
 * Cosa manca per l'esame: una barra con la proporzione di ogni stato e, sotto, gli argomenti
 * raggruppati per stato (il gruppo ha il nome scritto: il colore non è l'unica informazione).
 * Ogni argomento avvia il timer su di sé. `compact`: una riga di testo per l'elenco esami.
 */
function CoverageMap({ coverage, compact = false }: { coverage: ExamCoverage; compact?: boolean }) {
  const { t, locale } = useLanguage()
  const navigate = useNavigate()
  const { subject, topics } = coverage
  if (!topics.length) return null
  const groups = counts(topics)
  const summary = groups.map((g) => t('coverage.count', { count: g.items.length, label: t(`coverage.${g.status}`).toLowerCase() })).join(' · ')

  if (compact) {
    const missing = topics.filter((c) => c.status === 'untouched' || c.status === 'weak' || c.status === 'stale').length
    return missing ? <span className="coverage-chip num" title={summary}>{t('coverage.missing', { count: missing })}</span> : null
  }

  const detail = (c: TopicCoverage) => [
    ...c.reasons.map((r) => t(`coverage.reason.${r}`)),
    c.lastStudied && t('coverage.last', { day: formatDay(c.lastStudied, 'short', locale) }),
    c.minutes > 0 && formatMinutes(c.minutes),
  ].filter(Boolean).join(' · ')

  return (
    <section className="coverage" aria-label={t('coverage.title')}>
      <div className="readiness-head">
        <span>{t('coverage.title')}</span>
        <span className="coverage-total num">{t('coverage.topics', { count: topics.length })}</span>
      </div>
      <div className="coverage-bar" role="img" aria-label={summary}>
        {groups.map((g) => <span key={g.status} className={`is-${g.status}`} style={{ flexGrow: g.items.length }} />)}
      </div>
      <dl className="coverage-groups">
        {groups.map((g) => (
          <div className="coverage-group" key={g.status}>
            <dt><span className={`coverage-dot is-${g.status}`} aria-hidden="true" />{t(`coverage.${g.status}`)} <span className="num">{g.items.length}</span></dt>
            <dd>
              {g.items.map((c) => (
                <button key={c.topic.id} type="button" className={`tag tag-button coverage-topic is-${g.status}`}
                  onClick={() => navigate('/timer', { state: sessionFor(subject, c.topic) })}
                  title={[t('coverage.study'), detail(c)].filter(Boolean).join(' · ')}
                  aria-label={t('coverage.studyTopic', { title: c.topic.title, detail: detail(c) || t(`coverage.${g.status}`) })}>
                  {c.topic.title}
                </button>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export default CoverageMap
