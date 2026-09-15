import { useEffect, useState, useRef } from 'react'

interface PomodoroTimerProps {
  timer: number
  pause: number
}

function PomodoroTimer({ timer, pause }: PomodoroTimerProps) {
  const [seconds, setSeconds] = useState(timer * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [mode, setMode] = useState<'Work' | 'Break'>('Work')

  const modeRef = useRef<'Work' | 'Break'>(mode)

  const totalSeconds = mode === 'Work'
    ? timer * 60
    : pause * 60

  // Keep the ref synchronized with the current mode
  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  // Timer
  useEffect(() => {
    if (!isRunning) {
      return
    }

    const interval = setInterval(() => {
      setSeconds((previousSeconds) => {
        if (previousSeconds <= 1) {
          const currentMode = modeRef.current

          if (currentMode === 'Work') {
            setMode('Break')
            setIsRunning(true)

            return pause * 60
          } else {
            setMode('Work')
            setIsRunning(false)

            return timer * 60
          }
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

  // SVG circle calculations
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
      <button className="button button-primary" onClick={() => setIsRunning(!isRunning)}>
        {isRunning ? 'Pause' : 'Start'}
      </button>

      <button
        className="button button-secondary"
        onClick={() => {
          setIsRunning(false)
          setSeconds(timer * 60)
          setMode('Work')
        }}
      >
        Reset
      </button>
      </div>
    </section>
  )
}

export default PomodoroTimer