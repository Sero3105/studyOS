import { useEffect, useState } from 'react'
import { CalendarPlus, GraduationCap, Plus } from 'lucide-react'
import ExamCreateModal from '../components/exams/ExamCreateModal'
import ExamList from '../components/exams/ExamList'
import { createExam, getExams } from '../services/examService'
import type { CreateExamPayload, Exam } from '../services/examService'

function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
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

  const handleSave = async (payload: CreateExamPayload) => {
    const exam = await createExam(payload)
    setExams((currentExams) =>
      [...currentExams, exam].sort(
        (first, second) =>
          first.exam_date.localeCompare(second.exam_date) ||
          (first.exam_time ?? '99:99').localeCompare(second.exam_time ?? '99:99'),
      ),
    )
    setIsModalOpen(false)
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
        <ExamList exams={exams} />
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
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </section>
  )
}

export default ExamsPage
