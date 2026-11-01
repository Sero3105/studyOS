import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { UndoContext } from '../context/undoContext'
import { useLanguage } from '../i18n/useLanguage'

const UNDO_MS = 5000

interface Pending { message: string; run: () => Promise<unknown>; restore: () => void }

/** Toast "Eliminato · Annulla": un'eliminazione alla volta; la successiva conferma subito la precedente. */
function UndoProvider({ children }: { children: ReactNode }) {
  const { t } = useLanguage()
  const [message, setMessage] = useState<string | null>(null)
  const pendingRef = useRef<Pending | null>(null)
  const timerRef = useRef<number | undefined>(undefined)

  const settle = useCallback((commit: boolean) => {
    const pending = pendingRef.current
    if (!pending) return
    pendingRef.current = null
    window.clearTimeout(timerRef.current)
    setMessage(null)
    if (commit) pending.run().catch(() => pending.restore())
    else pending.restore()
  }, [])

  const undoable = useCallback((text: string, run: () => Promise<unknown>, restore: () => void) => {
    settle(true)
    pendingRef.current = { message: text, run, restore }
    setMessage(text)
    timerRef.current = window.setTimeout(() => settle(true), UNDO_MS)
  }, [settle])

  // Chiudendo la scheda l'eliminazione parte comunque, come se il tempo fosse scaduto.
  useEffect(() => {
    const flush = () => settle(true)
    window.addEventListener('pagehide', flush)
    return () => { window.removeEventListener('pagehide', flush); flush() }
  }, [settle])

  return (
    <UndoContext.Provider value={{ undoable }}>
      {children}
      {message && (
        <div className="toast" role="status">
          <span>{message}</span>
          <button className="btn btn-ghost toast-action" type="button" onClick={() => settle(false)}>{t('common.undo')}</button>
        </div>
      )}
    </UndoContext.Provider>
  )
}

export default UndoProvider
