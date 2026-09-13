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
    <section>
      <h2>Mode: {mode}</h2>

      <div>
        <svg
          width="240"
          height="240"
          viewBox="0 0 240 240"
        >
          {/* Background circle */}
          <circle
            cx="120"
            cy="120"
            r={radius}
            fill="none"
            stroke="#27272a"
            strokeWidth="12"
          />

          {/* Progress circle */}
          <circle
            cx="120"
            cy="120"
            r={radius}
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 120 120)"
          />

          {/* Timer text */}
          <text
            x="120"
            y="120"
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="32"
          >
            {minutes}:{remainingSeconds.toString().padStart(2, '0')}
          </text>
        </svg>
      </div>

      <button onClick={() => setIsRunning(!isRunning)}>
        {isRunning ? 'Pause' : 'Start'}
      </button>

      <button
        onClick={() => {
          setIsRunning(false)
          setSeconds(timer * 60)
          setMode('Work')
        }}
      >
        Reset
      </button>
    </section>
  )
}

export default PomodoroTimer