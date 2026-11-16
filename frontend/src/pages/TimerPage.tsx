import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Check, CircleStop, History } from 'lucide-react'
import PomodoroTimer from '../components/PomodoroTimer'
import PageHeader from '../components/ui/PageHeader'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog'
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
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <PageHeader
          title={t('timer.newSession')}
          description={t('timer.setupDescription')}
        />
        <Card aria-label={t('timer.sessionSettings')}>
          <CardContent>
            <SessionSetupForm onSubmit={start} />
          </CardContent>
        </Card>
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
      <div className="flex flex-col gap-8">
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
    <div className="flex flex-col gap-8">
      <PageHeader
        title={title}
        description={context}
        actions={
          <Button variant="outline" onClick={askFinish} disabled={!config}>
            <CircleStop data-icon="inline-start" aria-hidden="true" />
            {t('sitting.finish')}
          </Button>
        }
      />

      <AlertDialog open={confirmFinish} onOpenChange={setConfirmFinish}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('sitting.finish')}</AlertDialogTitle>
            <AlertDialogDescription>{t('sitting.partialQuestion', { minutes: partialMinutes })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <Button variant="outline" onClick={() => end(false)}>{t('sitting.discardPartial')}</Button>
            <AlertDialogAction onClick={() => end(true)} autoFocus>{t('sitting.savePartial')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="lg:sticky lg:top-20">
          <CardContent className="flex flex-col gap-6 py-4">
            {config && <PomodoroTimer />}

            <div className="flex flex-col gap-3 empty:hidden" aria-live="polite">
              {lastBlockId !== null && <BlockPrompt key={lastBlockId} />}
              {taskId !== null && completedBlocks > 0 && closedTask !== taskId && (
                <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm">{t('timer.taskQuestion', { title: sessionConfig.taskTitle ?? '' })}</p>
                  <Button onClick={closeTask}><Check data-icon="inline-start" aria-hidden="true" /> {t('timer.taskDone')}</Button>
                  {taskError && <p className="text-sm text-destructive" role="alert">{t('planner.updateError')}</p>}
                </div>
              )}
              {closedTask !== null && closedTask === taskId && <p className="text-sm text-success" role="status">{t('timer.taskClosed')}</p>}
              {resume?.resume_note && (
                <p className="flex gap-3 rounded-lg border border-dashed p-4 text-sm">
                  <History className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
                  <span><strong className="font-medium">{t('sitting.lastTime', { day: formatDay(resume.started_on, 'long', locale) })}</strong> {resume.resume_note}</span>
                </p>
              )}
              {saveState === 'saved' && (
                <p className="text-center text-sm text-success" role="status">
                  {t('timer.savedNotice')} <Link className="font-medium underline underline-offset-4" to="/history">{t('timer.openHistory')}</Link>
                </p>
              )}
              {saveState === 'error' && (
                <p className="text-center text-sm text-destructive" role="alert">
                  {t('timer.saveErrorNotice')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          {config && mode === 'Work' && <DistractionCapture />}
          {config && <SittingChecklist />}
          {config && mode === 'Break' && <DistractionList />}
        </div>
      </div>
    </div>
  )
}

export default TimerPage
