import Header from './components/Header'
import PomodoroTimer from './components/PomodoroTimer'

function App() {
  return (
    <div>
      <Header userName="Matteo" />

      <p>Today's study time: 0h 0m</p>

      <PomodoroTimer />
    </div>
  )
}

export default App