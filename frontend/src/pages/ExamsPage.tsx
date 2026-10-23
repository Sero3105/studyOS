import { useCallback, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Segmented from '../components/ui/Segmented'
import { EmptyState, ErrorNotice, LoadingRows } from '../components/ui/Feedback'
import ExamCreateModal from '../components/exams/ExamCreateModal'
import ExamList, { NextExam } from '../components/exams/ExamList'
import { createExam, deleteExam, getExams, updateExam } from '../services/examService'
import type { CreateExamPayload, Exam } from '../services/examService'
import { daysUntil, relativeDay } from '../utils/dates'
import { errorMessage } from '../utils/errors'
import { useLanguage } from '../i18n/useLanguage'

type ExamFilter = 'upcoming' | 'archive' | 'all'

/** In arrivo: non ancora sostenuto e con data da oggi in poi. */
function isUpcoming(exam: Exam): boolean {
  return (exam.status === 'planned' || exam.status === 'in_progress') && daysUntil(exam.exam_date) >= 0
}

function ExamsPage() {
  const { t, locale } = useLanguage()
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingExam, setEditingExam] = useState<Exam | null>(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<ExamFilter>('upcoming')

  const loadExams = useCallback(async () => {
    try {
      setError('')
      setExams(await getExams())
    } catch (loadError) {
      setError(errorMessage(loadError, t('exams.loadError')))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    queueMicrotask(() => { void loadExams() })
  }, [loadExams])

  const sortExams = (list: Exam[]) =>
    [...list].sort(
      (first, second) =>
        first.exam_date.localeCompare(second.exam_date) ||
        (first.exam_time ?? '99:99').localeCompare(second.exam_time ?? '99:99'),
    )

  const handleSave = async (payload: CreateExamPayload) => {
    if (editingExam) {
      const exam = await updateExam(editingExam.id, payload)
      setExams((currentExams) => sortExams(currentExams.map((x) => (x.id === exam.id ? exam : x))))
    } else {
      const exam = await createExam(payload)
      setExams((currentExams) => sortExams([...currentExams, exam]))
    }
    setIsModalOpen(false)
    setEditingExam(null)
  }

  const handleDelete = async (exam: Exam) => {
    try {
      await deleteExam(exam.id)
      setExams((currentExams) => currentExams.filter((x) => x.id !== exam.id))
    } catch (deleteError) {
      setError(errorMessage(deleteError, t('exams.deleteError')))
    }
  }

  const openCreate = () => { setEditingExam(null); setIsModalOpen(true) }
  const openEdit = (exam: Exam) => { setEditingExam(exam); setIsModalOpen(true) }

  const upcoming = sortExams(exams.filter(isUpcoming))
  const archive = sortExams(exams.filter((exam) => !isUpcoming(exam))).reverse()
  const visible = filter === 'upcoming' ? upcoming : filter === 'archive' ? archive : sortExams(exams)
  const [next, ...rest] = upcoming

  const description = loading
    ? t('exams.descriptionLoading')
    : next
      ? t('exams.descriptionNext', { count: upcoming.length, when: relativeDay(next.exam_date, locale).toLowerCase() })
      : t('exams.descriptionNone')

  return (
    <div className="page exams-page">
      <PageHeader
        title={t('exams.title')}
        description={description}
        actions={
          <button className="btn btn-primary" type="button" onClick={openCreate}>
            <Plus aria-hidden="true" />
            {t('exams.newExam')}
          </button>
        }
      />

      {error && <ErrorNotice message={error} onRetry={exams.length ? undefined : () => void loadExams()} onDismiss={exams.length ? () => setError('') : undefined} />}

      {loading ? (
        <LoadingRows label={t('exams.loading')} />
      ) : exams.length === 0 && !error ? (
        <section className="panel">
          <EmptyState
            title={t('exams.emptyTitle')}
            action={
              <button className="btn btn-primary" type="button" onClick={openCreate}>
                <Plus aria-hidden="true" />
                {t('exams.addFirst')}
              </button>
            }
          >
            {t('exams.emptyBody')}
          </EmptyState>
        </section>
      ) : exams.length > 0 && (
        <section className="page-section" aria-label={t('exams.listLabel')}>
          <div className="toolbar">
            <Segmented
              label={t('exams.filter')}
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'upcoming', label: t('exams.upcomingFilter'), count: upcoming.length },
                { value: 'archive', label: t('exams.archiveFilter'), count: archive.length },
                { value: 'all', label: t('exams.allFilter'), count: exams.length },
              ]}
            />
          </div>

          {filter === 'upcoming' ? (
            next ? (
              <>
                <NextExam exam={next} onEdit={openEdit} onDelete={handleDelete} />
                {rest.length > 0 && (
                  <div className="page-section">
                    <h2 className="section-title">{t('exams.comingLater')}</h2>
                    <ExamList exams={rest} onEdit={openEdit} onDelete={handleDelete} />
                  </div>
                )}
              </>
            ) : (
              <section className="panel">
                <EmptyState title={t('exams.noUpcomingTitle')}>
                  {t('exams.noUpcomingBody')}
                </EmptyState>
              </section>
            )
          ) : visible.length > 0 ? (
            <ExamList exams={visible} onEdit={openEdit} onDelete={handleDelete} />
          ) : (
            <section className="panel">
              <EmptyState title={t('exams.archiveEmptyTitle')}>
                {t('exams.archiveEmptyBody')}
              </EmptyState>
            </section>
          )}
        </section>
      )}

      {isModalOpen && (
        <ExamCreateModal
          onSave={handleSave}
          onClose={() => { setIsModalOpen(false); setEditingExam(null) }}
          initial={editingExam ? {
            title: editingExam.title,
            subject: editingExam.subject,
            exam_date: editingExam.exam_date,
            exam_time: editingExam.exam_time ?? undefined,
            location: editingExam.location ?? undefined,
            notes: editingExam.notes ?? undefined,
            status: editingExam.status,
          } : undefined}
        />
      )}
    </div>
  )
}

export default ExamsPage
