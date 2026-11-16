import { useEffect } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './ui/button'
import { useTimer } from '../context/useTimer'
import { useLanguage } from '../i18n/useLanguage'
import { breakMinutes, longBreak } from '../utils/pomodoro'

/**
 * Quadrante del timer Pomodoro.
 *
 * Il ciclo Studio/Pausa e il calcolo del tempo vivono in `TimerProvider`
 * (montato in `AppLayout`), così il countdown sopravvive alla navigazione;
 * questo componente si limita a mostrarlo e a esporre i controlli:
 * - il pulsante principale avvia, mette in pausa o riprende,
 * - Ricomincia riporta all'inizio del blocco di studio.
 *
 * La resa grafica mette il countdown al centro di un quadrante grande: è
 * l'unico elemento in primo piano; i controlli stanno subito sotto, il
 * pulsante principale più grande degli altri.
 */
function PomodoroTimer() {
  const { t } = useLanguage()
  const { config, mode, isRunning, remainingSeconds, totalSeconds, hasStarted, completedBlocks, toggle, reset } = useTimer()
  const timer = config?.focusMinutes ?? 0
  const pause = config ? breakMinutes(config, completedBlocks + 1) : 0
  // Blocchi del ciclo attuale verso la pausa lunga; durante la pausa lunga il ciclo è pieno.
  const cycle = config ? Math.min(longBreak(config).blocksBeforeLongBreak, 8) : 0
  const inCycle = cycle ? completedBlocks % cycle : 0
  const filled = mode === 'Break' && completedBlocks > 0 && inCycle === 0 ? cycle : inCycle

  const minutes = Math.floor(remainingSeconds / 60)
  const remainingSecondsPart = remainingSeconds % 60
  const percentage = totalSeconds ? remainingSeconds / totalSeconds : 0
  const clock = `${minutes}:${remainingSecondsPart.toString().padStart(2, '0')}`
  const modeLabel = mode === 'Work' ? t('timer.modeWork') : t('timer.modeBreak')

  // Il titolo della scheda mostra il tempo rimasto: utile con la scheda in background.
  useEffect(() => {
    document.title = `${clock} · ${modeLabel} · StudyOS`
  }, [clock, modeLabel])

  // Calcoli per il cerchio SVG del progresso del timer.
  const radius = 100
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - percentage)

  const primaryLabel = isRunning ? t('timer.pause') : hasStarted ? t('timer.resume') : t('timer.start')

  const isBreak = mode === 'Break'

  return (
    <section className="flex flex-col items-center gap-8" aria-label={t('timer.pomodoroLabel')}>
      <div className="relative grid aspect-square w-full max-w-[22rem] place-items-center">
        <div aria-hidden="true" className={cn('absolute inset-[12%] rounded-full blur-3xl transition-colors', isBreak ? 'bg-info/10' : 'bg-primary/10', !isRunning && 'opacity-40')} />
        <svg className="absolute inset-0 size-full" viewBox="0 0 240 240" aria-hidden="true">
          <circle className="stroke-muted" cx="120" cy="120" r={radius} fill="none" strokeWidth="4" />
          {Array.from({ length: 60 }, (_, i) => (
            <line key={i} x1="120" y1="4" x2="120" y2={i % 5 === 0 ? 10 : 7} className="stroke-foreground/15" strokeWidth="1" transform={`rotate(${i * 6} 120 120)`} />
          ))}
          <circle
            className={cn('transition-[stroke-dashoffset] duration-1000 ease-linear', isBreak ? 'stroke-info' : 'stroke-primary')}
            cx="120"
            cy="120"
            r={radius}
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 120 120)"
          />
        </svg>
        <div className="relative flex flex-col items-center gap-2 text-center">
          <span className={cn('font-mono text-xs font-medium tracking-[0.2em] uppercase', isBreak ? 'text-info' : 'text-primary')}>{modeLabel}</span>
          <span
            className="font-mono text-7xl font-semibold tracking-tighter tabular-nums sm:text-8xl"
            role="timer"
            aria-label={t('timer.remainingLabel', { minutes, seconds: remainingSecondsPart, mode: modeLabel.toLowerCase() })}
          >
            {clock}
          </span>
          <span className="text-sm text-muted-foreground">
            {mode === 'Work' ? t('timer.thenBreak', { minutes: pause }) : t('timer.thenStudy', { minutes: timer })}
          </span>
          {cycle > 1 && (
            <span className="mt-1 flex gap-1.5" role="img" aria-label={t('timer.blocksLabel', { done: filled, total: cycle })}>
              {Array.from({ length: cycle }, (_, i) => <span key={i} className={cn('h-1 w-4 rounded-full', i < filled ? 'bg-primary' : 'bg-muted')} />)}
            </span>
          )}
        </div>
      </div>

      <div className="flex w-full max-w-sm gap-2">
        <Button size="lg" className="flex-1" onClick={toggle}>
          {isRunning ? <Pause data-icon="inline-start" aria-hidden="true" /> : <Play data-icon="inline-start" aria-hidden="true" />}
          {primaryLabel}
        </Button>
        <Button size="lg" variant="outline" disabled={!hasStarted && mode === 'Work'} onClick={reset}>
          <RotateCcw data-icon="inline-start" aria-hidden="true" />
          {t('timer.restart')}
        </Button>
      </div>
    </section>
  )
}

export default PomodoroTimer
