import { useEffect, useState } from 'react'
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

type ExamFilter = 'upcoming' | 'archive' | 'all'

/** In arrivo: non ancora sostenuto e con data da oggi in poi. */
function isUpcoming(exam: Exam): boolean {
  return (exam.status === 'planned' || exam.status === 'in_progress') && daysUntil(exam.exam_date) >= 0
}

function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingExam, setEditingExam] = useState<Exam | null>(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<ExamFilter>('upcoming')

  const loadExams = async () => {
    try {
      setError('')
      setExams(await getExams())
    } catch (loadError) {
      setError(errorMessage(loadError, 'Impossibile caricare gli esami'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    queueMicrotask(() => { void loadExams() })
  }, [])

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
      setError(errorMessage(deleteError, 'Eliminazione non riuscita'))
    }
  }

  const openCreate = () => { setEditingExam(null); setIsModalOpen(true) }
  const openEdit = (exam: Exam) => { setEditingExam(exam); setIsModalOpen(true) }

  const upcoming = sortExams(exams.filter(isUpcoming))
  const archive = sortExams(exams.filter((exam) => !isUpcoming(exam))).reverse()
  const visible = filter === 'upcoming' ? upcoming : filter === 'archive' ? archive : sortExams(exams)
  const [next, ...rest] = upcoming

  const description = loading
    ? 'Le tue prove, in ordine di data.'
    : next
      ? `${upcoming.length} in arrivo · il prossimo è ${relativeDay(next.exam_date).toLowerCase()}`
      : 'Nessun esame in arrivo.'

  return (
    <div className="page exams-page">
      <PageHeader
        title="Esami"
        description={description}
        actions={
          <button className="btn btn-primary" type="button" onClick={openCreate}>
            <Plus aria-hidden="true" />
            Nuovo esame
          </button>
        }
      />

      {error && <ErrorNotice message={error} onRetry={exams.length ? undefined : () => void loadExams()} onDismiss={exams.length ? () => setError('') : undefined} />}

      {loading ? (
        <LoadingRows label="Caricamento esami" />
      ) : exams.length === 0 && !error ? (
        <section className="panel">
          <EmptyState
            title="Nessun esame salvato"
            action={
              <button className="btn btn-primary" type="button" onClick={openCreate}>
                <Plus aria-hidden="true" />
                Aggiungi il primo esame
              </button>
            }
          >
            Inserisci la prossima prova: vedrai quanti giorni mancano qui e nella dashboard.
          </EmptyState>
        </section>
      ) : exams.length > 0 && (
        <section className="page-section" aria-label="Elenco esami">
          <div className="toolbar">
            <Segmented
              label="Filtra esami"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'upcoming', label: 'In arrivo', count: upcoming.length },
                { value: 'archive', label: 'Archivio', count: archive.length },
                { value: 'all', label: 'Tutti', count: exams.length },
              ]}
            />
          </div>

          {filter === 'upcoming' ? (
            next ? (
              <>
                <NextExam exam={next} onEdit={openEdit} onDelete={handleDelete} />
                {rest.length > 0 && (
                  <div className="page-section">
                    <h2 className="section-title">Più avanti</h2>
                    <ExamList exams={rest} onEdit={openEdit} onDelete={handleDelete} />
                  </div>
                )}
              </>
            ) : (
              <section className="panel">
                <EmptyState title="Nessun esame in arrivo">
                  Gli esami passati o già sostenuti sono nell'archivio.
                </EmptyState>
              </section>
            )
          ) : visible.length > 0 ? (
            <ExamList exams={visible} onEdit={openEdit} onDelete={handleDelete} />
          ) : (
            <section className="panel">
              <EmptyState title="L'archivio è vuoto">
                Qui finiscono gli esami con data passata o con esito registrato.
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
