import { Link } from 'react-router-dom'
import { Pause, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './ui/button'
import { useTimer } from '../context/useTimer'
import { useLanguage } from '../i18n/useLanguage'

/**
 * Timer in corso, sempre visibile in alto: tempo, modalità e play/pausa senza
 * tornare alla pagina Timer. Sparisce se non c'è una seduta avviata.
 */
function TimerPill() {
  const { t } = useLanguage()
  const timer = useTimer()
  if (!timer.config || timer.sitting?.ended || !(timer.isRunning || timer.hasStarted)) return null

  const clock = `${Math.floor(timer.remainingSeconds / 60)}:${String(timer.remainingSeconds % 60).padStart(2, '0')}`
  const isBreak = timer.mode === 'Break'
  const mode = isBreak ? t('timer.modeBreak') : t('timer.modeWork')

  return (
    <div className={cn('flex h-9 items-center gap-1 rounded-full border bg-card pr-1 pl-3', timer.isRunning && (isBreak ? 'border-info/40' : 'border-primary/40'))}>
      <Link to="/timer" className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50" aria-label={`${t('nav.openTimer')}: ${mode}, ${clock}, ${timer.isRunning ? t('nav.timerRunning') : t('nav.timerPaused')}`}>
        <span className={cn('size-2 rounded-full', isBreak ? 'bg-info' : 'bg-primary', timer.isRunning && 'animate-pulse')} aria-hidden="true" />
        <span className="font-mono text-sm font-medium tabular-nums" aria-hidden="true">{clock}</span>
        <span className="hidden text-xs text-muted-foreground sm:inline" aria-hidden="true">{mode}</span>
      </Link>
      <Button variant="ghost" size="icon-sm" className="rounded-full" onClick={timer.toggle} aria-label={timer.isRunning ? t('timer.pause') : t('timer.resume')}>
        {timer.isRunning ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
      </Button>
    </div>
  )
}

export default TimerPill
