import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Download, NotebookPen, Pencil, Play, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import PageHeader from '../components/ui/PageHeader'
import Segmented from '../components/ui/Segmented'
import MoreLink from '../components/ui/MoreLink'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '../components/ui/field'
import { Input } from '../components/ui/input'
import { Skeleton } from '../components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Textarea } from '../components/ui/textarea'
import Modal from '../components/ui/Modal'
import ProgressBar from '../components/ui/ProgressBar'
import ConfirmButton from '../components/ui/ConfirmButton'
import Figures from '../components/ui/Figures'
import ExamCreateModal from '../components/exams/ExamCreateModal'
import RecordBook from '../components/exams/RecordBook'
import SubjectExam from '../components/exams/SubjectExam'
import { EmptyState, ErrorNotice, LoadingRows } from '../components/ui/Feedback'
import type { StudySessionConfig } from '../components/timer/types'
import { createTopic, deleteSubject, deleteTopic, getSubjects, SUBJECT_COLORS, subjectColor, updateSubject, updateTopic } from '../services/subjectService'
import type { Difficulty, Mastery, Subject, SubjectColor, Topic } from '../services/subjectService'
import SubjectDot from '../components/ui/SubjectDot'
import { SUBJECT_BG } from '@/lib/subjectColors'
import { getStatsSummary } from '../services/statsService'
import { exportNotesVault } from '../services/dataService'
import { createExam, deleteExam, getExams, planExam, updateExam } from '../services/examService'
import type { CreateExamPayload, Exam, PlanRequest } from '../services/examService'
import { getSessions } from '../services/sessionService'
import type { StudySession } from '../services/sessionService'
import { getCards, getMistakes } from '../services/cardService'
import type { Card as FlashCard, Mistake } from '../services/cardService'
import { getTasks } from '../services/taskService'
import type { Task } from '../services/taskService'
import { ApiError } from '../services/apiClient'
import type { TranslationKey } from '../i18n/translations'
import { examReadiness, topicCoverage } from '../utils/planning'
import { daysUntil, relativeDay, todayIso, urgencyClass } from '../utils/dates'
import { saveBlob } from '../utils/download'
import { reviewsEnabled } from '../utils/preferences'
import { formatMinutes } from '../utils/dates'
import { errorMessage } from '../utils/errors'
import { archivedSubjectIds } from '../utils/grades'
import { useLanguage } from '../i18n/useLanguage'
import PlanResultModal from '../components/exams/PlanResultModal'
import type { PlanResult } from '../components/exams/PlanResultModal'
// marked + KaTeX pesano: si scaricano solo aprendo l'anteprima di una nota.
const MarkdownPreview = lazy(() => import('../components/MarkdownPreview'))

const MASTERY_TONE = { 0: 'outline', 1: 'warning', 2: 'info', 3: 'success' } as const
const DIFFICULTY_BAR = { 1: 'bg-success', 2: 'bg-warning', 3: 'bg-destructive' } as const

function progressOf(topics: Topic[]): number {
  if (topics.length === 0) return 0
  return Math.round((topics.filter((topic) => topic.completed).length / topics.length) * 100)
}

/**
 * Materie: elenco a sinistra, dettaglio della materia scelta a destra.
 * Il dettaglio mostra avanzamento, tempo studiato e argomenti, con l'azione
 * per iniziare subito una sessione su quella materia.
 */
function SubjectsPage() {
  const { t, language, locale } = useLanguage()
  const navigate = useNavigate()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [minutesBySubject, setMinutesBySubject] = useState<Record<number, number>>({})
  const [selectedId, setSelectedId] = useState<number | null>((useLocation().state as { subjectId?: number } | null)?.subjectId ?? null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [topicTitle, setTopicTitle] = useState('')
  const [exams, setExams] = useState<Exam[]>([])
  const [planResult, setPlanResult] = useState<PlanResult | null>(null)
  // Dati di contorno per prontezza, copertura e numeri della materia (timer, storico, flashcard).
  const [extra, setExtra] = useState<{ sessions: StudySession[]; cards: FlashCard[]; tasks: Task[]; mistakes: Mistake[] }>({ sessions: [], cards: [], tasks: [], mistakes: [] })
  const [examDialog, setExamDialog] = useState<{ mode: 'new' } | { mode: 'add'; subject: Subject } | { mode: 'edit'; exam: Exam } | null>(null)
  const [editing, setEditing] = useState<{ name: string; color: SubjectColor } | null>(null)
  const [renamingTopic, setRenamingTopic] = useState<{ id: number; title: string } | null>(null)

  const load = useCallback(async (): Promise<void> => {
    try {
      setError('')
      const list = await getSubjects()
      setSubjects(list)
      setSelectedId((current) => current ?? list[0]?.id ?? null)
    } catch (e) {
      setError(errorMessage(e, t('subjects.loadError')))
    } finally {
      setLoading(false)
    }
    // Esami e tempo per materia sono di contorno: se non arrivano, la pagina funziona lo stesso.
    getExams().then(setExams).catch(() => setExams([]))
    Promise.all([getSessions(), getCards(), getTasks(), getMistakes().catch(() => [])])
      .then(([sessions, cards, tasks, mistakes]) => setExtra({ sessions, cards, tasks, mistakes }))
      .catch(() => {})
    getStatsSummary()
      .then((stats) => setMinutesBySubject(Object.fromEntries(stats.by_subject.map((x) => [x.id, x.minutes]))))
      .catch(() => setMinutesBySubject({}))
  }, [t])
  useEffect(() => { queueMicrotask(() => { void load() }) }, [load])

  const [notesFor, setNotesFor] = useState<number | null>(null)
  const [notesDraft, setNotesDraft] = useState('')
  const [notesPreview, setNotesPreview] = useState(false)

  // Archiviate = materie con l'esame superato: come l'archivio degli esami, nessun dato cancellato.
  const [filter, setFilter] = useState<'active' | 'archived'>('active')
  const archived = archivedSubjectIds(exams)
  const examsOf = (id: number) => exams.filter((e) => e.subject_id === id)
  // Prima le materie con l'esame più vicino, poi quelle senza data, in ordine alfabetico.
  const nextDate = (id: number) => examsOf(id).filter((e) => e.status === 'planned' || e.status === 'in_progress').map((e) => e.exam_date ?? '9999').sort()[0] ?? '9999'
  const shown = subjects
    .filter((s) => archived.has(s.id) === (filter === 'archived'))
    .sort((a, b) => nextDate(a.id).localeCompare(nextDate(b.id)) || a.name.localeCompare(b.name))
  const selected = shown.find((subject) => subject.id === selectedId) ?? shown[0] ?? null
  const today = todayIso()
  const selectedExams = selected ? examsOf(selected.id) : []
  const activeExam = selectedExams.find((e) => (e.status === 'planned' || e.status === 'in_progress') && (!e.exam_date || e.exam_date >= today))
  const readiness = selected && activeExam ? examReadiness(activeExam, { subjects, ...extra }, today) : undefined
  const coverage = selected && activeExam && selected.topics.length ? { subject: selected, topics: topicCoverage(selected, extra, today) } : undefined
  const subjectSessions = selected ? extra.sessions.filter((x) => x.subject_id === selected.id) : []
  const lastSession = subjectSessions.map((x) => x.studied_on).sort().at(-1)
  const topicIds = new Set(selected?.topics.map((x) => x.id))
  const subjectCards = extra.cards.filter((c) => topicIds.has(c.topic_id)).length

  const run = async (action: () => Promise<void>, fallback: string) => {
    try { setError(''); await action() }
    catch (e) { setError(errorMessage(e, fallback)) }
  }

  // Materia ed esame sono una scheda sola: creare l'esame crea (o riusa) la materia dello stesso nome.
  const saveExam = async (payload: CreateExamPayload) => {
    const dialog = examDialog
    const saved = dialog?.mode === 'edit' ? await updateExam(dialog.exam.id, payload) : await createExam(payload)
    const [subjectList, examList] = await Promise.all([getSubjects(), getExams()])
    setSubjects(subjectList); setExams(examList); setExamDialog(null)
    if (saved.subject_id !== null) setSelectedId(saved.subject_id)
    if (saved.status === 'passed') { setFilter('archived'); toast.success(t('subjects.archivedToast', { name: saved.subject })) }
    else if (dialog?.mode === 'new') setFilter('active')
  }

  const recordOutcome = async (request: () => Promise<Exam>, failure: TranslationKey = 'exams.outcomeError') => {
    try {
      const updated = await request()
      setExams((list) => list.map((x) => (x.id === updated.id ? updated : x)))
      if (updated.status === 'passed') { setFilter('archived'); toast.success(t('subjects.archivedToast', { name: updated.subject })) }
    } catch (e) { setError(errorMessage(e, t(failure))) }
  }

  const removeExam = (exam: Exam) =>
    run(async () => { await deleteExam(exam.id); setExams((list) => list.filter((x) => x.id !== exam.id)) }, t('exams.deleteError'))

  // Esito del piano in un pop-up: si vede subito se è stato creato, quante attività e in che periodo.
  const planFor = async (exam: Exam, request: PlanRequest) => {
    try {
      setPlanResult({ subject: exam.subject, tasks: await planExam(exam.id, request) })
    } catch (e) {
      const code = e instanceof ApiError && e.status === 422 ? e.message : ''
      const message = code === 'no_subject' || code === 'too_close' ? t(`exams.plan.${code}` as TranslationKey, { subject: exam.subject }) : errorMessage(e, t('exams.planError'))
      setPlanResult({ subject: exam.subject, error: message })
    }
  }

  const addTopic = async (event: FormEvent) => {
    event.preventDefault()
    const title = topicTitle.trim()
    if (!selected || !title) return
    await run(async () => {
      const topic = await createTopic(selected.id, title)
      setSubjects((s) => s.map((x) => x.id === selected.id ? { ...x, topics: [...x.topics, topic] } : x))
      setTopicTitle('')
    }, t('subjects.addTopicError'))
  }

  const saveSubject = async (event: FormEvent) => {
    event.preventDefault()
    if (!selected || !editing?.name.trim()) return
    await run(async () => {
      const updated = await updateSubject(selected.id, { name: editing.name.trim(), color: editing.color })
      setSubjects((s) => s.map((x) => x.id === updated.id ? updated : x).sort((a, b) => a.name.localeCompare(b.name)))
      setEditing(null)
      // Gli esami collegati prendono il nuovo nome sul backend.
      getExams().then(setExams).catch(() => {})
    }, t('subjects.saveError'))
  }

  const renameTopic = (subjectId: number, topic: Topic) => {
    const title = renamingTopic?.title.trim()
    setRenamingTopic(null)
    if (!title || title === topic.title) return
    void run(async () => replaceTopic(subjectId, await updateTopic(topic.id, { title })), t('subjects.updateTopicError'))
  }

  const replaceTopic = (subjectId: number, updated: Topic) =>
    setSubjects((s) => s.map((x) => x.id === subjectId ? { ...x, topics: x.topics.map((t) => t.id === updated.id ? updated : t) } : x))

  // Metodo di studio: da fare → da ripassare → ripassato (completato) → sicuro → da fare.
  // Studiato la prima volta, il primo ripasso arriva domani; i ripassi poi aggiornano lo stato da soli.
  const cycleMastery = (subjectId: number, topic: Topic) =>
    void run(async () => {
      const next = ((topic.mastery + 1) % 4) as Mastery
      const scheduleReviews = topic.mastery === 0 && reviewsEnabled()
      replaceTopic(subjectId, await updateTopic(topic.id, { mastery: next, schedule_reviews: scheduleReviews }))
      if (scheduleReviews) toast.success(t('subjects.reviewsScheduled'))
    }, t('subjects.updateTopicError'))

  // Facile → media → difficile → facile: pesa nel piano d'esame.
  const cycleDifficulty = (subjectId: number, topic: Topic) =>
    void run(async () => replaceTopic(subjectId, await updateTopic(topic.id, { difficulty: ((topic.difficulty % 3) + 1) as Difficulty })), t('subjects.updateTopicError'))

  const openNotes = (topic: Topic) => {
    setNotesPreview(false)
    setNotesFor(notesFor === topic.id ? null : topic.id)
    setNotesDraft(topic.notes ?? '')
  }

  const saveNotes = (subjectId: number, topic: Topic) => {
    if (notesDraft === (topic.notes ?? '')) return
    void run(async () => replaceTopic(subjectId, await updateTopic(topic.id, { notes: notesDraft })), t('subjects.notesError'))
  }

  const downloadVault = () =>
    run(async () => saveBlob(await exportNotesVault(language), 'studyos-notes.zip'), t('subjects.vaultError'))

  const removeTopic = (subjectId: number, topicId: number) =>
    run(async () => {
      await deleteTopic(topicId)
      setSubjects((s) => s.map((x) => x.id === subjectId ? { ...x, topics: x.topics.filter((t) => t.id !== topicId) } : x))
    }, t('subjects.deleteTopicError'))

  const removeSubject = (id: number) =>
    run(async () => {
      await deleteSubject(id)
      const remaining = subjects.filter((x) => x.id !== id)
      setSubjects(remaining)
      setSelectedId(remaining[0]?.id ?? null)
    }, t('subjects.deleteSubjectError'))

  const startSession = (subject: Subject, topic?: Topic) => {
    const config: StudySessionConfig = {
      focusMinutes: 25,
      breakMinutes: 5,
      goal: '',
      subjectId: subject.id,
      topicId: topic?.id ?? null,
      subject: subject.name,
      topic: topic?.title ?? '',
    }
    navigate('/timer', { state: config })
  }

  const newSubjectButton = (
    <Button onClick={() => setExamDialog({ mode: 'new' })}>
      <Plus data-icon="inline-start" aria-hidden="true" /> {t('subjects.newSubject')}
    </Button>
  )

  // A destra del nome: giorni all'esame (attive) o voto (archiviate).
  const listTag = (id: number) => {
    const passed = examsOf(id).find((e) => e.status === 'passed')
    if (passed) return passed.grade ? <span className="ml-auto font-mono text-xs text-success tabular-nums">{passed.grade}{passed.honors ? 'L' : ''}</span> : null
    const date = nextDate(id)
    if (date === '9999' || date < today) return null
    const days = daysUntil(date)
    return <span className={cn('ml-auto shrink-0 font-mono text-xs whitespace-nowrap tabular-nums', urgencyClass(days) || 'text-muted-foreground')}>{days === 0 ? t('common.today') : `${days} g`}</span>
  }

  const reveal = 'md:opacity-0 md:transition-opacity md:group-hover/topic:opacity-100 md:group-focus-within/topic:opacity-100'

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={t('subjects.title')}
        description={t('subjects.description')}
        actions={
          <>
            {subjects.length > 0 && (
              <Button variant="outline" onClick={() => void downloadVault()} title={t('subjects.vaultHint')}>
                <Download data-icon="inline-start" aria-hidden="true" /> {t('subjects.vaultButton')}
              </Button>
            )}
            {newSubjectButton}
          </>
        }
      />

      {error && <ErrorNotice message={error} onDismiss={() => setError('')} />}

      {loading ? (
        <LoadingRows label={t('subjects.loading')} />
      ) : subjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col gap-4">
            <EmptyState title={t('subjects.emptyTitle')} action={newSubjectButton}>
              {t('subjects.emptyBody')}
            </EmptyState>
          </CardContent>
        </Card>
      ) : (
        <>
        {/* Libretto e andamento dei voti sempre in cima, in Attive come in Archiviate. */}
        <RecordBook exams={exams} />
        <div className="grid items-start gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <Card size="sm" className="lg:sticky lg:top-20">
            <CardHeader>
              <CardTitle><h2 id="subject-index-title" className="font-mono text-xs font-normal tracking-wider text-muted-foreground uppercase">
                {shown.length} {shown.length === 1 ? t('subjects.countOne') : t('subjects.countMany')}
              </h2></CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {archived.size > 0 && (
                <Segmented
                  label={t('subjects.filter')}
                  value={filter}
                  onChange={setFilter}
                  options={[
                    { value: 'active', label: t('subjects.filterActive'), count: subjects.length - subjects.filter((s) => archived.has(s.id)).length },
                    { value: 'archived', label: t('subjects.filterArchived'), count: subjects.filter((s) => archived.has(s.id)).length },
                  ]}
                />
              )}
              {shown.length === 0 && (
                <p className="px-1 py-2 text-sm text-muted-foreground">{filter === 'archived' ? t('subjects.archivedEmptyBody') : t('subjects.emptyBody')}</p>
              )}
              <ul className="-mx-1 flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0" aria-labelledby="subject-index-title">
                {shown.map((subject) => {
                  const percent = progressOf(subject.topics)
                  const minutes = minutesBySubject[subject.id]
                  const current = subject.id === selected?.id
                  return (
                    <li key={subject.id} className="shrink-0 lg:shrink">
                      <button
                        type="button"
                        className={cn(
                          'flex w-44 flex-col gap-2 rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 lg:w-full',
                          current && 'border-border bg-muted/60',
                        )}
                        aria-current={current ? 'true' : undefined}
                        onClick={() => setSelectedId(subject.id)}
                      >
                        <span className="flex items-center gap-2 text-sm font-medium">
                          <SubjectDot subject={subject} /><span className="truncate">{subject.name}</span>
                          {listTag(subject.id)}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground tabular-nums">
                          {subject.topics.length ? `${percent}%` : t('subjects.noTopics')}
                          {minutes ? ` · ${formatMinutes(minutes)}` : ''}
                        </span>
                        <ProgressBar percent={percent} label={t('subjects.progressLabel', { name: subject.name })} className="h-1" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </CardContent>
          </Card>

          {selected && (
            <Card aria-labelledby="subject-detail-title" className="min-w-0">
              <CardHeader>
                <CardTitle>
                  <h2 id="subject-detail-title" className="flex items-center gap-2.5 text-xl font-semibold tracking-tight"><SubjectDot subject={selected} className="size-2.5" />{selected.name}</h2>
                </CardTitle>
                <CardDescription className="font-mono text-xs tabular-nums">
                  {t('subjects.topicsCompleted', { done: selected.topics.filter((x) => x.completed).length, total: selected.topics.length })}
                  {minutesBySubject[selected.id] ? t('subjects.studiedSuffix', { value: formatMinutes(minutesBySubject[selected.id]) }) : ''}
                </CardDescription>
                <CardAction className="flex items-center gap-1">
                  <Button onClick={() => startSession(selected)}>
                    <Play data-icon="inline-start" aria-hidden="true" /> <span className="hidden sm:inline">{t('subjects.study25')}</span>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setEditing({ name: selected.name, color: subjectColor(selected) })} aria-label={t('subjects.editLabel', { name: selected.name })} title={t('subjects.edit')}>
                    <Pencil aria-hidden="true" />
                  </Button>
                  <ConfirmButton label={t('subjects.deleteSubjectLabel', { name: selected.name })} onConfirm={() => removeSubject(selected.id)} />
                </CardAction>
              </CardHeader>

              <CardContent className="flex flex-col gap-5">
                {selected.topics.length > 0 && (
                  <ProgressBar percent={progressOf(selected.topics)} label={t('subjects.progressLabel', { name: selected.name })} />
                )}

                <SubjectExam
                  exams={selectedExams}
                  readiness={readiness}
                  coverage={coverage}
                  onAdd={() => setExamDialog({ mode: 'add', subject: selected })}
                  onEdit={(exam) => setExamDialog({ mode: 'edit', exam })}
                  onDelete={removeExam}
                  onPlan={planFor}
                  topicsKey={selected.topics.map((x) => `${x.id}:${x.mastery}:${x.difficulty}`).join(',')}
                  onOutcome={recordOutcome}
                />

                <div className="flex flex-col gap-2">
                  <Figures className="grid-cols-2 sm:grid-cols-4" items={[
                    { label: t('subjects.statStudied'), value: formatMinutes(minutesBySubject[selected.id] ?? 0) },
                    { label: t('subjects.statSessions'), value: subjectSessions.length },
                    { label: t('subjects.statLast'), value: <span className="text-base">{lastSession ? relativeDay(lastSession, locale) : t('subjects.statNever')}</span> },
                    { label: t('subjects.statCards'), value: subjectCards },
                  ]} />
                  <div className="flex flex-wrap justify-end gap-x-4 gap-y-1">
                    <MoreLink to="/history">{t('subjects.openHistory')}</MoreLink>
                    <MoreLink to="/statistics">{t('nav.statistics')}</MoreLink>
                  </div>
                </div>

                <form className="flex gap-2" onSubmit={addTopic}>
                  <label className="sr-only" htmlFor="new-topic">{t('subjects.newTopicFor', { name: selected.name })}</label>
                  <Input
                    id="new-topic"
                    value={topicTitle}
                    onChange={(e) => setTopicTitle(e.target.value)}
                    placeholder={t('subjects.topicPlaceholder')}
                    maxLength={200}
                  />
                  <Button type="submit" variant="secondary" disabled={!topicTitle.trim()}>
                    <Plus data-icon="inline-start" aria-hidden="true" /> {t('common.add')}
                  </Button>
                </form>

                {selected.topics.length === 0 ? (
                  <EmptyState compact title={t('subjects.noTopicsYetTitle')}>
                    {t('subjects.noTopicsYetBody')}
                  </EmptyState>
                ) : (
                  <ul className="-mx-2 flex flex-col">
                    {selected.topics.map((topic) => (
                      <li className="group/topic flex flex-wrap items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/40" key={topic.id}>
                        <Badge asChild variant={MASTERY_TONE[topic.mastery]} className="h-7 w-28 shrink-0 justify-center">
                          <button
                            type="button"
                            onClick={() => cycleMastery(selected.id, topic)}
                            aria-label={t('subjects.masteryLabel', { title: topic.title, level: t(`topic.mastery.${topic.mastery}`) })}
                            title={t('subjects.masteryHint')}
                          >
                            {t(`topic.mastery.${topic.mastery}`)}
                          </button>
                        </Badge>
                        {renamingTopic?.id !== topic.id && <span className={cn('min-w-0 flex-1 py-1 text-sm break-words', topic.completed && 'text-muted-foreground')}>{topic.title}</span>}
                        {renamingTopic?.id === topic.id && (
                          <Input
                            className="min-w-40 flex-1"
                            value={renamingTopic.title}
                            onChange={(e) => setRenamingTopic({ id: topic.id, title: e.target.value })}
                            onBlur={() => renameTopic(selected.id, topic)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') e.currentTarget.blur()
                              if (e.key === 'Escape') setRenamingTopic(null)
                            }}
                            maxLength={200}
                            aria-label={t('subjects.renameTopicLabel', { title: topic.title })}
                            autoFocus
                          />
                        )}
                        <span className="flex items-center gap-0.5">
                          {topic.mastery < 3 && (
                            <Button variant="ghost" size="icon-sm" className={reveal} onClick={() => startSession(selected, topic)} aria-label={t('subjects.studyTopic', { title: topic.title })} title={t('subjects.studyTopicTitle')}>
                              <Play aria-hidden="true" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className={topic.notes ? 'text-primary' : reveal}
                            onClick={() => openNotes(topic)}
                            aria-expanded={notesFor === topic.id}
                            aria-controls={`notes-${topic.id}`}
                            aria-label={t('subjects.notesLabel', { title: topic.title })}
                            title={t('subjects.notes')}
                          >
                            <NotebookPen aria-hidden="true" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" className={reveal} onClick={() => setRenamingTopic({ id: topic.id, title: topic.title })} aria-label={t('subjects.renameTopicLabel', { title: topic.title })} title={t('subjects.rename')}>
                            <Pencil aria-hidden="true" />
                          </Button>
                          <span className={reveal}>
                            <ConfirmButton label={t('subjects.deleteTopicLabel', { title: topic.title })} onConfirm={() => removeTopic(selected.id, topic.id)} />
                          </span>
                          <Badge asChild variant="outline" className="h-7 w-24 justify-start gap-1.5">
                            <button
                              type="button"
                              onClick={() => cycleDifficulty(selected.id, topic)}
                              aria-label={t('subjects.difficultyLabel', { title: topic.title, level: t(`subjects.difficulty${topic.difficulty}`) })}
                              title={t('subjects.difficultyHint')}
                            >
                              <span className="flex items-end gap-0.5" aria-hidden="true">
                                {[1, 2, 3].map((level) => (
                                  <span key={level} className={cn('w-1 rounded-full', ['h-1.5', 'h-2', 'h-2.5'][level - 1], level <= topic.difficulty ? DIFFICULTY_BAR[topic.difficulty] : 'bg-muted-foreground/25')} />
                                ))}
                              </span>
                              {t(`subjects.difficulty${topic.difficulty}`)}
                            </button>
                          </Badge>
                        </span>
                        {notesFor === topic.id && (
                          <div className="flex w-full flex-col gap-2 pt-1 pb-2 pl-8" id={`notes-${topic.id}`}>
                            <Tabs value={notesPreview ? 'preview' : 'write'} onValueChange={(value) => {
                              if (value === 'preview') { saveNotes(selected.id, topic); setNotesPreview(true) } else setNotesPreview(false)
                            }}>
                              <TabsList aria-label={t('subjects.notesLabel', { title: topic.title })}>
                                <TabsTrigger value="write">{t('subjects.notesWrite')}</TabsTrigger>
                                <TabsTrigger value="preview">{t('subjects.notesPreview')}</TabsTrigger>
                              </TabsList>
                            </Tabs>
                            {notesPreview ? (
                              <Suspense fallback={<Skeleton className="h-32" />}>
                                <MarkdownPreview source={notesDraft} emptyText={t('subjects.notesEmpty')} />
                              </Suspense>
                            ) : (
                              <>
                                <label className="sr-only" htmlFor={`notes-input-${topic.id}`}>{t('subjects.notesLabel', { title: topic.title })}</label>
                                <Textarea
                                  id={`notes-input-${topic.id}`}
                                  className="font-mono text-sm"
                                  value={notesDraft}
                                  onChange={(e) => setNotesDraft(e.target.value)}
                                  onBlur={() => saveNotes(selected.id, topic)}
                                  rows={8}
                                  maxLength={20000}
                                  placeholder={t('subjects.notesPlaceholder')}
                                  autoFocus
                                />
                              </>
                            )}
                            <span className="text-xs text-muted-foreground">{t('subjects.notesHintMath')}</span>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
        </div>
        </>
      )}
      {editing && selected && (
        <Modal title={t('subjects.edit')} onClose={() => setEditing(null)}>
          <form onSubmit={(e) => void saveSubject(e)}>
            <FieldGroup className="gap-5">
              <Field>
                <FieldLabel htmlFor="subject-name">{t('subjects.name')}</FieldLabel>
                <Input id="subject-name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required maxLength={120} autoFocus />
              </Field>
              <FieldSet>
                <FieldLegend variant="label">{t('subjects.color')}</FieldLegend>
                <div className="flex flex-wrap gap-2" role="radiogroup">
                  {SUBJECT_COLORS.map((color) => (
                    <label key={color} title={t(`color.${color}`)} className="relative cursor-pointer">
                      <input className="peer sr-only" type="radio" name="subject-color" value={color} checked={editing.color === color} onChange={() => setEditing({ ...editing, color })} />
                      <span className={cn('block size-8 rounded-full ring-offset-2 ring-offset-background transition-shadow peer-checked:ring-2 peer-checked:ring-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring', SUBJECT_BG[color])} aria-hidden="true" />
                      <span className="sr-only">{t(`color.${color}`)}</span>
                    </label>
                  ))}
                </div>
              </FieldSet>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setEditing(null)}>{t('common.cancel')}</Button>
                <Button type="submit" disabled={!editing.name.trim()}>{t('subjects.save')}</Button>
              </div>
            </FieldGroup>
          </form>
        </Modal>
      )}
      {examDialog && (
        <ExamCreateModal
          onSave={saveExam}
          onClose={() => setExamDialog(null)}
          title={examDialog.mode === 'new' ? t('subjects.newSubject') : examDialog.mode === 'add' ? t('subjects.addExam') : undefined}
          description={examDialog.mode === 'new' ? t('subjects.newWithExam') : undefined}
          subjectFromTitle={examDialog.mode === 'new'}
          lockedSubject={examDialog.mode === 'add' ? examDialog.subject.name : examDialog.mode === 'edit' ? examDialog.exam.subject : undefined}
          initial={examDialog.mode === 'edit' ? {
            title: examDialog.exam.title,
            subject: examDialog.exam.subject,
            exam_date: examDialog.exam.exam_date ?? undefined,
            exam_time: examDialog.exam.exam_time ?? undefined,
            location: examDialog.exam.location ?? undefined,
            notes: examDialog.exam.notes ?? undefined,
            status: examDialog.exam.status,
            cfu: examDialog.exam.cfu,
            grade: examDialog.exam.grade,
            honors: examDialog.exam.honors,
          } : undefined}
        />
      )}
      {planResult && (
        <PlanResultModal result={planResult} onClose={() => setPlanResult(null)} onOpenCalendar={() => { setPlanResult(null); navigate('/calendar') }} />
      )}
    </div>
  )
}

export default SubjectsPage
