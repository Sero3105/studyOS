import { useEffect } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { useTimer } from '../context/useTimer'
import { useLanguage } from '../i18n/useLanguage'

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
  const { config, mode, isRunning, remainingSeconds, totalSeconds, hasStarted, toggle, reset } = useTimer()
  const timer = config?.focusMinutes ?? 0
  const pause = config?.breakMinutes ?? 0

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
  const radius = 108
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - percentage)

  const primaryLabel = isRunning ? t('timer.pause') : hasStarted ? t('timer.resume') : t('timer.start')

  return (
    <section className={`timer-stage${mode === 'Break' ? ' is-break' : ''}`} aria-label={t('timer.pomodoroLabel')}>
      <div className="timer-dial">
        <svg className="timer-svg" viewBox="0 0 240 240" aria-hidden="true">
          <circle className="ring-track" cx="120" cy="120" r={radius} fill="none" strokeWidth="6" />
          <circle
            className="ring-progress"
            cx="120"
            cy="120"
            r={radius}
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 120 120)"
          />
        </svg>
        <div className="timer-readout">
          <span className="timer-mode">{modeLabel}</span>
          <span
            className="timer-time num"
            role="timer"
            aria-label={t('timer.remainingLabel', { minutes, seconds: remainingSecondsPart, mode: modeLabel.toLowerCase() })}
          >
            {clock}
          </span>
          <span className="timer-next">
            {mode === 'Work' ? t('timer.thenBreak', { minutes: pause }) : t('timer.thenStudy', { minutes: timer })}
          </span>
        </div>
      </div>

      <div className="timer-controls">
        <button
          className="btn btn-primary btn-lg timer-primary"
          type="button"
          onClick={toggle}
        >
          {isRunning ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          {primaryLabel}
        </button>

        <button
          className="btn btn-secondary btn-lg"
          type="button"
          disabled={!hasStarted && mode === 'Work'}
          onClick={reset}
        >
          <RotateCcw aria-hidden="true" />
          {t('timer.restart')}
        </button>
      </div>
    </section>
  )
}

export default PomodoroTimer
