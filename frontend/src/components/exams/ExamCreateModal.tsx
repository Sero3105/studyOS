import Modal from '../ui/Modal'
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
    <Modal
      wide
      title={editing ? 'Modifica esame' : 'Nuovo esame'}
      description={editing ? 'Aggiorna i dettagli della prova.' : 'Bastano nome, materia e data: il resto è facoltativo.'}
      onClose={onClose}
    >
      <ExamForm onSave={onSave} onCancel={onClose} initial={initial} />
    </Modal>
  )
}

export default ExamCreateModal
