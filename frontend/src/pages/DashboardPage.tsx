import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import WeekChart from '../components/ui/WeekChart'
import { ErrorNotice } from '../components/ui/Feedback'
import SessionSetupModal from '../components/timer/SessionSetupModal'
import type { StudySessionConfig } from '../components/timer/types'
import TodayOverview from '../components/dashboard/TodayOverview'
import UpcomingExams from '../components/dashboard/UpcomingExams'
import OpenTasks from '../components/dashboard/OpenTasks'
import { getStatsSummary } from '../services/statsService'
import type { StatsSummary } from '../services/statsService'
import { useAuth } from '../context/useAuth'
import { formatMinutes } from '../utils/dates'
import { errorMessage } from '../utils/errors'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buongiorno'
  if (hour < 18) return 'Buon pomeriggio'
  return 'Buonasera'
}

/**
 * Dashboard: risponde a tre domande, in quest'ordine di lettura.
 * 1. Come sto andando oggi? (blocco grande a sinistra, con l'azione primaria)
 * 2. Cosa richiede attenzione? (esami e task in scadenza, colonna destra)
 * 3. Che ritmo ho tenuto? (ultimi sette giorni, sotto)
 */
function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false)
  const [stats, setStats] = useState<StatsSummary | null>(null)
  const [error, setError] = useState('')
  const firstName = (user?.full_name?.split(' ')[0] || user?.username) ?? 'Studente'

  const load = () => {
    setError('')
    getStatsSummary()
      .then(setStats)
      .catch((e) => setError(errorMessage(e, 'Impossibile caricare la dashboard')))
  }

  useEffect(() => { queueMicrotask(load) }, [])

  const today = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())

  return (
    <div className="page">
      <PageHeader title={`${greeting()}, ${firstName}`} description={today.charAt(0).toUpperCase() + today.slice(1)} />

      {error && <ErrorNotice message={error} onRetry={load} />}

      {!stats && !error && (
        <div className="dashboard-grid" aria-busy="true">
          <span className="visually-hidden">Caricamento della dashboard</span>
          <div className="skeleton dashboard-skeleton-main" aria-hidden="true" />
          <div className="skeleton dashboard-skeleton-side" aria-hidden="true" />
        </div>
      )}

      {stats && (
        <div className="dashboard-grid">
          <div className="dashboard-main">
            <TodayOverview stats={stats} onStartSession={() => setIsSessionModalOpen(true)} />

            <section className="panel" aria-labelledby="dash-week-title">
              <div className="panel-head">
                <h2 id="dash-week-title" className="panel-title">Ultimi 7 giorni</h2>
                <span className="panel-meta num">
                  Totale {formatMinutes(stats.daily.reduce((sum, day) => sum + day.minutes, 0))}
                </span>
              </div>
              <WeekChart daily={stats.daily} />
              <Link className="text-link panel-foot-link" to="/statistics">
                Tutte le statistiche <ArrowRight aria-hidden="true" />
              </Link>
            </section>
          </div>

          <div className="dashboard-side">
            <UpcomingExams exams={stats.upcoming_exams} />
            <OpenTasks tasks={stats.upcoming_tasks} />
          </div>
        </div>
      )}

      {isSessionModalOpen && (
        <SessionSetupModal
          onClose={() => setIsSessionModalOpen(false)}
          onSubmit={(config: StudySessionConfig) => navigate('/timer', { state: config })}
        />
      )}
    </div>
  )
}

export default DashboardPage
