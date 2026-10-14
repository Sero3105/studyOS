import { BookOpen, Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import DashboardCardHeading from './DashboardCardHeading'
import type { LastSession } from '../../services/statsService'

function ContinueStudyingCard({ lastSession }: { lastSession: LastSession | null }) {
  return (
    <article className="dashboard-card continue-card">
      <DashboardCardHeading icon={<BookOpen />} eyebrow="Riprendi" title="Continua a studiare" />
      {lastSession ? (
        <>
          <h3>{lastSession.subject ?? 'Sessione libera'}{lastSession.topic ? ` / ${lastSession.topic}` : ''}</h3>
          <p className="muted-note">Ultima sessione: {lastSession.studied_on} · {lastSession.duration_minutes} minuti.</p>
          <Link className="secondary-action" to="/timer"><Play size={16} aria-hidden="true" /> Riprendi studio</Link>
        </>
      ) : (
        <div className="empty-card-state">
          <span className="empty-state-icon"><BookOpen aria-hidden="true" /></span>
          <h3>Nessuna sessione recente</h3>
          <p>Completa una sessione dal Timer per vederla qui.</p>
        </div>
      )}
    </article>
  )
}

export default ContinueStudyingCard
