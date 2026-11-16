import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import Modal from '../ui/Modal'
import Figures from '../ui/Figures'
import { Button } from '../ui/button'
import { Spinner } from '../ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
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
    setMoving(true); setError('')
    try {
      await Promise.all(review.overdue.map((task) => updateTask(task.id, { due_date: postponeByWeeks(task.due_date!, today) })))
      toast.success(t('review.moved', { count: review.overdue.length }))
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
      <div className="flex flex-col gap-6">
      {error && <ErrorNotice message={error} onDismiss={() => setError('')} />}
      {!review ? (!error && <LoadingRows label={t('review.loading')} />) : (
        <>
          <Figures items={[
            { label: t('review.tasksDone'), value: `${review.done}/${review.planned}` },
            { label: t('review.skipped'), value: review.skipped },
            {
              label: t('review.studied'),
              value: formatMinutes(review.minutes),
              sub: review.minutes === review.previousMinutes ? t('review.sameAsLastWeek') : t('review.vsLastWeek', { delta: delta(review.minutes, review.previousMinutes) }),
            },
          ]} />

          {review.bySubject.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">{t('planner.subject')}</TableHead>
                  <TableHead scope="col" className="text-right">{t('review.thisWeek')}</TableHead>
                  <TableHead scope="col" className="text-right">{t('review.lastWeek')}</TableHead>
                  <TableHead scope="col" className="text-right">{t('review.difference')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {review.bySubject.map((row) => (
                  <TableRow key={row.subjectId}>
                    <TableHead scope="row" className="font-normal text-foreground">
                      <span className="flex items-center gap-2"><SubjectDot subject={data.subjects.find((s) => s.id === row.subjectId)} />{row.name}</span>
                    </TableHead>
                    <TableCell className="text-right font-mono tabular-nums">{row.minutes ? formatMinutes(row.minutes) : '—'}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground tabular-nums">{row.previous ? formatMinutes(row.previous) : '—'}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{delta(row.minutes, row.previous)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">{review.overdue.length ? t('review.overdue', { count: review.overdue.length }) : t('review.noOverdue')}</p>
            {review.overdue.length > 0 && (
              <Button disabled={moving} onClick={() => void moveOverdue()}>{moving && <Spinner data-icon="inline-start" />}{t('review.moveOverdue')}</Button>
            )}
          </div>
        </>
      )}
      </div>
    </Modal>
  )
}

export default WeeklyReview
