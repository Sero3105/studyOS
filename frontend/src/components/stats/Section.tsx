import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'

/** Card di sezione delle statistiche: titolo (h2), nota opzionale, azione a destra. */
function Section({ id, title, meta, action, children, className }: {
  id: string
  title: string
  meta?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Card aria-labelledby={id} className={cn('min-w-0', className)}>
      <CardHeader>
        <CardTitle><h2 id={id}>{title}</h2></CardTitle>
        {meta && <CardDescription className="text-xs">{meta}</CardDescription>}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export default Section
