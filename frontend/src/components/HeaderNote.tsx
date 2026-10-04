import type { ReactNode } from 'react'

/**
 * Props del componente HeaderNote.
 *
 * `children` rappresenta il contenuto testuale che verrà mostrato dentro il
 * paragrafo. In React, un componente può ricevere nodi JSX figli e renderizzarli
 * direttamente in modo molto flessibile.
 */
interface HeaderNoteProps {
  children: ReactNode
}

/**
 * Piccola nota testuale usata come slogan o frase di contesto nelle pagine.
 *
 * È un componente molto semplice e riutilizzabile per aggiungere messaggi
 * visivi senza logica di business.
 */
function HeaderNote({ children }: HeaderNoteProps) {
  return <p className="header-note">{children}</p>
}

export default HeaderNote