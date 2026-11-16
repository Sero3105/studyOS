import { useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import type { ReactNode } from 'react'
import { UndoContext } from '../context/undoContext'
import { useLanguage } from '../i18n/useLanguage'

const UNDO_MS = 5000

interface Pending { message: string; run: () => Promise<unknown>; restore: () => void }

/** Toast Sonner "Eliminato · Annulla": un'eliminazione alla volta; la successiva conferma subito la precedente. */
function UndoProvider({ children }: { children: ReactNode }) {
  const { t } = useLanguage()
  const pendingRef = useRef<Pending | null>(null)
  const timerRef = useRef<number | undefined>(undefined)

  const settle = useCallback((commit: boolean) => {
    const pending = pendingRef.current
    if (!pending) return
    pendingRef.current = null
    window.clearTimeout(timerRef.current)
    toast.dismiss('undo')
    if (commit) pending.run().catch(() => pending.restore())
    else pending.restore()
  }, [])

  const undoable = useCallback((text: string, run: () => Promise<unknown>, restore: () => void) => {
    settle(true)
    pendingRef.current = { message: text, run, restore }
    toast(text, { id: 'undo', duration: UNDO_MS, action: { label: t('common.undo'), onClick: () => settle(false) } })
    timerRef.current = window.setTimeout(() => settle(true), UNDO_MS)
  }, [settle, t])

  // Chiudendo la scheda l'eliminazione parte comunque, come se il tempo fosse scaduto.
  useEffect(() => {
    const flush = () => settle(true)
    window.addEventListener('pagehide', flush)
    return () => { window.removeEventListener('pagehide', flush); flush() }
  }, [settle])

  return (
    <UndoContext.Provider value={{ undoable }}>
      {children}
    </UndoContext.Provider>
  )
}

export default UndoProvider
