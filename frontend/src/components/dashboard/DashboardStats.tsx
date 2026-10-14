import { CheckCircle2, Clock3, Flame, Target } from 'lucide-react'
import DashboardStatCard from './DashboardStatCard'
import type { StatsSummary } from '../../services/statsService'

function DashboardStats({ stats }: { stats: StatsSummary | null }) {
  const cards = [
    { label: 'Tempo di studio (oggi)', icon: <Clock3 />, value: stats ? `${stats.today_minutes} min` : '…' },
    { label: 'Sessioni completate', icon: <CheckCircle2 />, value: stats ? String(stats.sessions_count) : '…' },
    { label: 'Task completati', icon: <Target />, value: stats ? `${stats.tasks_done}/${stats.tasks_total}` : '…' },
    { label: 'Giorni consecutivi', icon: <Flame />, value: stats ? String(stats.streak_days) : '…' },
  ]
  return (
    <div className="stats-grid" aria-label="Statistiche giornaliere">
      {cards.map((stat) => (
        <DashboardStatCard key={stat.label} icon={stat.icon} label={stat.label} value={stat.value} />
      ))}
    </div>
  )
}

export default DashboardStats
