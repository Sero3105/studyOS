import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Download, GraduationCap, NotebookPen, Play, Plus } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import ProgressBar from '../components/ui/ProgressBar'
import ConfirmButton from '../components/ui/ConfirmButton'
import { EmptyState, ErrorNotice, LoadingRows } from '../components/ui/Feedback'
import type { StudySessionConfig } from '../components/timer/types'
import { createSubject, createTopic, deleteSubject, deleteTopic, getSubjects, updateTopic } from '../services/subjectService'
import type { Subject, Topic } from '../services/subjectService'
import { getStatsSummary } from '../services/statsService'
import { exportNotesVault } from '../services/dataService'
import { getExams } from '../services/examService'
import type { Exam } from '../services/examService'
import { formatDay, relativeDay } from '../utils/dates'
import { saveBlob } from '../utils/download'
import { reviewsEnabled } from '../utils/preferences'
import { formatMinutes } from '../utils/dates'
import { errorMessage } from '../utils/errors'
import { useLanguage } from '../i18n/useLanguage'

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
  const [minutesBySubject, setMinutesBySubject] = useState<Record<string, number>>({})
  const [selectedId, setSelectedId] = useState<number | null>((useLocation().state as { subjectId?: number } | null)?.subjectId ?? null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [topicTitle, setTopicTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [exams, setExams] = useState<Exam[]>([])

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
    getStatsSummary()
      .then((stats) => setMinutesBySubject(Object.fromEntries(stats.by_subject.map((x) => [x.name, x.minutes]))))
      .catch(() => setMinutesBySubject({}))
  }, [t])
  useEffect(() => { queueMicrotask(() => { void load() }) }, [load])

  const [notice, setNotice] = useState('')
  const [notesFor, setNotesFor] = useState<number | null>(null)
  const [notesDraft, setNotesDraft] = useState('')

  const selected = subjects.find((subject) => subject.id === selectedId) ?? null

  const run = async (action: () => Promise<void>, fallback: string) => {
    try { setError(''); await action() }
    catch (e) { setError(errorMessage(e, fallback)) }
  }

  const addSubject = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await run(async () => {
      const created = await createSubject(name.trim())
      setSubjects((s) => [...s, created])
      setSelectedId(created.id)
      setName('')
    }, t('subjects.saveError'))
    setSaving(false)
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

  const replaceTopic = (subjectId: number, updated: Topic) =>
    setSubjects((s) => s.map((x) => x.id === subjectId ? { ...x, topics: x.topics.map((t) => t.id === updated.id ? updated : t) } : x))

  const toggleTopic = (subjectId: number, topicId: number, completed: boolean) =>
    run(async () => {
      const scheduleReviews = completed && reviewsEnabled()
      replaceTopic(subjectId, await updateTopic(topicId, { completed, schedule_reviews: scheduleReviews }))
      setNotice(scheduleReviews ? t('subjects.reviewsScheduled') : '')
    }, t('subjects.updateTopicError'))

  const openNotes = (topic: Topic) => {
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

  // Materia ed esame sono collegati per nome (lo stesso criterio di "Pianifica lo studio").
  const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()
  const examFor = (subject: Subject) => exams.find((e) => e.status !== 'passed' && e.status !== 'failed' && sameName(e.subject, subject.name))
  const examsWithoutSubject = exams.filter((e) => (e.status === 'planned' || e.status === 'in_progress') && !subjects.some((s) => sameName(s.name, e.subject)))

  const createFromExams = (list: Exam[]) =>
    run(async () => {
      const names = [...new Set(list.map((e) => e.subject.trim()))]
      const created: Subject[] = []
      for (const examSubject of names) created.push(await createSubject(examSubject))
      setSubjects((s) => [...s, ...created].sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedId(created[0]?.id ?? null)
    }, t('subjects.saveError'))

  const startSession = (subject: Subject, topic?: Topic) => {
    const config: StudySessionConfig = {
      focusMinutes: 25,
      breakMinutes: 5,
      notes: '',
      subjectId: subject.id,
      topicId: topic?.id ?? null,
      subject: subject.name,
      topic: topic?.title ?? '',
    }
    navigate('/timer', { state: config })
  }

  const examSuggestions = examsWithoutSubject.length > 0 && (
    <div className="exam-suggestions">
      <div className="exam-suggestions-head">
        <h3 className="settings-subtitle">{t('subjects.fromExams')}</h3>
        {examsWithoutSubject.length > 1 && (
          <button className="btn btn-ghost" type="button" onClick={() => void createFromExams(examsWithoutSubject)}>{t('subjects.fromExamsAll')}</button>
        )}
      </div>
      <ul className="exam-suggestion-list">
        {examsWithoutSubject.map((exam) => (
          <li key={exam.id}>
            <button className="exam-suggestion" type="button" onClick={() => void createFromExams([exam])} aria-label={t('subjects.fromExamLabel', { name: exam.subject })}>
              <Plus aria-hidden="true" />
              <span>{exam.subject}</span>
              {exam.cfu && <span className="exam-suggestion-meta num">{exam.cfu} CFU</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )

  const addSubjectForm = (
    <form className="inline-form" onSubmit={addSubject}>
      <label className="visually-hidden" htmlFor="new-subject">{t('subjects.newSubject')}</label>
      <input
        id="new-subject"
        className="input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('subjects.newSubject')}
        maxLength={120}
      />
      <button className="btn btn-secondary" type="submit" disabled={saving || !name.trim()}>
        <Plus aria-hidden="true" /> {t('common.add')}
      </button>
    </form>
  )

  return (
    <div className="page subjects-page">
      <PageHeader
        title={t('subjects.title')}
        description={t('subjects.description')}
        actions={subjects.length > 0 && (
          <button className="btn btn-secondary" type="button" onClick={() => void downloadVault()} title={t('subjects.vaultHint')}>
            <Download aria-hidden="true" /> {t('subjects.vaultButton')}
          </button>
        )}
      />

      {error && <ErrorNotice message={error} onDismiss={() => setError('')} />}
      {notice && <div className="notice notice-success" role="status">{notice}<button className="btn btn-ghost" type="button" onClick={() => setNotice('')}>{t('common.close')}</button></div>}

      {loading ? (
        <LoadingRows label={t('subjects.loading')} />
      ) : subjects.length === 0 ? (
        <section className="panel subjects-empty">
          <EmptyState title={t('subjects.emptyTitle')}>
            {t('subjects.emptyBody')}
          </EmptyState>
          {examSuggestions}
          {addSubjectForm}
        </section>
      ) : (
        <div className="subjects-layout">
          <section className="panel subject-index" aria-labelledby="subject-index-title">
            <h2 id="subject-index-title" className="panel-title">
              {subjects.length} {subjects.length === 1 ? t('subjects.countOne') : t('subjects.countMany')}
            </h2>
            <ul className="subject-nav">
              {subjects.map((subject) => {
                const percent = progressOf(subject.topics)
                const minutes = minutesBySubject[subject.name]
                return (
                  <li key={subject.id}>
                    <button
                      type="button"
                      className="subject-nav-item"
                      aria-current={subject.id === selectedId ? 'true' : undefined}
                      onClick={() => setSelectedId(subject.id)}
                    >
                      <span className="subject-nav-name">{subject.name}</span>
                      <span className="subject-nav-meta num">
                        {subject.topics.length ? `${percent}%` : t('subjects.noTopics')}
                        {minutes ? ` · ${formatMinutes(minutes)}` : ''}
                      </span>
                      <ProgressBar percent={percent} label={t('subjects.progressLabel', { name: subject.name })} />
                    </button>
                  </li>
                )
              })}
            </ul>
            {addSubjectForm}
            {examSuggestions}
          </section>

          {selected && (
            <section className="panel subject-detail" aria-labelledby="subject-detail-title">
              <div className="subject-detail-head">
                <div>
                  <h2 id="subject-detail-title">{selected.name}</h2>
                  <p className="panel-meta num">
                    {t('subjects.topicsCompleted', { done: selected.topics.filter((x) => x.completed).length, total: selected.topics.length })}
                    {minutesBySubject[selected.name] ? t('subjects.studiedSuffix', { value: formatMinutes(minutesBySubject[selected.name]) }) : ''}
                  </p>
                </div>
                <div className="row-actions">
                  <button className="btn btn-primary" type="button" onClick={() => startSession(selected)}>
                    <Play aria-hidden="true" /> {t('subjects.study25')}
                  </button>
                  <ConfirmButton label={t('subjects.deleteSubjectLabel', { name: selected.name })} onConfirm={() => removeSubject(selected.id)} />
                </div>
              </div>

              {selected.topics.length > 0 && (
                <ProgressBar percent={progressOf(selected.topics)} label={t('subjects.progressLabel', { name: selected.name })} />
              )}

              {(() => {
                const exam = examFor(selected)
                if (!exam) return null
                return (
                  <div className="subject-exam">
                    <GraduationCap aria-hidden="true" />
                    <span className="subject-exam-main">
                      <span className="subject-exam-title">{exam.title}</span>
                      <span className="panel-meta">
                        {exam.exam_date ? `${formatDay(exam.exam_date, 'long', locale)} · ${relativeDay(exam.exam_date, locale)}` : t('exams.noDate')}
                        {exam.cfu ? ` · ${exam.cfu} CFU` : ''}
                      </span>
                    </span>
                    <Link className="text-link" to="/exams">{t('subjects.examLink')} <ArrowRight aria-hidden="true" /></Link>
                  </div>
                )
              })()}

              <form className="inline-form" onSubmit={addTopic}>
                <label className="visually-hidden" htmlFor="new-topic">{t('subjects.newTopicFor', { name: selected.name })}</label>
                <input
                  id="new-topic"
                  className="input"
                  value={topicTitle}
                  onChange={(e) => setTopicTitle(e.target.value)}
                  placeholder={t('subjects.topicPlaceholder')}
                  maxLength={200}
                />
                <button className="btn btn-secondary" type="submit" disabled={!topicTitle.trim()}>
                  <Plus aria-hidden="true" /> {t('common.add')}
                </button>
              </form>

              {selected.topics.length === 0 ? (
                <EmptyState compact title={t('subjects.noTopicsYetTitle')}>
                  {t('subjects.noTopicsYetBody')}
                </EmptyState>
              ) : (
                <ul className="rows topic-rows">
                  {selected.topics.map((topic) => (
                    <li className="row topic-row" key={topic.id}>
                      <label className="topic-label">
                        <input
                          className="check"
                          type="checkbox"
                          checked={topic.completed}
                          onChange={(e) => void toggleTopic(selected.id, topic.id, e.target.checked)}
                        />
                        <span className={topic.completed ? 'is-done' : undefined}>{topic.title}</span>
                      </label>
                      <span className="row-actions">
                        {!topic.completed && (
                          <button className="icon-btn row-reveal" type="button" onClick={() => startSession(selected, topic)} aria-label={t('subjects.studyTopic', { title: topic.title })} title={t('subjects.studyTopicTitle')}>
                            <Play aria-hidden="true" />
                          </button>
                        )}
                        <button
                          className={`icon-btn${topic.notes ? ' has-notes' : ' row-reveal'}`}
                          type="button"
                          onClick={() => openNotes(topic)}
                          aria-expanded={notesFor === topic.id}
                          aria-controls={`notes-${topic.id}`}
                          aria-label={t('subjects.notesLabel', { title: topic.title })}
                          title={t('subjects.notes')}
                        >
                          <NotebookPen aria-hidden="true" />
                        </button>
                        <span className="row-reveal">
                          <ConfirmButton label={t('subjects.deleteTopicLabel', { title: topic.title })} onConfirm={() => removeTopic(selected.id, topic.id)} />
                        </span>
                      </span>
                      {notesFor === topic.id && (
                        <label className="field topic-notes" id={`notes-${topic.id}`}>
                          <span className="visually-hidden">{t('subjects.notesLabel', { title: topic.title })}</span>
                          <textarea
                            value={notesDraft}
                            onChange={(e) => setNotesDraft(e.target.value)}
                            onBlur={() => saveNotes(selected.id, topic)}
                            rows={6}
                            maxLength={20000}
                            placeholder={t('subjects.notesPlaceholder')}
                            autoFocus
                          />
                          <span className="panel-meta">{t('subjects.notesHint')}</span>
                        </label>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  )
}

export default SubjectsPage
