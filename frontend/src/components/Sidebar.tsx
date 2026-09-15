import { useState } from 'react'
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

function Sidebar() {
  const [isOpen, setIsOpen] = useState(true)

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
          <a className="nav-item active" href="#dashboard">
            <LayoutDashboard className="nav-icon" aria-hidden="true" />
            <span className="nav-text">Dashboard</span>
          </a>
          <a className="nav-item" href="#planner">
            <CalendarDays className="nav-icon" aria-hidden="true" />
            <span className="nav-text">Planner</span>
          </a>
          <a className="nav-item" href="#timer">
            <Timer className="nav-icon" aria-hidden="true" />
            <span className="nav-text">Timer</span>
          </a>
          <p className="nav-label">Library</p>
          <a className="nav-item" href="#subjects">
            <BookOpen className="nav-icon" aria-hidden="true" />
            <span className="nav-text">Subjects</span>
          </a>
          <a className="nav-item" href="#exams">
            <GraduationCap className="nav-icon" aria-hidden="true" />
            <span className="nav-text">Exams</span>
          </a>
          <a className="nav-item" href="#statistics">
            <BarChart3 className="nav-icon" aria-hidden="true" />
            <span className="nav-text">Statistics</span>
          </a>
          <a className="nav-item" href="#goals">
            <Target className="nav-icon" aria-hidden="true" />
            <span className="nav-text">Goals</span>
          </a>
          <a className="nav-item" href="#history">
            <History className="nav-icon" aria-hidden="true" />
            <span className="nav-text">History</span>
          </a>
        </nav>
      </div>
    </aside>
  )
}

export default Sidebar