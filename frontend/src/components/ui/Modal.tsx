import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}

/**
 * Dialog modale accessibile.
 *
 * - chiude con Escape o con un clic sullo sfondo,
 * - porta il focus sul primo campo all'apertura e lo restituisce
 *   all'elemento che l'aveva aperto alla chiusura,
 * - mantiene il Tab dentro al dialog,
 * - blocca lo scroll della pagina sottostante.
 */
function Modal({ title, description, onClose, children, wide = false }: ModalProps) {
  const dialogRef = useRef<HTMLElement>(null)
  const onCloseRef = useRef(onClose)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const dialog = dialogRef.current
    const focusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'input:not([disabled]), select:not([disabled]), textarea, button:not([disabled]), a[href]',
        ) ?? [],
      )
    const first = focusable().find((el) => el.tagName !== 'BUTTON') ?? focusable()[0]
    first?.focus()

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const items = focusable()
      if (items.length === 0) return
      const firstItem = items[0]
      const lastItem = items[items.length - 1]
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault()
        lastItem.focus()
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault()
        firstItem.focus()
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
      opener?.focus()
    }
  }, [])

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}
    >
      <section
        ref={dialogRef}
        className={`modal${wide ? ' modal-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
      >
        <div className="modal-head">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descriptionId}>{description}</p>}
          </div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Chiudi">
            <X aria-hidden="true" />
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}

export default Modal
