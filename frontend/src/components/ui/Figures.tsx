import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface Figure {
  label: string
  value: ReactNode
  sub?: ReactNode
}

/** Riga di numeri chiave: etichetta piccola, valore in mono grande, nota opzionale sotto. */
function Figures({ items, className, label }: { items: Figure[]; className?: string; label?: string }) {
  return (
    <dl
      aria-label={label}
      className={cn('grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]', className)}
    >
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-1 bg-card p-4">
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd className="font-mono text-2xl font-semibold tracking-tight tabular-nums">{item.value}</dd>
          {item.sub && <dd className="text-xs text-muted-foreground">{item.sub}</dd>}
        </div>
      ))}
    </dl>
  )
}

export default Figures
