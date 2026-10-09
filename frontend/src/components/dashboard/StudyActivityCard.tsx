import { BarChart3 } from 'lucide-react'
import DashboardCardHeading from './DashboardCardHeading'

function StudyActivityCard() {
  return (
    <article className="dashboard-card activity-card">
      <DashboardCardHeading
        icon={<BarChart3 />}
        eyebrow="Attività recente"
        title="Study activity"
      />
      <div className="activity-empty">
        <BarChart3 size={34} strokeWidth={1.5} aria-hidden="true" />
        <h3>Ancora nessuna attività</h3>
        <p>Il riepilogo degli ultimi sette giorni apparirà qui.</p>
      </div>
      {/* TODO: Alimentare il grafico con i dati aggregati delle sessioni
          degli ultimi sette giorni forniti dal servizio di statistiche. */}
    </article>
  )
}

export default StudyActivityCard
