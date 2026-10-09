import HeaderNote from './HeaderNote'
import { Plus } from 'lucide-react'

/**
 * Props del componente Header.
 *
 * `userName` viene passato dalla pagina Dashboard e viene mostrato nel saluto
 * iniziale. Questo pattern permette di costruire componenti riutilizzabili e
 * testabili: non dipendono da dati globali, ma ricevono tutto tramite props.
 */
interface HeaderProps {
  userName: string
  onNewSession: () => void
}

/**
 * Header della pagina.
 *
 * È un componente presentazionale: riceve dati, li mostra e non gestisce
 * business logic. In un'app più grande potrebbe includere dati di calendario,
 * statistiche, o accessi rapidi.
 */
function Header({ userName, onNewSession }: HeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header-copy">
        <p className="eyebrow">Today&apos;s focus</p>
        <h1>Welcome back, {userName}</h1>
        <p className="page-header-intro">
          Organizza il tuo tempo, ritrova il ritmo e continua a fare progressi.
        </p>
      </div>
      <div className="page-header-actions">
        <HeaderNote>Focus. Learn. Improve.</HeaderNote>
        <button className="primary-action" type="button" onClick={onNewSession}>
          <Plus size={17} aria-hidden="true" />
          Nuova sessione
        </button>
      </div>
    </header>
  )
}

export default Header