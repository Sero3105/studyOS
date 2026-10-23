import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Menu, Play, Search } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import CommandPalette from '../components/CommandPalette'
import { navItems } from '../components/navigation'
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
  const [paletteOpen, setPaletteOpen] = useState(false)
  const navigate = useNavigate()

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

  // Scorciatoie: ⌘K / Ctrl+K / "/" / "?" palette, "g" + lettera per le pagine, "n" nuovo task.
  useEffect(() => {
    let pendingG = 0
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); setPaletteOpen((open) => !open); return
      }
      const target = event.target as HTMLElement
      if (paletteOpen || event.metaKey || event.ctrlKey || event.altKey || target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return
      if (pendingG && Date.now() - pendingG < 1500) {
        pendingG = 0
        const item = navItems.find((entry) => entry.key === event.key.toLowerCase())
        if (item) { event.preventDefault(); navigate(item.to) }
        return
      }
      if (event.key === 'g') pendingG = Date.now()
      else if (event.key === '/' || event.key === '?') { event.preventDefault(); setPaletteOpen(true) }
      else if (event.key === 'n') { event.preventDefault(); navigate('/planner', { state: { focusNewTask: true } }) }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [navigate, paletteOpen])

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
          <button className="icon-btn topbar-search" type="button" onClick={() => setPaletteOpen(true)} aria-label={t('palette.title')}>
            <Search aria-hidden="true" />
          </button>
          <Link to="/timer" className="icon-btn topbar-cta" aria-label={t('nav.newSession')}>
            <Play aria-hidden="true" />
          </Link>
        </header>

        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onToggleCollapsed={() => setCollapsed((value) => !value)}
          onCloseMobile={() => setMobileOpen(false)}
          onOpenPalette={() => setPaletteOpen(true)}
        />
        {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
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
