import { useCallback, useEffect, useState } from 'react'
import Modal from '../ui/Modal'
import SubjectDot from '../ui/SubjectDot'
import { ErrorNotice, LoadingRows } from '../ui/Feedback'
import { getTasks, updateTask } from '../../services/taskService'
import type { Task } from '../../services/taskService'
import { getSessions } from '../../services/sessionService'
import type { StudySession } from '../../services/sessionService'
import { getSubjects } from '../../services/subjectService'
import type { Subject } from '../../services/subjectService'
import { postponeByWeeks, weeklyReview } from '../../utils/studyStats'
import { formatDay, formatMinutes, todayIso } from '../../utils/dates'
import { errorMessage } from '../../utils/errors'
import { useLanguage } from '../../i18n/useLanguage'

const delta = (now: number, before: number) => (now === before ? '=' : `${now > before ? '+' : '−'}${formatMinutes(Math.abs(now - before))}`)

/** Revisione della settimana: piano contro realtà, confronto con la settimana prima, task scaduti da spostare. */
function WeeklyReview({ onClose }: { onClose: () => void }) {
  const { t, locale } = useLanguage()
  const [data, setData] = useState<{ tasks: Task[]; sessions: StudySession[]; subjects: Subject[] } | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [moving, setMoving] = useState(false)

  const load = useCallback(() => {
    Promise.all([getTasks(), getSessions(), getSubjects()])
      .then(([tasks, sessions, subjects]) => setData({ tasks, sessions, subjects }))
      .catch((e) => setError(errorMessage(e, t('review.loadError'))))
  }, [t])
  useEffect(() => { queueMicrotask(load) }, [load])

  const today = todayIso()
  const review = data && weeklyReview(data.tasks, data.sessions, data.subjects, today)

  const moveOverdue = async () => {
    if (!review) return
    setMoving(true); setError(''); setNotice('')
    try {
      await Promise.all(review.overdue.map((task) => updateTask(task.id, { due_date: postponeByWeeks(task.due_date!, today) })))
      setNotice(t('review.moved', { count: review.overdue.length }))
    } catch (e) { setError(errorMessage(e, t('review.moveError'))) }
    finally { setMoving(false); load() }
  }

  return (
    <Modal
      wide
      title={t('review.title')}
      description={review ? t('review.range', { from: formatDay(review.from, 'short', locale), to: formatDay(review.to, 'long', locale) }) : undefined}
      onClose={onClose}
    >
      <div className="weekly-review">
      {error && <ErrorNotice message={error} onDismiss={() => setError('')} />}
      {notice && <div className="notice notice-success" role="status">{notice}</div>}
      {!review ? (!error && <LoadingRows label={t('review.loading')} />) : (
        <>
          <dl className="figure-grid">
            <div className="figure"><dt className="figure-label">{t('review.tasksDone')}</dt><dd className="figure-value num">{review.done}/{review.planned}</dd></div>
            <div className="figure"><dt className="figure-label">{t('review.skipped')}</dt><dd className="figure-value num">{review.skipped}</dd></div>
            <div className="figure">
              <dt className="figure-label">{t('review.studied')}</dt>
              <dd className="figure-value num">{formatMinutes(review.minutes)}</dd>
              <dd className="panel-meta num">{review.minutes === review.previousMinutes ? t('review.sameAsLastWeek') : t('review.vsLastWeek', { delta: delta(review.minutes, review.previousMinutes) })}</dd>
            </div>
          </dl>

          {review.bySubject.length > 0 && (
            <table className="plan-table">
              <thead>
                <tr>
                  <th scope="col">{t('planner.subject')}</th>
                  <th scope="col">{t('review.thisWeek')}</th>
                  <th scope="col">{t('review.lastWeek')}</th>
                  <th scope="col">{t('review.difference')}</th>
                </tr>
              </thead>
              <tbody>
                {review.bySubject.map((row) => (
                  <tr key={row.subjectId}>
                    <th scope="row"><SubjectDot subject={data.subjects.find((s) => s.id === row.subjectId)} />{row.name}</th>
                    <td className="num">{row.minutes ? formatMinutes(row.minutes) : '—'}</td>
                    <td className="num">{row.previous ? formatMinutes(row.previous) : '—'}</td>
                    <td className="num">{delta(row.minutes, row.previous)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="weekly-review-overdue">
            <p>{review.overdue.length ? t('review.overdue', { count: review.overdue.length }) : t('review.noOverdue')}</p>
            {review.overdue.length > 0 && (
              <button className="btn btn-primary" type="button" disabled={moving} onClick={() => void moveOverdue()}>{t('review.moveOverdue')}</button>
            )}
          </div>
        </>
      )}
      </div>
    </Modal>
  )
}

export default WeeklyReview
