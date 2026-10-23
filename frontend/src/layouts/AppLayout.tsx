import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Menu, Play } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import { TimerProvider } from '../context/TimerProvider'
import { useLanguage } from '../i18n/useLanguage'
import { runDeadlineReminders } from '../utils/reminders'

const COLLAPSE_KEY = 'studyos.sidebar.collapsed'

/**
 * Layout principale dell'applicazione.
 *
 * Definisce la struttura comune a tutte le pagine protette:
 * - la sidebar di navigazione (colonna fissa su desktop, pannello su mobile),
 * - una barra superiore visibile solo su schermi stretti,
 * - l'area centrale, con larghezza massima e margini uguali per ogni route,
 *   dove `Outlet` renderizza la pagina corrente.
 *
 * Qui vive anche `TimerProvider`: il layout resta montato tra una route e
 * l'altra, quindi il timer continua a girare mentre si naviga.
 *
 * Lo stato "ridotta" della sidebar viene ricordato tra una visita e l'altra;
 * il pannello mobile si chiude a ogni cambio di pagina e con Escape.
 */
function AppLayout() {
  const { t, locale } = useLanguage()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [lastPath, setLastPath] = useState(location.pathname)

  if (lastPath !== location.pathname) {
    setLastPath(location.pathname)
    setMobileOpen(false)
  }

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
  }, [collapsed])

  // Controllo all'apertura e ogni ora: la notifica parte al massimo una volta al giorno.
  useEffect(() => {
    const check = () => { void runDeadlineReminders(t, locale).catch(() => {}) }
    check()
    const id = window.setInterval(check, 3600000)
    return () => window.clearInterval(id)
  }, [t, locale])

  useEffect(() => {
    if (!mobileOpen) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [mobileOpen])

  return (
    <TimerProvider>
      <div className={`app-shell${collapsed ? ' is-collapsed' : ''}`}>
        <a className="skip-link" href="#main-content">{t('app.skipToContent')}</a>

        <header className="topbar">
          <button
            className="icon-btn"
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label={t('nav.openMenu')}
            aria-expanded={mobileOpen}
            aria-controls="app-sidebar"
          >
            <Menu aria-hidden="true" />
          </button>
          <Link to="/dashboard" className="brand">
            <span className="brand-mark" aria-hidden="true" />
            <span className="brand-name">StudyOS</span>
          </Link>
          <Link to="/timer" className="icon-btn topbar-cta" aria-label={t('nav.newSession')}>
            <Play aria-hidden="true" />
          </Link>
        </header>

        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onToggleCollapsed={() => setCollapsed((value) => !value)}
          onCloseMobile={() => setMobileOpen(false)}
        />
        {mobileOpen && <div className="drawer-backdrop" onClick={() => setMobileOpen(false)} aria-hidden="true" />}

        <main id="main-content" className="content" tabIndex={-1}>
          <div className="content-inner">
            <Outlet />
          </div>
        </main>
      </div>
    </TimerProvider>
  )
}

export default AppLayout
