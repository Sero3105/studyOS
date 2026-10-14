import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import PomodoroTimer from '../components/PomodoroTimer'
import PageHeader from '../components/ui/PageHeader'
import SessionSetupForm from '../components/timer/SessionSetupForm'
import type { StudySessionConfig } from '../components/timer/types'
import { createSession } from '../services/sessionService'
import { todayIso } from '../utils/dates'

/**
 * Pagina dedicata al timer Pomodoro.
 *
 * Due stati:
 * - senza configurazione mostra il modulo per impostare la sessione;
 * - con una configurazione (arrivata dalla navigazione) mostra il timer a
 *   tutta pagina, con materia e argomento come titolo.
 *
 * Al termine di ogni blocco di studio la sessione viene salvata nello
 * storico e l'esito compare sotto ai controlli.
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
        studied_on: todayIso(),
        notes: sessionConfig.notes || undefined,
      })
      setSaveState('saved')
    } catch {
      setSaveState('error')
    }
  }

  if (!sessionConfig) {
    return (
      <div className="page timer-setup">
        <PageHeader
          title="Nuova sessione"
          description="Scegli quanto studiare e su cosa. Ogni blocco di studio completato finisce nello storico."
        />
        <section className="panel timer-setup-panel" aria-label="Impostazioni della sessione">
          <SessionSetupForm onSubmit={(config) => navigate('/timer', { state: config })} />
        </section>
      </div>
    )
  }

  const title = sessionConfig.subject || 'Sessione libera'
  const context = [sessionConfig.topic, `${sessionConfig.focusMinutes} min di studio, ${sessionConfig.breakMinutes} di pausa`]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="page timer-page">
      <PageHeader
        title={title}
        description={context}
        actions={
          <Link className="btn btn-ghost" to="/timer" replace>
            <ArrowLeft aria-hidden="true" />
            Cambia sessione
          </Link>
        }
      />

      <PomodoroTimer
        timer={sessionConfig.focusMinutes}
        pause={sessionConfig.breakMinutes}
        onWorkComplete={(minutes) => { void handleWorkComplete(minutes) }}
      />

      <div className="timer-footer" aria-live="polite">
        {sessionConfig.notes && <p className="timer-note">{sessionConfig.notes}</p>}
        {saveState === 'saved' && (
          <p className="notice notice-success" role="status">
            Blocco completato e salvato nello storico. <Link className="text-link" to="/history">Apri lo storico</Link>
          </p>
        )}
        {saveState === 'error' && (
          <p className="notice notice-error" role="alert">
            Blocco completato, ma il salvataggio non è riuscito. Controlla la connessione.
          </p>
        )}
      </div>
    </div>
  )
}

export default TimerPage
