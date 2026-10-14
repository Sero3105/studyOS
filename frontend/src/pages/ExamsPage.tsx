import { useEffect, useState } from 'react'
import { CalendarPlus, GraduationCap, Plus } from 'lucide-react'
import ExamCreateModal from '../components/exams/ExamCreateModal'
import ExamList from '../components/exams/ExamList'
import { createExam, deleteExam, getExams, updateExam } from '../services/examService'
import type { CreateExamPayload, Exam } from '../services/examService'

function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingExam, setEditingExam] = useState<Exam | null>(null)
  const [error, setError] = useState('')

  const loadExams = async () => {
    try {
      setError('')
      setExams(await getExams())
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Impossibile caricare gli esami',
      )
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
    await deleteExam(exam.id)
    setExams((currentExams) => currentExams.filter((x) => x.id !== exam.id))
  }

  return (
    <section className="dashboard-page exams-page">
      <div className="exams-hero">
        <div className="exams-hero-copy">
          <div className="exams-title-row">
            <span className="exams-title-icon" aria-hidden="true">
              <GraduationCap size={19} />
            </span>
            <div>
              <p className="section-kicker">Library / Exams</p>
              <h1>I tuoi esami</h1>
            </div>
          </div>
          <p className="exams-intro">
            Tieni sotto controllo le prossime prove e organizza meglio la tua
            preparazione.
          </p>
        </div>

        <button
          className="button exams-primary-action"
          type="button"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus size={17} aria-hidden="true" />
          Nuovo esame
        </button>
      </div>

      <div className="exams-summary" aria-label="Riepilogo esami">
        <div>
          <span className="exams-summary-label">Totale esami</span>
          <strong>{exams.length}</strong>
        </div>
        <div className="exams-summary-divider" />
        <p>
          {exams.length
            ? 'Mantieni il ritmo e preparati con anticipo.'
            : 'Aggiungi il primo esame per iniziare a pianificare.'}
        </p>
      </div>

      {loading ? (
        <div className="dashboard-card exams-state-card">
          <div className="exams-loading-dot" aria-hidden="true" />
          <p>Caricamento esami…</p>
        </div>
      ) : error ? (
        <div className="dashboard-card exams-state-card exams-error-card" role="alert">
          <h2>Non riusciamo a caricare gli esami</h2>
          <p>{error}</p>
          <button className="button button-secondary" type="button" onClick={loadExams}>
            Riprova
          </button>
        </div>
      ) : exams.length ? (
        <ExamList exams={exams} onEdit={(exam) => { setEditingExam(exam); setIsModalOpen(true) }} onDelete={(exam) => { void handleDelete(exam) }} />
      ) : (
        <div className="dashboard-card exams-empty-card">
          <span className="exams-empty-icon" aria-hidden="true">
            <CalendarPlus size={25} />
          </span>
          <div>
            <p className="section-kicker">Il tuo calendario inizia qui</p>
            <h2>Nessun esame salvato</h2>
            <p>
              Inserisci la prossima prova per avere sempre a portata di mano
              data, materia e luogo.
            </p>
            <button
              className="button exams-empty-action"
              type="button"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus size={16} aria-hidden="true" />
              Aggiungi il primo esame
            </button>
          </div>
        </div>
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
    </section>
  )
}

export default ExamsPage
