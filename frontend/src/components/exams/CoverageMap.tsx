import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { COVERAGE_ORDER } from '../../utils/planning'
import type { CoverageStatus, TopicCoverage } from '../../utils/planning'

const DOT: Record<CoverageStatus, string> = { weak: 'bg-destructive', untouched: 'bg-muted-foreground/30', stale: 'bg-warning', progress: 'bg-info', solid: 'bg-success' }
const BORDER: Record<CoverageStatus, string> = { weak: 'border-l-destructive', untouched: 'border-l-muted-foreground/40', stale: 'border-l-warning', progress: 'border-l-info', solid: 'border-l-success' }
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
    return missing ? <Badge variant="outline" className="cursor-help font-mono tabular-nums" title={summary}>{t('coverage.missing', { count: missing })}</Badge> : null
  }

  const detail = (c: TopicCoverage) => [
    ...c.reasons.map((r) => t(`coverage.reason.${r}`)),
    c.lastStudied && t('coverage.last', { day: formatDay(c.lastStudied, 'short', locale) }),
    c.minutes > 0 && formatMinutes(c.minutes),
  ].filter(Boolean).join(' · ')

  return (
    <section className="flex flex-col gap-3" aria-label={t('coverage.title')}>
      <div className="flex items-baseline justify-between text-sm">
        <span>{t('coverage.title')}</span>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">{t('coverage.topics', { count: topics.length })}</span>
      </div>
      <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={summary}>
        {groups.map((g) => <span key={g.status} className={cn('h-full', DOT[g.status])} style={{ flexGrow: g.items.length }} />)}
      </div>
      <dl className="flex flex-col gap-3">
        {groups.map((g) => (
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-3" key={g.status}>
            <dt className="flex w-36 shrink-0 items-center gap-2 pt-1 text-xs text-muted-foreground">
              <span className={cn('size-2 rounded-full', DOT[g.status])} aria-hidden="true" />{t(`coverage.${g.status}`)} <span className="font-mono tabular-nums">{g.items.length}</span>
            </dt>
            <dd className="flex flex-wrap gap-1.5">
              {g.items.map((c) => (
                <Button key={c.topic.id} variant="outline" size="xs" className={cn('border-l-2', BORDER[g.status], g.status === 'untouched' && 'border-dashed')}
                  onClick={() => navigate('/timer', { state: sessionFor(subject, c.topic) })}
                  title={[t('coverage.study'), detail(c)].filter(Boolean).join(' · ')}
                  aria-label={t('coverage.studyTopic', { title: c.topic.title, detail: detail(c) || t(`coverage.${g.status}`) })}>
                  {c.topic.title}
                </Button>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export default CoverageMap
