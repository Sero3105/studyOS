import { useContext } from 'react'
import { TimerContext } from './timerContext'

export function useTimer() {
  const context = useContext(TimerContext)

  if (context === undefined) {
    throw new Error('useTimer deve essere utilizzato dentro TimerProvider')
  }

  return context
}
