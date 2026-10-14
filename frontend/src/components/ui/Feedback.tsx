import type { ReactNode } from 'react'

/**
 * Stati di contorno condivisi: vuoto, caricamento, errore.
 * Ogni schermata li usa al posto di paragrafi o card improvvisate.
 */

interface EmptyStateProps {
  title: string
  children?: ReactNode
  action?: ReactNode
  compact?: boolean
}

export function EmptyState({ title, children, action, compact = false }: EmptyStateProps) {
  return (
    <div className={`empty-state${compact ? ' empty-state-compact' : ''}`}>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}

export function LoadingRows({ rows = 3, label }: { rows?: number; label: string }) {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="visually-hidden">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <div className="skeleton skeleton-row" key={index} aria-hidden="true" />
      ))}
    </div>
  )
}

interface ErrorNoticeProps {
  message: string
  onRetry?: () => void
  onDismiss?: () => void
}

export function ErrorNotice({ message, onRetry, onDismiss }: ErrorNoticeProps) {
  return (
    <div className="notice notice-error" role="alert">
      <span>{message}</span>
      {onRetry && (
        <button className="btn btn-secondary" type="button" onClick={onRetry}>
          Riprova
        </button>
      )}
      {onDismiss && (
        <button className="btn btn-ghost" type="button" onClick={onDismiss}>
          Chiudi
        </button>
      )}
    </div>
  )
}
