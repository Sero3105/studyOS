import { useState } from 'react'
import PomodoroTimer from '../components/PomodoroTimer'
import HeaderNote from '../components/HeaderNote'
import SessionSetupForm from '../components/timer/SessionSetupForm'
import type { StudySessionConfig } from '../components/timer/types'
import { createSession } from '../services/sessionService'
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
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle')

  const handleWorkComplete = async (minutes: number) => {
    if (!sessionConfig) return
    try {
      await createSession({
        subject_id: sessionConfig.subjectId ?? undefined,
        topic_id: sessionConfig.topicId ?? undefined,
        duration_minutes: minutes,
        studied_on: new Date().toISOString().slice(0, 10),
        notes: sessionConfig.notes || undefined,
      })
      setSaveState('saved')
    } catch {
      setSaveState('error')
    }
  }

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
      {(sessionConfig.subject || sessionConfig.topic) && (
        <p className="muted-note">
          {sessionConfig.subject}{sessionConfig.topic ? ` / ${sessionConfig.topic}` : ''}
        </p>
      )}
      <PomodoroTimer
        timer={sessionConfig.focusMinutes}
        pause={sessionConfig.breakMinutes}
        onWorkComplete={(minutes) => { void handleWorkComplete(minutes) }}
      />
      {saveState === 'saved' && <p role="status">Sessione salvata in History.</p>}
      {saveState === 'error' && <p role="alert">Sessione completata, salvataggio non riuscito.</p>}
    </section>
  )
}

export default TimerPage