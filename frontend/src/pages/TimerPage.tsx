import PomodoroTimer from '../components/PomodoroTimer'

function TimerPage() {
  return (
    <section className="timer-page">
      <PomodoroTimer timer={25} pause={5} />
    </section>
  )
}

export default TimerPage