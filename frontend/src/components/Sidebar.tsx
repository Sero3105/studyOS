import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  GraduationCap,
  History,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Settings,
  Target,
  Timer,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { useTimer } from '../context/useTimer'
import { useLanguage } from '../i18n/useLanguage'
import type { TranslationKey } from '../i18n/translations'

interface NavEntry {
  to: string
  labelKey: TranslationKey
  icon: LucideIcon
}

const navGroups: { titleKey?: TranslationKey; items: NavEntry[] }[] = [
  {
    items: [
      { to: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
      { to: '/timer', labelKey: 'nav.timer', icon: Timer },
      { to: '/planner', labelKey: 'nav.planner', icon: CalendarCheck },
      { to: '/calendar', labelKey: 'nav.calendar', icon: CalendarDays },
    ],
  },
  {
    titleKey: 'nav.study',
    items: [
      { to: '/subjects', labelKey: 'nav.subjects', icon: BookOpen },
      { to: '/exams', labelKey: 'nav.exams', icon: GraduationCap },
      { to: '/goals', labelKey: 'nav.goals', icon: Target },
    ],
  },
  {
    titleKey: 'nav.analysis',
    items: [
      { to: '/statistics', labelKey: 'nav.statistics', icon: BarChart3 },
      { to: '/history', labelKey: 'nav.history', icon: History },
      { to: '/settings', labelKey: 'nav.settings', icon: Settings },
    ],
  },
]

interface SidebarProps {
  collapsed: boolean
  mobileOpen: boolean
  onToggleCollapsed: () => void
  onCloseMobile: () => void
}

/**
 * Sidebar di navigazione principale.
 *
 * Su desktop è una colonna fissa che può ridursi a una barra di sole icone
 * (le etichette restano nel DOM per gli screen reader e compaiono come
 * tooltip). Su schermi stretti diventa un pannello che scorre da sinistra,
 * aperto dalla barra superiore di `AppLayout`.
 *
 * In fondo ci sono l'account e l'uscita, così la sessione si chiude sempre
 * dallo stesso punto.
 */
function Sidebar({ collapsed, mobileOpen, onToggleCollapsed, onCloseMobile }: SidebarProps) {
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const timer = useTimer()
  const timerBadge =
    timer.config && (timer.isRunning || timer.hasStarted)
      ? `${Math.floor(timer.remainingSeconds / 60)}:${String(timer.remainingSeconds % 60).padStart(2, '0')}`
      : null
  const navigate = useNavigate()
  const displayName = user?.full_name || user?.username || t('nav.studentFallback')
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  const linkClass = ({ isActive }: { isActive: boolean }) => `nav-item${isActive ? ' active' : ''}`

  return (
    <aside
      id="app-sidebar"
      className={`sidebar${collapsed ? ' is-collapsed' : ''}${mobileOpen ? ' is-open' : ''}`}
      aria-label={t('nav.main')}
    >
      <div className="sidebar-top">
        <NavLink to="/dashboard" className="brand" aria-label={t('nav.goToDashboard')}>
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">StudyOS</span>
        </NavLink>
        <button
          className="icon-btn sidebar-collapse"
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
          aria-expanded={!collapsed}
          aria-controls="app-sidebar"
        >
          {collapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
        </button>
        <button className="icon-btn sidebar-close" type="button" onClick={onCloseMobile} aria-label={t('nav.closeMenu')}>
          <X aria-hidden="true" />
        </button>
      </div>

      <Link to="/timer" className="btn btn-primary sidebar-cta" data-label={t('nav.newSession')}>
        <Play aria-hidden="true" />
        <span className="nav-text">{t('nav.newSession')}</span>
      </Link>

      <nav className="sidebar-nav">
        {navGroups.map((group, index) => (
          <div className="nav-group" key={group.titleKey ?? index}>
            {group.titleKey && <p className="nav-group-title">{t(group.titleKey)}</p>}
            <ul>
              {group.items.map(({ to, labelKey, icon: Icon }) => (
                <li key={to}>
                  <NavLink to={to} className={linkClass} data-label={t(labelKey)}>
                    <Icon className="nav-icon" aria-hidden="true" />
                    <span className="nav-text">{t(labelKey)}</span>
                    {to === '/timer' && timerBadge && (
                      <span className={`nav-text nav-timer num${timer.mode === 'Break' ? ' is-break' : ''}`}>
                        <span className="visually-hidden">, {timer.isRunning ? t('nav.timerRunning') : t('nav.timerPaused')}: </span>
                        {timerBadge}
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="sidebar-account">
        <span className="account-avatar" aria-hidden="true">{initials}</span>
        <div className="account-copy">
          <span className="account-name">{displayName}</span>
          {user?.email && <span className="account-email">{user.email}</span>}
        </div>
        <button className="icon-btn account-logout" type="button" onClick={() => void handleLogout()} aria-label={t('nav.logout')} title={t('nav.logout')}>
          <LogOut aria-hidden="true" />
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
