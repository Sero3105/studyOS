import PomodoroTimer from '../components/PomodoroTimer'
import HeaderNote from '../components/HeaderNote'

function TimerPage() {
  return (
    <section className="timer-page">
        <HeaderNote>Focus. Learn. Improve.</HeaderNote>
        <PomodoroTimer timer={0.25} pause={0.05} />
    </section>
  )
}

export default TimerPage