import type { ReactNode } from 'react'

interface DashboardCardHeadingProps {
  icon: ReactNode
  eyebrow: string
  title: string
}

function DashboardCardHeading({
  icon,
  eyebrow,
  title,
}: DashboardCardHeadingProps) {
  return (
    <div className="card-heading">
      <span className="card-heading-icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <p className="section-kicker">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
    </div>
  )
}

export default DashboardCardHeading
