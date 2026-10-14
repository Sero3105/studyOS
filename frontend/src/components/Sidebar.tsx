import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  BookOpen,
  CalendarCheck,
  GraduationCap,
  History,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Target,
  Timer,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '../context/useAuth'

interface NavEntry {
  to: string
  label: string
  icon: LucideIcon
}

/**
 * Voci di navigazione raggruppate per scopo: cosa fare oggi, cosa si sta
 * studiando, come sta andando. I gruppi senza titolo restano in cima.
 */
const navGroups: { title?: string; items: NavEntry[] }[] = [
  {
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/timer', label: 'Timer', icon: Timer },
      { to: '/planner', label: 'Planner', icon: CalendarCheck },
    ],
  },
  {
    title: 'Studio',
    items: [
      { to: '/subjects', label: 'Materie', icon: BookOpen },
      { to: '/exams', label: 'Esami', icon: GraduationCap },
      { to: '/goals', label: 'Obiettivi', icon: Target },
    ],
  },
  {
    title: 'Analisi',
    items: [
      { to: '/statistics', label: 'Statistiche', icon: BarChart3 },
      { to: '/history', label: 'Storico', icon: History },
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
  const navigate = useNavigate()
  const displayName = user?.full_name || user?.username || 'Studente'
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
      aria-label="Navigazione principale"
    >
      <div className="sidebar-top">
        <NavLink to="/dashboard" className="brand" aria-label="StudyOS, vai alla dashboard">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">StudyOS</span>
        </NavLink>
        <button
          className="icon-btn sidebar-collapse"
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Espandi la sidebar' : 'Riduci la sidebar'}
          aria-expanded={!collapsed}
          aria-controls="app-sidebar"
        >
          {collapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
        </button>
        <button className="icon-btn sidebar-close" type="button" onClick={onCloseMobile} aria-label="Chiudi il menu">
          <X aria-hidden="true" />
        </button>
      </div>

      <Link to="/timer" className="btn btn-primary sidebar-cta" data-label="Nuova sessione">
        <Play aria-hidden="true" />
        <span className="nav-text">Nuova sessione</span>
      </Link>

      <nav className="sidebar-nav">
        {navGroups.map((group, index) => (
          <div className="nav-group" key={group.title ?? index}>
            {group.title && <p className="nav-group-title">{group.title}</p>}
            <ul>
              {group.items.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink to={to} className={linkClass} data-label={label}>
                    <Icon className="nav-icon" aria-hidden="true" />
                    <span className="nav-text">{label}</span>
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
        <button className="icon-btn account-logout" type="button" onClick={() => void handleLogout()} aria-label="Esci" title="Esci">
          <LogOut aria-hidden="true" />
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
