import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'

interface ConfirmButtonProps {
  label: string
  onConfirm: () => void | Promise<void>
}

/**
 * Pulsante di eliminazione a due passaggi.
 *
 * Il primo clic trasforma l'icona in "Conferma"; il secondo esegue l'azione.
 * Torna allo stato iniziale da solo dopo qualche secondo o perdendo il focus,
 * così un clic accidentale non cancella mai dati.
 */
function ConfirmButton({ label, onConfirm }: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!armed) return
    const timeout = setTimeout(() => setArmed(false), 4000)
    return () => clearTimeout(timeout)
  }, [armed])

  if (!armed) {
    return (
      <button
        className="icon-btn icon-btn-danger"
        type="button"
        onClick={() => setArmed(true)}
        aria-label={label}
        title={label}
      >
        <Trash2 aria-hidden="true" />
      </button>
    )
  }

  return (
    <button
      className="btn btn-danger confirm-btn"
      type="button"
      disabled={busy}
      autoFocus
      onBlur={() => { if (!busy) setArmed(false) }}
      onClick={async () => {
        setBusy(true)
        try {
          await onConfirm()
        } finally {
          setBusy(false)
          setArmed(false)
        }
      }}
      aria-label={`Conferma: ${label}`}
    >
      {busy ? 'Elimino…' : 'Conferma'}
    </button>
  )
}

export default ConfirmButton
