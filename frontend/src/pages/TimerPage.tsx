import PomodoroTimer from '../components/PomodoroTimer'
import HeaderNote from '../components/HeaderNote'

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
  return (
    <section className="timer-page">
      <HeaderNote>Focus. Learn. Improve.</HeaderNote>
      <PomodoroTimer timer={0.25} pause={0.05} />
    </section>
  )
}

export default TimerPage