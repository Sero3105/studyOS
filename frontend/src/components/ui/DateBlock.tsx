import { cn } from '@/lib/utils'
import { useLanguage } from '../../i18n/useLanguage'
import { monthShort, parseDay } from '../../utils/dates'

/** Giorno grande + mese piccolo, tipo pagina di calendario. Decorativo: la data è scritta anche per esteso. */
function DateBlock({ iso, className }: { iso: string; className?: string }) {
  const { locale } = useLanguage()
  return (
    <span className={cn('flex w-11 shrink-0 flex-col items-center rounded-lg border bg-muted/40 py-1', className)} aria-hidden="true">
      <span className="font-mono text-base leading-tight font-semibold tabular-nums">{parseDay(iso).getDate()}</span>
      <span className="text-[0.625rem] text-muted-foreground uppercase">{monthShort(iso, locale)}</span>
    </span>
  )
}

export default DateBlock
