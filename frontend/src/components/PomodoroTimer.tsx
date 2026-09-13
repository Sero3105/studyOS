import { useEffect, useState } from 'react'

function PomodoroTimer() {
  const [seconds, setSeconds] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    if (!isRunning) {
      return
    }

    const interval = setInterval(() => {
      setSeconds((previousSeconds) => previousSeconds - 1)
    }, 1000)

    return () => {
      clearInterval(interval)
    }
  }, [isRunning])

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  return (
    <section>
      <h2>Pomodoro</h2>

      <p>
        {minutes}:{remainingSeconds.toString().padStart(2, '0')}
      </p>

      <button onClick={() => setIsRunning(!isRunning)}>
        {isRunning ? 'Pause' : 'Start'}
      </button>
    </section>
  )
}

export default PomodoroTimer