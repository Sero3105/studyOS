import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Play } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import ConfirmButton from '../components/ui/ConfirmButton'
import { EmptyState, ErrorNotice, LoadingRows } from '../components/ui/Feedback'
import { deleteSession, getSessions } from '../services/sessionService'
import type { StudySession } from '../services/sessionService'
import { getSubjects } from '../services/subjectService'
import type { Subject } from '../services/subjectService'
import { daysUntil, formatDay, formatMinutes, relativeDay } from '../utils/dates'
import { errorMessage } from '../utils/errors'
import { useLanguage } from '../i18n/useLanguage'

/**
 * Storico: sessioni raggruppate per giorno, dal più recente, con il totale
 * di ogni giorno sulla stessa riga della data. Il filtro per materia
 * ricalcola sia i gruppi sia i totali.
 */
function HistoryPage() {
  const { t, locale } = useLanguage()
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('all')

  const load = useCallback(async (): Promise<void> => {
    try {
      setError('')
      const [sessionList, subjectList] = await Promise.all([getSessions(), getSubjects()])
      setSessions(sessionList); setSubjects(subjectList)
    } catch (e) { setError(errorMessage(e, t('history.loadError'))) }
    finally { setLoading(false) }
  }, [t])
  useEffect(() => { queueMicrotask(() => { void load() }) }, [load])

  const remove = async (id: number) => {
    try {
      await deleteSession(id)
      setSessions((s) => s.filter((x) => x.id !== id))
    } catch (e) { setError(errorMessage(e, t('history.deleteError'))) }
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
          sessions.length > 0 && (
            <label className="field history-filter">
              <span className="visually-hidden">{t('history.filterBySubject')}</span>
              <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} aria-label={t('history.filterBySubject')}>
                <option value="all">{t('history.allSubjects')}</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                <option value="none">{t('history.freeSessions')}</option>
              </select>
            </label>
          )
        }
      />

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
                    return (
                      <li className="row" key={session.id}>
                        <span className="history-duration num">{formatMinutes(session.duration_minutes)}</span>
                        <span className="row-main">
                          <span className="row-title">{subjectName(session.subject_id)}{topic ? ` / ${topic}` : ''}</span>
                          {session.notes && <span className="row-meta history-note">{session.notes}</span>}
                        </span>
                        <span className="row-reveal">
                          <ConfirmButton label={t('history.deleteSession')} onConfirm={() => remove(session.id)} />
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
