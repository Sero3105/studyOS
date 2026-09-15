import PomodoroTimer from '../components/PomodoroTimer'
import HeaderNote from '../components/HeaderNote'

function TimerPage() {
  return (
    <section className="timer-page">
        <HeaderNote>Focus. Learn. Improve.</HeaderNote>
        <PomodoroTimer timer={25} pause={5} />
    </section>
  )
}

export default TimerPage