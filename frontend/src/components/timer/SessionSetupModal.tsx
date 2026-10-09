import SessionSetupForm from './SessionSetupForm'
import type { StudySessionConfig } from './types'

interface SessionSetupModalProps {
  onSubmit: (config: StudySessionConfig) => void
  onClose: () => void
}

function SessionSetupModal({ onSubmit, onClose }: SessionSetupModalProps) {
  return (
    <div className="session-modal-backdrop" role="presentation">
      <section
        className="session-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-setup-title"
      >
        <div className="session-modal-heading">
          <div>
            <p className="eyebrow">Nuova sessione</p>
            <h2 id="session-setup-title">Imposta il tuo focus</h2>
            <p>Configura la durata prima di iniziare a studiare.</p>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Chiudi">
            ×
          </button>
        </div>
        <SessionSetupForm onSubmit={onSubmit} onCancel={onClose} showCancel />
      </section>
    </div>
  )
}

export default SessionSetupModal
