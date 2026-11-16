import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import Sidebar, { SearchButton } from '../components/Sidebar'
import CommandPalette from '../components/CommandPalette'
import MobileTabBar from '../components/MobileTabBar'
import TimerPill from '../components/TimerPill'
import BrandMark from '../components/BrandMark'
import { navItems } from '../components/navigation'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '../components/ui/sidebar'
import { TimerProvider } from '../context/TimerProvider'
import { useLanguage } from '../i18n/useLanguage'
import { runDeadlineReminders } from '../utils/reminders'
import { syncPreferences } from '../utils/preferences'
import UndoProvider from '../components/UndoProvider'

const COLLAPSE_KEY = 'studyos.sidebar.collapsed'

function readCollapsed(): boolean {
  try { return localStorage.getItem(COLLAPSE_KEY) === '1' } catch { return false }
}

/**
 * Layout delle pagine protette:
 * - sidebar shadcn (icone su desktop ridotto, pannello su mobile),
 * - barra in alto con il timer in corso e la ricerca, sempre raggiungibili,
 * - tab bar in basso su mobile per le pagine di ogni giorno.
 *
 * `TimerProvider` vive qui: il layout resta montato tra le route, quindi il
 * timer continua mentre si naviga.
 */
function AppLayout() {
  const { t, locale } = useLanguage()
  const location = useLocation()
  const [open, setOpen] = useState(() => !readCollapsed())
  const [paletteOpen, setPaletteOpen] = useState(false)
  const navigate = useNavigate()

  const changeOpen = (next: boolean) => {
    setOpen(next)
    try { localStorage.setItem(COLLAPSE_KEY, next ? '0' : '1') } catch { /* storage bloccato: vale per la sessione */ }
  }

  // Ogni pagina parte dall'alto.
  useEffect(() => { window.scrollTo(0, 0) }, [location.pathname])

  // Preferenze dal server (valgono su ogni browser); offline resta la cache locale.
  useEffect(() => { void syncPreferences().catch(() => {}) }, [])

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
        event.preventDefault(); setPaletteOpen((value) => !value); return
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

  return (
    <TimerProvider>
    <UndoProvider>
      <SidebarProvider open={open} onOpenChange={changeOpen}>
        <a
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
          href="#main-content"
        >
          {t('app.skipToContent')}
        </a>
        <Sidebar />
        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />

        <SidebarInset className="min-w-0">
          <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur-lg md:px-6">
            <SidebarTrigger className="-ml-1 hidden md:inline-flex" aria-label={open ? t('nav.collapseSidebar') : t('nav.expandSidebar')} />
            <span className="mr-1 hidden h-4 w-px bg-border md:block" aria-hidden="true" />
            <Link to="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight md:hidden" aria-label={t('nav.goToDashboard')}>
              <BrandMark className="size-7" />
              StudyOS
            </Link>
            <div className="ml-auto flex items-center gap-2">
              <TimerPill />
              <SearchButton onClick={() => setPaletteOpen(true)} />
            </div>
          </header>

          <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
            <div className="mx-auto w-full max-w-6xl px-4 pt-6 pb-28 md:px-8 md:pt-10 md:pb-16">
              <Outlet />
            </div>
          </main>
        </SidebarInset>
        <MobileTabBar />
      </SidebarProvider>
    </UndoProvider>
    </TimerProvider>
  )
}

export default AppLayout
