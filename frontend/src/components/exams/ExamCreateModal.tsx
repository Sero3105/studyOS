import Modal from '../ui/Modal'
import ExamForm from './ExamForm'
import type { CreateExamPayload } from '../../services/examService'
import { useLanguage } from '../../i18n/useLanguage'

interface ExamCreateModalProps {
  onSave: (payload: CreateExamPayload) => Promise<void>
  onClose: () => void
  initial?: CreateExamPayload
}

function ExamCreateModal({ onSave, onClose, initial }: ExamCreateModalProps) {
  const { t } = useLanguage()
  const editing = Boolean(initial)
  return (
    <Modal
      wide
      title={editing ? t('exams.editExam') : t('exams.newExam')}
      description={editing ? t('exams.modalEditDesc') : t('exams.modalNewDesc')}
      onClose={onClose}
    >
      <ExamForm onSave={onSave} onCancel={onClose} initial={initial} />
    </Modal>
  )
}

export default ExamCreateModal
