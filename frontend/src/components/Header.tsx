import { Plus } from 'lucide-react'

interface HeaderProps {
  userName: string
  onNewSession: () => void
}

/**
 * Unico header della Dashboard: saluto, data di oggi e azione primaria.
 * Una sola intestazione per schermata: niente doppi titoli in competizione.
 */
function Header({ userName, onNewSession }: HeaderProps) {
  const today = new Intl.DateTimeFormat('it-IT', { dateStyle: 'full' }).format(new Date())
  return (
    <header className="page-header">
      <div className="page-header-copy">
        <p className="eyebrow">Overview · {today}</p>
        <h1>Welcome back, {userName}</h1>
        <p className="page-header-intro">
          Organizza il tuo tempo, ritrova il ritmo e continua a fare progressi.
        </p>
      </div>
      <div className="page-header-actions">
        <button className="primary-action" type="button" onClick={onNewSession}>
          <Plus size={17} aria-hidden="true" />
          Nuova sessione
        </button>
      </div>
    </header>
  )
}

export default Header
