import type { ReactNode } from 'react'
import { CircleAlert } from 'lucide-react'
import { useLanguage } from '../../i18n/useLanguage'
import { Alert, AlertAction, AlertDescription } from './alert'
import { Button } from './button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from './empty'
import { Skeleton } from './skeleton'

/** Stati di contorno condivisi: vuoto, caricamento, errore. */

interface EmptyStateProps {
  title: string
  children?: ReactNode
  action?: ReactNode
  compact?: boolean
}

export function EmptyState({ title, children, action, compact = false }: EmptyStateProps) {
  return (
    <Empty className={compact ? 'gap-3 border border-dashed p-6 md:p-6' : 'border border-dashed'}>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        {children && <EmptyDescription>{children}</EmptyDescription>}
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  )
}

export function LoadingRows({ rows = 3, label }: { rows?: number; label: string }) {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, index) => <Skeleton className="h-12 w-full" key={index} aria-hidden="true" />)}
    </div>
  )
}

interface ErrorNoticeProps {
  message: string
  onRetry?: () => void
  onDismiss?: () => void
}

export function ErrorNotice({ message, onRetry, onDismiss }: ErrorNoticeProps) {
  const { t } = useLanguage()
  return (
    <Alert variant="destructive" role="alert">
      <CircleAlert aria-hidden="true" />
      <AlertDescription>{message}</AlertDescription>
      {(onRetry || onDismiss) && (
        <AlertAction className="flex gap-1">
          {onRetry && <Button size="sm" variant="outline" onClick={onRetry}>{t('common.retry')}</Button>}
          {onDismiss && <Button size="sm" variant="ghost" onClick={onDismiss}>{t('common.close')}</Button>}
        </AlertAction>
      )}
    </Alert>
  )
}
