import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Check, CircleStop, History } from 'lucide-react'
import PomodoroTimer from '../components/PomodoroTimer'
import PageHeader from '../components/ui/PageHeader'
import SessionSetupForm from '../components/timer/SessionSetupForm'
import BlockPrompt from '../components/timer/BlockPrompt'
import SittingChecklist from '../components/timer/SittingChecklist'
import SittingRecap from '../components/timer/SittingRecap'
import { DistractionCapture, DistractionList } from '../components/timer/Distractions'
import type { StudySessionConfig } from '../components/timer/types'
import { useTimer } from '../context/useTimer'
import { useLanguage } from '../i18n/useLanguage'
import { longBreak } from '../utils/pomodoro'
import { lastResume } from '../utils/sitting'
import type { SavedSitting } from '../utils/sitting'
import { updateTask } from '../services/taskService'
import { getSittings } from '../services/sessionService'
import { formatDay } from '../utils/dates'

/**
 * Pagina dedicata al timer Pomodoro.
 *
 * Due stati:
 * - senza una sessione attiva mostra il modulo per impostarla;
 * - con una sessione attiva mostra il timer a tutta pagina, con materia e
 *   argomento come titolo.
 *
 * Durante la seduta: checklist, distrazioni da annotare, domanda a fine blocco e
 * la riga "riparto da qui" lasciata l'ultima volta sullo stesso argomento.
 * "Termina" chiede se salvare il blocco a metà, poi mostra il riepilogo.
 *
 * La sessione vive in `TimerProvider`: uscendo da questa pagina il timer
 * continua, e tornandoci si ritrova al punto giusto. Una configurazione
 * arrivata con la navigazione (dal dialog della dashboard o da Materie)
 * avvia una nuova sessione e viene poi tolta dalla history, così tornare
 * indietro o ricaricare non la reimposta.
 */
function TimerPage() {
  const { t, locale } = useLanguage()
  const location = useLocation()
  const navigate = useNavigate()
  const incoming = location.state as StudySessionConfig | null
  const { config, mode, saveState, completedBlocks, lastBlockId, sitting, partialMinutes, finish, start } = useTimer()
  // Task da cui è partita la sessione e già chiuso da qui: l'invito sparisce.
  const [closedTask, setClosedTask] = useState<number | null>(null)
  const [taskError, setTaskError] = useState(false)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const subjectId = config?.subjectId ?? null
  const topicId = config?.topicId ?? null
  const sittingUid = sitting?.id
  // La pagina resta montata tra una sessione e l'altra: la nota vale solo per la seduta per cui è stata cercata.
  const [found, setFound] = useState<{ for?: string; sitting: SavedSitting | null }>({ sitting: null })
  const resume = found.for !== undefined && found.for === sittingUid ? found.sitting : null

  // "Riparto da qui" dell'ultima seduta sullo stesso argomento (o materia).
  useEffect(() => {
    if (subjectId === null && topicId === null) return
    let active = true
    getSittings().then((list) => { if (active) setFound({ for: sittingUid, sitting: lastResume(list, { subjectId, topicId }, sittingUid) }) }).catch(() => {})
    return () => { active = false }
  }, [subjectId, topicId, sittingUid])

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

  if (config && sitting?.ended) {
    return (
      <div className="page timer-page">
        <PageHeader title={title} description={[sessionConfig.topic, t('sitting.recapTitle')].filter(Boolean).join(' · ')} />
        <SittingRecap />
      </div>
    )
  }

  const askFinish = () => (partialMinutes >= 1 ? setConfirmFinish(true) : finish(false))
  const end = (savePartial: boolean) => { setConfirmFinish(false); finish(savePartial) }

  const context = [sessionConfig.topic, t('timer.context', { focus: sessionConfig.focusMinutes, break: sessionConfig.breakMinutes, long: longBreak(sessionConfig).longBreakMinutes, every: longBreak(sessionConfig).blocksBeforeLongBreak })]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="page timer-page">
      <PageHeader
        title={title}
        description={context}
        actions={
          <button className="btn btn-ghost" type="button" onClick={askFinish} disabled={!config}>
            <CircleStop aria-hidden="true" />
            {t('sitting.finish')}
          </button>
        }
      />

      {confirmFinish && (
        <div className="panel timer-prompt" role="alertdialog" aria-labelledby="finish-question">
          <p id="finish-question">{t('sitting.partialQuestion', { minutes: partialMinutes })}</p>
          <div className="timer-prompt-actions">
            <button className="btn btn-ghost" type="button" onClick={() => setConfirmFinish(false)}>{t('common.cancel')}</button>
            <button className="btn btn-secondary" type="button" onClick={() => end(false)}>{t('sitting.discardPartial')}</button>
            <button className="btn btn-secondary" type="button" onClick={() => end(true)} autoFocus>{t('sitting.savePartial')}</button>
          </div>
        </div>
      )}

      {config && <PomodoroTimer />}

      <div className="timer-footer" aria-live="polite">
        {lastBlockId !== null && <BlockPrompt key={lastBlockId} />}
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
        {resume?.resume_note && (
          <p className="timer-note timer-resume">
            <History aria-hidden="true" />
            <span><strong>{t('sitting.lastTime', { day: formatDay(resume.started_on, 'long', locale) })}</strong> {resume.resume_note}</span>
          </p>
        )}
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

      {config && mode === 'Work' && <DistractionCapture />}
      {config && <SittingChecklist />}
      {config && mode === 'Break' && <DistractionList />}
    </div>
  )
}

export default TimerPage
