import type { ReactNode } from 'react'

interface DashboardStatCardProps {
  icon: ReactNode
  label: string
}

function DashboardStatCard({ icon, label }: DashboardStatCardProps) {
  return (
    <article className="stat-card">
      <div className="stat-card-top">
        <span className="stat-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="stat-status">In attesa</span>
      </div>
      <p>{label}</p>
      <strong className="stat-value" aria-label={`${label}: non disponibile`}>
        N/D
      </strong>
      {/* TODO: Sostituire N/D con il valore reale restituito dal servizio
          corrispondente, mantenendo lo stato vuoto finché non è disponibile. */}
    </article>
  )
}

export default DashboardStatCard
