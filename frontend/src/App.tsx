import Header from './components/Header'
import PomodoroTimer from './components/PomodoroTimer'
import Sidebar from './components/Sidebar'

function App() {
  return (
    <div className="app-layout">
      <Sidebar />

      <div className="main-area">
        <Header userName="Matteo" />

        <main className="content-area">
          <PomodoroTimer timer={0.5} pause={0.5} />
        </main>
      </div>
    </div>
  )
}

export default App