import { useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'

/**
 * Props del timer Pomodoro.
 *
 * `timer` rappresenta la durata della sessione di lavoro in minuti.
 * `pause` rappresenta la durata della pausa in minuti.
 */
interface PomodoroTimerProps {
  timer: number
  pause: number
  onWorkComplete?: (minutes: number) => void
}

/**
 * Timer Pomodoro con ciclo Work/Break.
 *
 * Questo componente usa React state per gestire:
 * - il tempo rimanente (`seconds`),
 * - lo stato di esecuzione (`isRunning`),
 * - la modalità corrente (`mode`: Work o Break).
 *
 * Il comportamento è:
 * - quando il timer arriva a zero nella modalità `Work`, passa automaticamente a
 *   `Break` e ricomincia la pausa;
 * - quando la pausa termina, torna a `Work` e si ferma;
 * - il pulsante principale avvia, mette in pausa o riprende il countdown;
 * - Ricomincia ripristina la sessione di lavoro iniziale.
 *
 * Per coordinare il cambio di modalità senza problemi di stale closure,
 * `modeRef` viene usato come riferimento mutabile sincronizzato con lo state.
 *
 * La resa grafica mette il countdown al centro di un quadrante grande: è
 * l'unico elemento in primo piano; i controlli stanno subito sotto, il
 * pulsante principale più grande degli altri.
 */
function PomodoroTimer({ timer, pause, onWorkComplete }: PomodoroTimerProps) {
  const savedRef = useRef(false)
  const onWorkCompleteRef = useRef(onWorkComplete)
  useEffect(() => { onWorkCompleteRef.current = onWorkComplete }, [onWorkComplete])
  const [seconds, setSeconds] = useState(timer * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [mode, setMode] = useState<'Work' | 'Break'>('Work')

  const modeRef = useRef<'Work' | 'Break'>(mode)

  const totalSeconds = mode === 'Work' ? timer * 60 : pause * 60

  // Mantiene sincronizzato il ref della modalità con lo state attuale.
  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  // Esegue il countdown ogni secondo quando il timer è attivo.
  useEffect(() => {
    if (!isRunning) {
      return
    }

    const interval = setInterval(() => {
      setSeconds((previousSeconds) => {
        if (previousSeconds <= 1) {
          const currentMode = modeRef.current

          if (currentMode === 'Work') {
            if (!savedRef.current) {
              savedRef.current = true
              onWorkCompleteRef.current?.(timer)
            }
            setMode('Break')
            setIsRunning(true)
            return pause * 60
          }

          setMode('Work')
          setIsRunning(false)
          return timer * 60
        }

        return previousSeconds - 1
      })
    }, 1000)

    return () => {
      clearInterval(interval)
    }
  }, [isRunning, pause, timer])

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  const percentage = seconds / totalSeconds
  const clock = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  const modeLabel = mode === 'Work' ? 'Studio' : 'Pausa'
  const hasStarted = seconds < totalSeconds

  // Il titolo della scheda mostra il tempo rimasto: utile con la scheda in background.
  useEffect(() => {
    document.title = `${clock} · ${modeLabel} · StudyOS`
  }, [clock, modeLabel])

  // Calcoli per il cerchio SVG del progresso del timer.
  const radius = 108
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - percentage)

  const primaryLabel = isRunning ? 'Pausa' : hasStarted ? 'Riprendi' : 'Avvia'

  return (
    <section className={`timer-stage${mode === 'Break' ? ' is-break' : ''}`} aria-label="Timer Pomodoro">
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
            aria-label={`${minutes} minuti e ${remainingSeconds} secondi rimanenti, ${modeLabel.toLowerCase()}`}
          >
            {clock}
          </span>
          <span className="timer-next">
            {mode === 'Work' ? `Poi ${pause} min di pausa` : `Poi ${timer} min di studio`}
          </span>
        </div>
      </div>

      <div className="timer-controls">
        <button
          className="btn btn-primary btn-lg timer-primary"
          type="button"
          onClick={() => setIsRunning(!isRunning)}
        >
          {isRunning ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          {primaryLabel}
        </button>

        <button
          className="btn btn-secondary btn-lg"
          type="button"
          disabled={!hasStarted && mode === 'Work'}
          onClick={() => {
            setIsRunning(false)
            setSeconds(timer * 60)
            setMode('Work')
            savedRef.current = false
          }}
        >
          <RotateCcw aria-hidden="true" />
          Ricomincia
        </button>
      </div>
    </section>
  )
}

export default PomodoroTimer
