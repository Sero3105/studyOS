import { Target } from 'lucide-react'
import DashboardCardHeading from './DashboardCardHeading'

function DailyGoalCard() {
  return (
    <article className="dashboard-card goal-card">
      <DashboardCardHeading
        icon={<Target />}
        eyebrow="Obiettivo"
        title="Obiettivo giornaliero"
      />
      <div className="goal-empty">
        <div
          className="progress-track"
          role="progressbar"
          aria-label="Avanzamento obiettivo giornaliero non disponibile"
        >
          <span />
        </div>
        <div className="goal-values">
          <span>
            Tempo studiato <strong>Non disponibile</strong>
          </span>
          <span>
            Obiettivo <strong>Da configurare</strong>
          </span>
        </div>
        <p className="muted-note">
          Il tempo rimanente apparirà qui quando l&apos;obiettivo sarà
          configurato.
        </p>
      </div>
      {/* TODO: Collegare il progresso al servizio delle sessioni e
          all'obiettivo dell'utente, senza usare valori predefiniti. */}
    </article>
  )
}

export default DailyGoalCard
