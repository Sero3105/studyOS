import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { LinkProps } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Link testuale con freccia, per "vedi tutto" e scorciatoie verso un'altra pagina. */
function MoreLink({ children, className, ...props }: LinkProps & { children: ReactNode }) {
  return (
    <Link
      className={cn('group/more inline-flex items-center gap-1 rounded-sm text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50', className)}
      {...props}
    >
      {children}
      <ArrowRight className="size-3.5 transition-transform group-hover/more:translate-x-0.5" aria-hidden="true" />
    </Link>
  )
}

export default MoreLink
