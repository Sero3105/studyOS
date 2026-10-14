import Modal from '../ui/Modal'
import SessionSetupForm from './SessionSetupForm'
import type { StudySessionConfig } from './types'

interface SessionSetupModalProps {
  onSubmit: (config: StudySessionConfig) => void
  onClose: () => void
}

function SessionSetupModal({ onSubmit, onClose }: SessionSetupModalProps) {
  return (
    <Modal title="Nuova sessione" description="Scegli la durata e cosa studiare, poi parte il timer." onClose={onClose}>
      <SessionSetupForm onSubmit={onSubmit} onCancel={onClose} showCancel />
    </Modal>
  )
}

export default SessionSetupModal
