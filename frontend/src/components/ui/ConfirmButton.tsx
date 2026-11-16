import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useLanguage } from '../../i18n/useLanguage'
import { Button } from './button'

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
  const { t } = useLanguage()
  const [armed, setArmed] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!armed) return
    const timeout = setTimeout(() => setArmed(false), 4000)
    return () => clearTimeout(timeout)
  }, [armed])

  if (!armed) {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setArmed(true)}
        aria-label={label}
        title={label}
      >
        <Trash2 aria-hidden="true" />
      </Button>
    )
  }

  return (
    <Button
      variant="destructive"
      size="sm"
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
      aria-label={t('common.confirmLabel', { label })}
    >
      {busy ? t('common.deleting') : t('common.confirm')}
    </Button>
  )
}

export default ConfirmButton
