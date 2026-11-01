import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import PomodoroTimer from '../components/PomodoroTimer'
import PageHeader from '../components/ui/PageHeader'
import SessionSetupForm from '../components/timer/SessionSetupForm'
import type { StudySessionConfig } from '../components/timer/types'
import { useTimer } from '../context/useTimer'
import { useLanguage } from '../i18n/useLanguage'
import { longBreak } from '../utils/pomodoro'
import { updateTask } from '../services/taskService'
import type { Focus } from '../services/sessionService'
import type { TranslationKey } from '../i18n/translations'

const FOCUS: { value: Focus; key: TranslationKey }[] = [
  { value: 1, key: 'session.focus.1' },
  { value: 2, key: 'session.focus.2' },
  { value: 3, key: 'session.focus.3' },
]

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
  const { config, saveState, completedBlocks, lastBlockId, rateFocus, start, clear } = useTimer()
  // Task da cui è partita la sessione e già chiuso da qui: l'invito sparisce.
  const [closedTask, setClosedTask] = useState<number | null>(null)
  const [taskError, setTaskError] = useState(false)

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

  const taskId = sessionConfig.taskId ?? null
  const closeTask = () => {
    if (taskId === null) return
    setTaskError(false)
    updateTask(taskId, { status: 'done' }).then(() => setClosedTask(taskId)).catch(() => setTaskError(true))
  }

  const title = sessionConfig.subject || t('timer.freeSession')
  const context = [sessionConfig.topic, t('timer.context', { focus: sessionConfig.focusMinutes, break: sessionConfig.breakMinutes, long: longBreak(sessionConfig).longBreakMinutes, every: longBreak(sessionConfig).blocksBeforeLongBreak })]
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
        {lastBlockId !== null && (
          <div className="panel timer-prompt">
            <p>{t('timer.focusQuestion')}</p>
            <div className="timer-prompt-actions">
              {FOCUS.map(({ value, key }) => (
                <button key={value} className="btn btn-secondary" type="button" onClick={() => rateFocus(value)}>{t(key)}</button>
              ))}
              <button className="btn btn-ghost" type="button" onClick={() => rateFocus(null)}>{t('timer.skip')}</button>
            </div>
          </div>
        )}
        {taskId !== null && completedBlocks > 0 && closedTask !== taskId && (
          <div className="panel timer-prompt">
            <p>{t('timer.taskQuestion', { title: sessionConfig.taskTitle ?? '' })}</p>
            <div className="timer-prompt-actions">
              <button className="btn btn-primary" type="button" onClick={closeTask}><Check aria-hidden="true" /> {t('timer.taskDone')}</button>
            </div>
            {taskError && <p className="field-error" role="alert">{t('planner.updateError')}</p>}
          </div>
        )}
        {closedTask !== null && closedTask === taskId && <p className="notice notice-success" role="status">{t('timer.taskClosed')}</p>}
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
