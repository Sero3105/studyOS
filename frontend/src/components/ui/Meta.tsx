import { Fragment } from 'react'
import type { ReactNode } from 'react'

interface MetaProps {
  items: ReactNode[]
  className?: string
}

/**
 * Riga di dettagli separati da "·".
 *
 * Il separatore è legato all'elemento precedente da uno spazio non
 * separabile: quando la riga va a capo, il "·" resta in fondo alla riga
 * sopra e nessuna riga comincia con un separatore. Gli elementi vuoti
 * vengono ignorati.
 */
function Meta({ items, className = 'row-meta' }: MetaProps) {
  const parts = items.filter((item) => item !== null && item !== undefined && item !== false && item !== '')
  return (
    <span className={className}>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {index > 0 && ' · '}
          {part}
        </Fragment>
      ))}
    </span>
  )
}

export default Meta
