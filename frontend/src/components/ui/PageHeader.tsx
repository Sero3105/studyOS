import { useEffect } from 'react'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: ReactNode
  actions?: ReactNode
}

/**
 * Intestazione unica di ogni schermata: titolo, una riga di contesto e le
 * azioni della pagina allineate a destra sulla stessa linea del titolo.
 * Aggiorna anche il titolo del documento, così la scheda del browser dice
 * sempre dove si trova lo studente.
 */
function PageHeader({ title, description, actions }: PageHeaderProps) {
  useEffect(() => {
    document.title = `${title} · StudyOS`
  }, [title])

  return (
    <header className="page-header">
      <div className="page-header-copy">
        <h1>{title}</h1>
        {description && <p className="page-header-description">{description}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </header>
  )
}

export default PageHeader
