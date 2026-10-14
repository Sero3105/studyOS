import { useEffect } from 'react'
import type { ReactNode } from 'react'

interface AuthLayoutProps {
  title: string
  description: string
  children: ReactNode
}

/**
 * Struttura comune di accesso e registrazione.
 *
 * Su schermi larghi: a sinistra il marchio e una descrizione onesta di cosa
 * fa StudyOS, a destra il modulo. Su mobile resta solo il modulo, con il
 * marchio in alto.
 */
function AuthLayout({ title, description, children }: AuthLayoutProps) {
  useEffect(() => {
    document.title = `${title} · StudyOS`
  }, [title])

  return (
    <main className="auth-page">
      <section className="auth-intro" aria-label="StudyOS">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">StudyOS</span>
        </div>
        <div className="auth-intro-copy">
          <p className="auth-statement">Il tuo studio, in ordine.</p>
          <ul className="auth-points">
            <li>Materie e argomenti, con il progresso di ciascuno.</li>
            <li>Esami e task con le loro scadenze.</li>
            <li>Un timer che salva ogni blocco di studio.</li>
            <li>Statistiche e obiettivi calcolati dai tuoi dati.</li>
          </ul>
        </div>
      </section>

      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-panel-inner">
          <div className="brand auth-mobile-brand">
            <span className="brand-mark" aria-hidden="true" />
            <span className="brand-name">StudyOS</span>
          </div>
          <header className="auth-heading">
            <h1 id="auth-title">{title}</h1>
            <p>{description}</p>
          </header>
          {children}
        </div>
      </section>
    </main>
  )
}

export default AuthLayout
