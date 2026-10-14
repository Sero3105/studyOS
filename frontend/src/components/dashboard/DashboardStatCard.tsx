import type { ReactNode } from 'react'

interface DashboardStatCardProps {
  icon: ReactNode
  label: string
  value: string
}

function DashboardStatCard({ icon, label, value }: DashboardStatCardProps) {
  return (
    <article className="stat-card">
      <div className="stat-card-top">
        <span className="stat-icon" aria-hidden="true">{icon}</span>
      </div>
      <p>{label}</p>
      <strong className="stat-value">{value}</strong>
    </article>
  )
}

export default DashboardStatCard
