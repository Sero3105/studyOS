import { cn } from '@/lib/utils'
import { useLanguage } from '../../i18n/useLanguage'

const TONE = { low: 'bg-muted-foreground/50', medium: 'bg-warning', high: 'bg-destructive' } as const
const KEY = { low: 'priority.low', medium: 'priority.medium', high: 'priority.high' } as const

/** Priorità di un task: pallino colorato + parola, così non dipende solo dal colore. */
function Priority({ value }: { value: 'low' | 'medium' | 'high' }) {
  const { t } = useLanguage()
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('size-1.5 rounded-full', TONE[value])} aria-hidden="true" />
      {t(KEY[value])}
    </span>
  )
}

export default Priority
