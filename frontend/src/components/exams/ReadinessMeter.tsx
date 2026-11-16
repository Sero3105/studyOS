import { cn } from '@/lib/utils'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
import type { Readiness } from '../../utils/planning'

const TEXT = { success: 'text-success', warning: 'text-warning', destructive: 'text-destructive' }
const BAR = { success: '[&>*]:bg-success', warning: '[&>*]:bg-warning', destructive: '[&>*]:bg-destructive' }
import { formatMinutes } from '../../utils/dates'
import { useLanguage } from '../../i18n/useLanguage'

/** Prontezza per un esame: percentuale e barra; il dettaglio (argomenti, carte, piano, ore) è scritto sotto o nel tooltip. */
function ReadinessMeter({ readiness, compact = false }: { readiness: Readiness; compact?: boolean }) {
  const { t } = useLanguage()
  if (readiness.score === null) return null
  const percent = Math.round(readiness.score * 100)
  const tone = percent >= 75 ? 'success' : percent >= 40 ? 'warning' : 'destructive'
  const details = [
    readiness.topics && t('readiness.topics', { done: readiness.topics.done, total: readiness.topics.total }),
    readiness.cards && t('readiness.cards', { mastered: readiness.cards.mastered, total: readiness.cards.total }),
    readiness.plan && (readiness.plan.late ? t('readiness.late', { count: readiness.plan.late }) : t('readiness.onTrack')),
    readiness.minutes > 0 && t('readiness.studied', { value: formatMinutes(readiness.minutes) }),
  ].filter(Boolean) as string[]

  if (compact) {
    return <Badge variant={tone} className="cursor-help font-mono tabular-nums" title={`${t('readiness.title')}: ${details.join(' · ')}`}>{t('readiness.short', { percent })}</Badge>
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between text-sm">
        <span>{t('readiness.title')}</span>
        <span className={cn('font-mono font-semibold tabular-nums', TEXT[tone])}>{percent}%</span>
      </div>
      <Progress
        value={percent}
        aria-label={t('readiness.title')}
        className={cn('h-1.5', BAR[tone])}
      />
      <p className="text-xs text-muted-foreground">{details.join(' · ')}</p>
    </div>
  )
}

export default ReadinessMeter
