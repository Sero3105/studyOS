import ExamForm from './ExamForm'
import type { CreateExamPayload } from '../../services/examService'

interface ExamCreateModalProps {
  onSave: (payload: CreateExamPayload) => Promise<void>
  onClose: () => void
  initial?: CreateExamPayload
}

function ExamCreateModal({ onSave, onClose, initial }: ExamCreateModalProps) {
  const editing = Boolean(initial)
  return (
    <div className="session-modal-backdrop" role="presentation">
      <section
        className="session-modal exam-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exam-create-title"
        aria-describedby="exam-create-description"
      >
        <div className="session-modal-heading">
          <div>
            <p className="eyebrow">Pianificazione</p>
            <h2 id="exam-create-title">{editing ? 'Modifica esame' : 'Nuovo esame'}</h2>
            <p id="exam-create-description">
              {editing ? 'Aggiorna i dettagli della prova.' : 'Inserisci i dettagli della prova per aggiungerla alla tua agenda.'}
            </p>
          </div>
          <button
            className="modal-close"
            type="button"
            onClick={onClose}
            aria-label="Chiudi finestra nuovo esame"
          >
            ×
          </button>
        </div>
        <ExamForm onSave={onSave} onCancel={onClose} initial={initial} />
      </section>
    </div>
  )
}

export default ExamCreateModal
