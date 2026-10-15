import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import PomodoroTimer from '../components/PomodoroTimer'
import PageHeader from '../components/ui/PageHeader'
import SessionSetupForm from '../components/timer/SessionSetupForm'
import type { StudySessionConfig } from '../components/timer/types'
import { useTimer } from '../context/useTimer'
import { useLanguage } from '../i18n/useLanguage'

/**
 * Pagina dedicata al timer Pomodoro.
 *
 * Due stati:
 * - senza una sessione attiva mostra il modulo per impostarla;
 * - con una sessione attiva mostra il timer a tutta pagina, con materia e
 *   argomento come titolo.
 *
 * La sessione vive in `TimerProvider`: uscendo da questa pagina il timer
 * continua, e tornandoci si ritrova al punto giusto. Una configurazione
 * arrivata con la navigazione (dal dialog della dashboard o da Materie)
 * avvia una nuova sessione e viene poi tolta dalla history, così tornare
 * indietro o ricaricare non la reimposta.
 */
function TimerPage() {
  const { t } = useLanguage()
  const location = useLocation()
  const navigate = useNavigate()
  const incoming = location.state as StudySessionConfig | null
  const { config, saveState, start, clear } = useTimer()

  useEffect(() => {
    if (!incoming) return
    start(incoming)
    navigate('/timer', { replace: true, state: null })
  }, [incoming, start, navigate])

  const sessionConfig = config ?? incoming

  if (!sessionConfig) {
    return (
      <div className="page timer-setup">
        <PageHeader
          title={t('timer.newSession')}
          description={t('timer.setupDescription')}
        />
        <section className="panel timer-setup-panel" aria-label={t('timer.sessionSettings')}>
          <SessionSetupForm onSubmit={start} />
        </section>
      </div>
    )
  }

  const title = sessionConfig.subject || t('timer.freeSession')
  const context = [sessionConfig.topic, t('timer.context', { focus: sessionConfig.focusMinutes, break: sessionConfig.breakMinutes })]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="page timer-page">
      <PageHeader
        title={title}
        description={context}
        actions={
          <button className="btn btn-ghost" type="button" onClick={clear}>
            <ArrowLeft aria-hidden="true" />
            {t('timer.changeSession')}
          </button>
        }
      />

      {config && <PomodoroTimer />}

      <div className="timer-footer" aria-live="polite">
        {sessionConfig.notes && <p className="timer-note">{sessionConfig.notes}</p>}
        {saveState === 'saved' && (
          <p className="notice notice-success" role="status">
            {t('timer.savedNotice')} <Link className="text-link" to="/history">{t('timer.openHistory')}</Link>
          </p>
        )}
        {saveState === 'error' && (
          <p className="notice notice-error" role="alert">
            {t('timer.saveErrorNotice')}
          </p>
        )}
      </div>
    </div>
  )
}

export default TimerPage
