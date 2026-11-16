import { useEffect } from 'react'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: ReactNode
  actions?: ReactNode
  /** Riga piccola sopra il titolo (es. data di oggi). */
  eyebrow?: ReactNode
}

/**
 * Intestazione unica di ogni schermata: titolo, una riga di contesto e le
 * azioni della pagina allineate a destra. Aggiorna anche il titolo del documento.
 */
function PageHeader({ title, description, actions, eyebrow }: PageHeaderProps) {
  useEffect(() => {
    document.title = `${title} · StudyOS`
  }, [title])

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        {eyebrow && <p className="font-mono text-xs tracking-wider text-muted-foreground uppercase">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">{title}</h1>
        {description && <p className="max-w-prose text-sm text-pretty text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

export default PageHeader
