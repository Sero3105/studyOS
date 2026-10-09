import {
  CheckCircle2,
  Clock3,
  Flame,
  Target,
} from 'lucide-react'
import DashboardStatCard from './DashboardStatCard'

const statCards = [
  { label: 'Tempo di studio', icon: <Clock3 /> },
  { label: 'Sessioni completate', icon: <CheckCircle2 /> },
  { label: 'Obiettivo giornaliero', icon: <Target /> },
  { label: 'Giorni consecutivi', icon: <Flame /> },
]

function DashboardStats() {
  return (
    <div className="stats-grid" aria-label="Statistiche giornaliere">
      {statCards.map((stat) => (
        <DashboardStatCard key={stat.label} {...stat} />
      ))}
    </div>
  )
}

export default DashboardStats
