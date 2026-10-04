import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarDays,
  Timer,
  BookOpen,
  GraduationCap,
  BarChart3,
  Target,
  History,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'

/**
 * Sidebar di navigazione principale dell'applicazione.
 *
 * Questa componente gestisce due concetti importanti:
 * - la navigazione tra le pagine principali,
 * - lo stato di apertura/chiusura della sidebar (collapsed / expanded).
 *
 * `NavLink` è il componente giusto per collegamenti interni nel router: permette
 * di applicare automaticamente classi CSS quando il link è attivo.
 *
 * Vengono usati anche alcuni iconi di `lucide-react` per rendere la navigazione
 * più chiara dal punto di vista visivo.
 */
function Sidebar() {
  const [isOpen, setIsOpen] = useState(true)

  const getNavLinkClassName = ({ isActive }: { isActive: boolean }) =>
    `nav-item${isActive ? ' active' : ''}`

  const toggleSidebar = () => {
    setIsOpen(!isOpen)
  }

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'collapsed'}`}>
      <button
        className="sidebar-toggle"
        onClick={toggleSidebar}
        aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {isOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
      </button>

      <div className="sidebar-content">
        <div className="brand-mark" aria-label="StudyOS">
          <span className="brand-icon" aria-hidden="true">S</span>
          <h2>StudyOS</h2>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <p className="nav-label">Workspace</p>
          <NavLink to="/" end className={getNavLinkClassName}>
            <LayoutDashboard className="nav-icon" aria-hidden="true" />
            <span className="nav-text">Dashboard</span>
          </NavLink>
          <NavLink to="/planner" className={getNavLinkClassName}>
            <CalendarDays className="nav-icon" aria-hidden="true" />
            <span className="nav-text">Planner</span>
          </NavLink>
          <NavLink to="/timer" className={getNavLinkClassName}>
            <Timer className="nav-icon" aria-hidden="true" />
            <span className="nav-text">Timer</span>
          </NavLink>
          <p className="nav-label">Library</p>
          <NavLink to="/subjects" className={getNavLinkClassName}>
            <BookOpen className="nav-icon" aria-hidden="true" />
            <span className="nav-text">Subjects</span>
          </NavLink>
          <NavLink to="/exams" className={getNavLinkClassName}>
            <GraduationCap className="nav-icon" aria-hidden="true" />
            <span className="nav-text">Exams</span>
          </NavLink>
          <NavLink to="/statistics" className={getNavLinkClassName}>
            <BarChart3 className="nav-icon" aria-hidden="true" />
            <span className="nav-text">Statistics</span>
          </NavLink>
          <NavLink to="/goals" className={getNavLinkClassName}>
            <Target className="nav-icon" aria-hidden="true" />
            <span className="nav-text">Goals</span>
          </NavLink>
          <NavLink to="/history" className={getNavLinkClassName}>
            <History className="nav-icon" aria-hidden="true" />
            <span className="nav-text">History</span>
          </NavLink>
        </nav>
      </div>
    </aside>
  )
}

export default Sidebar