import Header from './components/Header'
import PomodoroTimer from './components/PomodoroTimer'

function App() {
  return (
    <div>
      <Header userName="Matteo" />
      <PomodoroTimer timer={0.5} pause={0.5} />
    </div>
  )
}

export default App