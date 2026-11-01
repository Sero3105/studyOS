import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Play, Plus } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import DeleteButton from '../components/ui/DeleteButton'
import { useUndo } from '../context/undoContext'
import { EmptyState, ErrorNotice, LoadingRows } from '../components/ui/Feedback'
import { createSession, deleteSession, getSessions, SESSION_KINDS, updateSession } from '../services/sessionService'
import type { CreateSessionPayload, SessionKind, StudySession } from '../services/sessionService'
import { getSubjects } from '../services/subjectService'
import type { Subject } from '../services/subjectService'
import { daysUntil, formatDay, formatMinutes, relativeDay, todayIso } from '../utils/dates'
import { errorMessage } from '../utils/errors'
import { useLanguage } from '../i18n/useLanguage'

/** Sessione inserita o corretta a mano: studio senza timer (lezione, biblioteca) o blocco registrato male. */
function SessionForm({ subjects, initial, onSave, onCancel }: {
  subjects: Subject[]
  initial?: StudySession
  onSave: (payload: CreateSessionPayload) => Promise<void>
  onCancel: () => void
}) {
  const { t } = useLanguage()
  const [studiedOn, setStudiedOn] = useState(initial?.studied_on ?? todayIso())
  const [minutes, setMinutes] = useState(String(initial?.duration_minutes ?? 60))
  const [subjectId, setSubjectId] = useState(String(initial?.subject_id ?? ''))
  const [topicId, setTopicId] = useState(String(initial?.topic_id ?? ''))
  const [notes, setNotes] = useState(initial?.notes ?? '')
  // Una sessione aggiunta a mano è spesso una lezione: è il default solo per quelle nuove.
  const [kind, setKind] = useState<SessionKind>(initial?.kind ?? 'lesson')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const subject = subjects.find((s) => s.id === Number(subjectId))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const duration = Number(minutes)
    if (!Number.isInteger(duration) || duration <= 0 || duration > 1440 || !studiedOn) { setError(t('history.formError')); return }
    setBusy(true); setError('')
    try {
      await onSave({
        studied_on: studiedOn,
        duration_minutes: duration,
        subject_id: subjectId ? Number(subjectId) : null,
        topic_id: topicId ? Number(topicId) : null,
        notes: notes.trim() || null,
        kind,
      })
    } catch (e) { setError(errorMessage(e, t('history.saveError'))); setBusy(false) }
  }

  return (
    <form className="history-form" onSubmit={(e) => void submit(e)} noValidate>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">{t('history.date')}</span>
          <input type="date" required max={todayIso()} value={studiedOn} onChange={(e) => setStudiedOn(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">{t('history.minutes')}</span>
          <input type="number" inputMode="numeric" min="1" max="1440" step="1" required value={minutes} onChange={(e) => setMinutes(e.target.value)} aria-invalid={Boolean(error)} />
        </label>
        <label className="field">
          <span className="field-label">{t('session.kind')}</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as SessionKind)}>
            {SESSION_KINDS.map((value) => <option key={value} value={value}>{t(`session.kind.${value}`)}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="field-label">{t('timer.subject')} <em>{t('common.optional')}</em></span>
          <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setTopicId('') }}>
            <option value="">{t('common.noneFeminine')}</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="field-label">{t('timer.topic')} <em>{t('common.optional')}</em></span>
          <select value={topicId} onChange={(e) => setTopicId(e.target.value)} disabled={!subject?.topics.length}>
            <option value="">{t('common.noneMasculine')}</option>
            {subject?.topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.title}</option>)}
          </select>
        </label>
      </div>
      <label className="field">
        <span className="field-label">{t('timer.note')} <em>{t('common.optional')}</em></span>
        <input value={notes} maxLength={2000} onChange={(e) => setNotes(e.target.value)} />
      </label>
      {error && <p className="field-error" role="alert">{error}</p>}
      <div className="form-actions">
        <button className="btn btn-ghost" type="button" onClick={onCancel}>{t('common.cancel')}</button>
        <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? t('common.saving') : t('history.save')}</button>
      </div>
    </form>
  )
}

/**
 * Storico: sessioni raggruppate per giorno, dal più recente, con il totale
 * di ogni giorno sulla stessa riga della data. Il filtro per materia
 * ricalcola sia i gruppi sia i totali.
 */
function HistoryPage() {
  const { t, locale } = useLanguage()
  const { undoable } = useUndo()
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const load = useCallback(async (): Promise<void> => {
    try {
      setError('')
      const [sessionList, subjectList] = await Promise.all([getSessions(), getSubjects()])
      setSessions(sessionList); setSubjects(subjectList)
    } catch (e) { setError(errorMessage(e, t('history.loadError'))) }
    finally { setLoading(false) }
  }, [t])
  useEffect(() => { queueMicrotask(() => { void load() }) }, [load])

  const remove = (session: StudySession) => {
    setSessions((s) => s.filter((x) => x.id !== session.id))
    undoable(t('history.deleted', { minutes: formatMinutes(session.duration_minutes) }), () => deleteSession(session.id), () => setSessions((s) => [...s, session]))
  }

  const add = async (payload: CreateSessionPayload) => {
    const created = await createSession(payload)
    setSessions((s) => [...s, created]); setAdding(false)
  }

  const save = async (id: number, payload: CreateSessionPayload) => {
    const updated = await updateSession(id, payload)
    setSessions((s) => s.map((x) => (x.id === id ? updated : x))); setEditingId(null)
  }

  const subjectName = (id: number | null) => subjects.find((s) => s.id === id)?.name ?? t('history.freeSession')
  const topicName = (session: StudySession) =>
    subjects.find((s) => s.id === session.subject_id)?.topics.find((t) => t.id === session.topic_id)?.title

  const filtered = sessions
    .filter((s) => subjectFilter === 'all' || (subjectFilter === 'none' ? s.subject_id === null : s.subject_id === Number(subjectFilter)))
    .sort((a, b) => b.studied_on.localeCompare(a.studied_on) || b.id - a.id)
  const total = filtered.reduce((sum, s) => sum + s.duration_minutes, 0)
  const days = [...new Set(filtered.map((s) => s.studied_on))]

  return (
    <div className="page history-page">
      <PageHeader
        title={t('history.title')}
        description={
          sessions.length
            ? t('history.descriptionWith', { count: filtered.length, countLabel: filtered.length === 1 ? t('history.sessionOne') : t('history.sessionMany'), total: formatMinutes(total), days: days.length, daysLabel: days.length === 1 ? t('history.dayOne') : t('history.dayMany') })
            : t('history.descriptionEmpty')
        }
        actions={
          <>
            {sessions.length > 0 && (
              <label className="field history-filter">
                <span className="visually-hidden">{t('history.filterBySubject')}</span>
                <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} aria-label={t('history.filterBySubject')}>
                  <option value="all">{t('history.allSubjects')}</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  <option value="none">{t('history.freeSessions')}</option>
                </select>
              </label>
            )}
            <button className="btn btn-primary" type="button" onClick={() => setAdding(true)} disabled={adding}>
              <Plus aria-hidden="true" /> {t('history.addSession')}
            </button>
          </>
        }
      />

      {adding && (
        <section className="panel" aria-labelledby="history-add-title">
          <h2 id="history-add-title" className="panel-title">{t('history.addTitle')}</h2>
          <p className="panel-meta history-add-hint">{t('history.addHint')}</p>
          <SessionForm subjects={subjects} onSave={add} onCancel={() => setAdding(false)} />
        </section>
      )}

      {error && <ErrorNotice message={error} onRetry={sessions.length ? undefined : () => void load()} onDismiss={sessions.length ? () => setError('') : undefined} />}

      {loading ? (
        <LoadingRows rows={5} label={t('history.loading')} />
      ) : sessions.length === 0 ? (
        !error && (
          <section className="panel">
            <EmptyState
              title={t('history.emptyTitle')}
              action={<Link className="btn btn-primary" to="/timer"><Play aria-hidden="true" /> {t('history.startTimer')}</Link>}
            >
              {t('history.emptyBody')}
            </EmptyState>
          </section>
        )
      ) : filtered.length === 0 ? (
        <section className="panel">
          <EmptyState title={t('history.noForSubjectTitle')}>{t('history.noForSubjectBody')}</EmptyState>
        </section>
      ) : (
        <ol className="panel grouped-list history-days">
          {days.map((day) => {
            const daySessions = filtered.filter((s) => s.studied_on === day)
            const dayTotal = daySessions.reduce((sum, s) => sum + s.duration_minutes, 0)
            const relative = relativeDay(day, locale)
            return (
              <li className="list-group" key={day}>
                <div className="list-group-head">
                  <h2 className="list-group-title">
                    {formatDay(day, 'full', locale)}
                    {(daysUntil(day) === 0 || daysUntil(day) === -1) && <span className="history-relative">{relative}</span>}
                  </h2>
                  <span className="history-day-total num">
                    {formatMinutes(dayTotal)} · {daySessions.length} {daySessions.length === 1 ? t('history.sessionOne') : t('history.sessionMany')}
                  </span>
                </div>
                <ul className="rows">
                  {daySessions.map((session) => {
                    const topic = topicName(session)
                    if (editingId === session.id) {
                      return (
                        <li className="history-edit" key={session.id}>
                          <SessionForm subjects={subjects} initial={session} onSave={(payload) => save(session.id, payload)} onCancel={() => setEditingId(null)} />
                        </li>
                      )
                    }
                    return (
                      <li className="row" key={session.id}>
                        <span className="history-duration num">{formatMinutes(session.duration_minutes)}</span>
                        <span className="row-main">
                          <span className="row-title">{subjectName(session.subject_id)}{topic ? ` / ${topic}` : ''}</span>
                          {(session.kind !== 'study' || session.focus || session.notes) && (
                            <span className="row-meta history-note">
                              {[session.kind !== 'study' && t(`session.kind.${session.kind}`), session.focus && t(`session.focus.${session.focus}`), session.notes].filter(Boolean).join(' · ')}
                            </span>
                          )}
                        </span>
                        <span className="row-actions row-reveal">
                          <button className="icon-btn" type="button" onClick={() => setEditingId(session.id)} aria-label={t('history.editSession')} title={t('history.editSession')}>
                            <Pencil aria-hidden="true" />
                          </button>
                          <DeleteButton label={t('history.deleteSession')} onDelete={() => remove(session)} />
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

export default HistoryPage
