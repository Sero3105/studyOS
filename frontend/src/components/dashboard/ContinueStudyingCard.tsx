import { BookOpen, Play } from 'lucide-react'
import DashboardCardHeading from './DashboardCardHeading'

function ContinueStudyingCard() {
  return (
    <article className="dashboard-card continue-card">
      <DashboardCardHeading
        icon={<BookOpen />}
        eyebrow="Riprendi"
        title="Continua a studiare"
      />
      <div className="empty-card-state">
        <span className="empty-state-icon">
          <BookOpen aria-hidden="true" />
        </span>
        <h3>Nessuna sessione recente</h3>
        <p>
          Quando sarà disponibile una sessione, qui potrai riprendere
          rapidamente dal punto in cui ti sei fermato.
        </p>
      </div>
      {/* TODO: Collegare al servizio delle sessioni di studio quando sarà
          disponibile per mostrare materia, ultima sessione e progresso. */}
      <button className="secondary-action" type="button" disabled>
        <Play size={16} aria-hidden="true" />
        Riprendi studio
      </button>
    </article>
  )
}

export default ContinueStudyingCard
