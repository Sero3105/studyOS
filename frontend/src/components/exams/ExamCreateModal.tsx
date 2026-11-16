import Modal from '../ui/Modal'
import ExamForm from './ExamForm'
import type { CreateExamPayload } from '../../services/examService'
import { useLanguage } from '../../i18n/useLanguage'

interface ExamCreateModalProps {
  onSave: (payload: CreateExamPayload) => Promise<void>
  onClose: () => void
  initial?: CreateExamPayload
  lockedSubject?: string
  subjectFromTitle?: boolean
  title?: string
  description?: string
}

function ExamCreateModal({ onSave, onClose, initial, lockedSubject, subjectFromTitle, title, description }: ExamCreateModalProps) {
  const { t } = useLanguage()
  const editing = Boolean(initial)
  return (
    <Modal
      wide
      title={title ?? (editing ? t('exams.editExam') : t('exams.newExam'))}
      description={description ?? (editing ? t('exams.modalEditDesc') : t('exams.modalNewDesc'))}
      onClose={onClose}
    >
      <ExamForm onSave={onSave} onCancel={onClose} initial={initial} lockedSubject={lockedSubject} subjectFromTitle={subjectFromTitle} />
    </Modal>
  )
}

export default ExamCreateModal
