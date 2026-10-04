import HeaderNote from './HeaderNote'

/**
 * Props del componente Header.
 *
 * `userName` viene passato dalla pagina Dashboard e viene mostrato nel saluto
 * iniziale. Questo pattern permette di costruire componenti riutilizzabili e
 * testabili: non dipendono da dati globali, ma ricevono tutto tramite props.
 */
interface HeaderProps {
  userName: string
}

/**
 * Header della pagina.
 *
 * È un componente presentazionale: riceve dati, li mostra e non gestisce
 * business logic. In un'app più grande potrebbe includere dati di calendario,
 * statistiche, o accessi rapidi.
 */
function Header({ userName }: HeaderProps) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">Today&apos;s focus</p>
        <h1>Welcome back, {userName}</h1>
      </div>
      <HeaderNote>Focus. Learn. Improve.</HeaderNote>
    </header>
  )
}

export default Header