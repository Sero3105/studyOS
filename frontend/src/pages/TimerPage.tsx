import PomodoroTimer from '../components/PomodoroTimer'
import HeaderNote from '../components/HeaderNote'
import SessionSetupForm from '../components/timer/SessionSetupForm'
import type { StudySessionConfig } from '../components/timer/types'
import { useLocation, useNavigate } from 'react-router-dom'

/**
 * Pagina dedicata al timer Pomodoro.
 *
 * Questa pagina combina:
 * - una nota grafica in testa (`HeaderNote`),
 * - un componente timer realmente funzionale (`PomodoroTimer`).
 *
 * I valori `timer={0.25}` e `pause={0.05}` rappresentano in minuti:
 * - sessione di lavoro: 15 minuti
 * - pausa breve: 3 minuti
 *
 * Questi valori sono semplici per la demo e possono essere resi configurabili
 * in futuro tramite state globale o settings utente.
 */
function TimerPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const sessionConfig = location.state as StudySessionConfig | null

  if (!sessionConfig) {
    return (
      <section className="timer-page timer-setup-page">
        <HeaderNote>Focus. Learn. Improve.</HeaderNote>
        <section className="timer-panel session-setup-panel">
          <div className="timer-heading">
            <div>
              <p className="eyebrow">Nuova sessione</p>
              <h2>Imposta il tuo focus</h2>
            </div>
          </div>
          <SessionSetupForm onSubmit={(config) => navigate('/timer', { state: config })} />
        </section>
      </section>
    )
  }

  return (
    <section className="timer-page">
      <HeaderNote>Focus. Learn. Improve.</HeaderNote>
      <PomodoroTimer
        timer={sessionConfig.focusMinutes}
        pause={sessionConfig.breakMinutes}
      />
    </section>
  )
}

export default TimerPage