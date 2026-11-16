import { cn } from '@/lib/utils'
import { Progress } from './progress'

interface ProgressBarProps {
  percent: number
  label: string
  className?: string
}

/** Barra di progresso accessibile; diventa verde al raggiungimento. */
function ProgressBar({ percent, label, className }: ProgressBarProps) {
  const value = Math.max(0, Math.min(100, Math.round(percent)))
  return (
    <Progress
      value={value}
      aria-label={label}
      className={cn('h-1.5', value >= 100 && '[&>[data-slot=progress-indicator]]:bg-success', className)}
    />
  )
}

export default ProgressBar
