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
import { useLanguage } from '../i18n/useLanguage'
import type { Translate } from '../i18n/translations'

function greeting(t: Translate): string {
  const hour = new Date().getHours()
  if (hour < 12) return t('dashboard.greetingMorning')
  if (hour < 18) return t('dashboard.greetingAfternoon')
  return t('dashboard.greetingEvening')
}

/**
 * Dashboard: risponde a tre domande, in quest'ordine di lettura.
 * 1. Come sto andando oggi? (blocco grande a sinistra, con l'azione primaria)
 * 2. Cosa richiede attenzione? (esami e task in scadenza, colonna destra)
 * 3. Che ritmo ho tenuto? (ultimi sette giorni, sotto)
 */
function DashboardPage() {
  const { t, locale } = useLanguage()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false)
  const [stats, setStats] = useState<StatsSummary | null>(null)
  const [error, setError] = useState('')
  const firstName = (user?.full_name?.split(' ')[0] || user?.username) ?? t('nav.studentFallback')

  const load = () => {
    setError('')
    getStatsSummary()
      .then(setStats)
      .catch((e) => setError(errorMessage(e, t('dashboard.loadError'))))
  }

  useEffect(() => { queueMicrotask(load) }, [])

  const today = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())

  return (
    <div className="page">
      <PageHeader title={`${greeting(t)}, ${firstName}`} description={today.charAt(0).toUpperCase() + today.slice(1)} />

      {error && <ErrorNotice message={error} onRetry={load} />}

      {!stats && !error && (
        <div className="dashboard-grid" aria-busy="true">
          <span className="visually-hidden">{t('dashboard.loading')}</span>
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
                <h2 id="dash-week-title" className="panel-title">{t('dashboard.last7Days')}</h2>
                <span className="panel-meta num">
                  {t('dashboard.total', { value: formatMinutes(stats.daily.reduce((sum, day) => sum + day.minutes, 0)) })}
                </span>
              </div>
              <WeekChart daily={stats.daily} />
              <Link className="text-link panel-foot-link" to="/statistics">
                {t('dashboard.allStatistics')} <ArrowRight aria-hidden="true" />
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
