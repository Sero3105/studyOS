import { useEffect, useRef, useState } from 'react'

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
 * - il pulsante Start/Pause avvia o mette in pausa il countdown;
 * - Reset ripristina la sessione di lavoro iniziale.
 *
 * Per coordinare il cambio di modalità senza problemi di stale closure,
 * `modeRef` viene usato come riferimento mutabile sincronizzato con lo state.
 */
function PomodoroTimer({ timer, pause, onWorkComplete }: PomodoroTimerProps) {
  const savedRef = useRef(false)
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
              onWorkComplete?.(timer)
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

  // Calcoli per il cerchio SVG del progresso del timer.
  const radius = 100
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - percentage)

  return (
    <section className="timer-panel" aria-label="Pomodoro timer">
      <div className="timer-heading">
        <div>
          <p className="eyebrow">Deep work session</p>
          <h2>{mode === 'Work' ? 'Time to focus' : 'Take a breather'}</h2>
        </div>
        <span className="mode-badge">{mode}</span>
      </div>

      <div className="timer-ring">
        <svg
          className="timer-svg"
          width="240"
          height="240"
          viewBox="0 0 240 240"
          role="img"
          aria-label={`${minutes} minutes and ${remainingSeconds} seconds remaining`}
        >
          <circle
            className="ring-track"
            cx="120"
            cy="120"
            r={radius}
            fill="none"
            strokeWidth="12"
          />

          <circle
            className="ring-progress"
            cx="120"
            cy="120"
            r={radius}
            fill="none"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 120 120)"
          />

          <text
            className="timer-value"
            x="120"
            y="120"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {minutes}:{remainingSeconds.toString().padStart(2, '0')}
          </text>
        </svg>
      </div>

      <div className="timer-actions">
        <button
          className="button button-primary"
          onClick={() => setIsRunning(!isRunning)}
        >
          {isRunning ? 'Pause' : 'Start'}
        </button>

        <button
          className="button button-secondary"
          onClick={() => {
            setIsRunning(false)
            setSeconds(timer * 60)
            setMode('Work')
            savedRef.current = false
          }}
        >
          Reset
        </button>
      </div>
    </section>
  )
}

export default PomodoroTimer