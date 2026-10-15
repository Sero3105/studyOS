import Modal from '../ui/Modal'
import SessionSetupForm from './SessionSetupForm'
import type { StudySessionConfig } from './types'
import { useLanguage } from '../../i18n/useLanguage'

interface SessionSetupModalProps {
  onSubmit: (config: StudySessionConfig) => void
  onClose: () => void
}

function SessionSetupModal({ onSubmit, onClose }: SessionSetupModalProps) {
  const { t } = useLanguage()
  return (
    <Modal title={t('timer.newSession')} description={t('timer.modalDescription')} onClose={onClose}>
      <SessionSetupForm onSubmit={onSubmit} onCancel={onClose} showCancel />
    </Modal>
  )
}

export default SessionSetupModal
