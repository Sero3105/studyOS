import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useLanguage } from '../i18n/useLanguage'

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
  const { t } = useLanguage()
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
          <p className="auth-statement">{t('auth.statement')}</p>
          <ul className="auth-points">
            <li>{t('auth.pointSubjects')}</li>
            <li>{t('auth.pointExams')}</li>
            <li>{t('auth.pointTimer')}</li>
            <li>{t('auth.pointStats')}</li>
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
