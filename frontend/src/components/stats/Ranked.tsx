import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Riga di classifica: nome, barra proporzionale (0-100), valore. */
function Ranked({ name, width, value, barClass, title, highlight = false }: {
  name: ReactNode
  width: number
  value: ReactNode
  barClass?: string
  title?: string
  highlight?: boolean
}) {
  return (
    <li className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] items-center gap-3 text-sm sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto]" title={title}>
      <span className={cn('flex min-w-0 items-center gap-2 truncate', highlight && 'font-medium')}>{name}</span>
      <span className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <span className={cn('block h-full rounded-full', barClass ?? (highlight ? 'bg-primary' : 'bg-foreground/30'))} style={{ width: `${width}%` }} />
      </span>
      <span className="font-mono text-xs tabular-nums">{value}</span>
    </li>
  )
}

export default Ranked
