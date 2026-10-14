import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import SessionSetupModal from '../components/timer/SessionSetupModal'
import type { StudySessionConfig } from '../components/timer/types'
import DashboardSectionHeading from '../components/dashboard/DashboardSectionHeading'
import DashboardStats from '../components/dashboard/DashboardStats'
import ContinueStudyingCard from '../components/dashboard/ContinueStudyingCard'
import DailyGoalCard from '../components/dashboard/DailyGoalCard'
import UpcomingTasksCard from '../components/dashboard/UpcomingTasksCard'
import StudyActivityCard from '../components/dashboard/StudyActivityCard'
import { getStatsSummary } from '../services/statsService'
import type { StatsSummary } from '../services/statsService'
import { useAuth } from '../context/useAuth'

function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false)
  const [stats, setStats] = useState<StatsSummary | null>(null)
  const [error, setError] = useState('')
  const userName = user?.username || user?.full_name || 'Studente'

  useEffect(() => {
    getStatsSummary()
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : 'Impossibile caricare la dashboard'))
  }, [])

  const handleSessionSubmit = (config: StudySessionConfig) => {
    navigate('/timer', { state: config })
  }

  const weeklyGoal = stats?.goals.find((g) => g.kind === 'weekly_minutes') ?? null

  return (
    <>
      <Header userName={userName} onNewSession={() => setIsSessionModalOpen(true)} />

      <section className="dashboard-page">
        <DashboardSectionHeading />
        {error && <div className="dashboard-card" role="alert"><p>{error}</p></div>}
        <DashboardStats stats={stats} />

        <div className="dashboard-grid dashboard-grid-primary">
          <ContinueStudyingCard lastSession={stats?.last_session ?? null} />
          <DailyGoalCard todayMinutes={stats?.today_minutes ?? 0} goal={weeklyGoal} />
        </div>

        <div className="dashboard-grid dashboard-grid-secondary">
          <UpcomingTasksCard tasks={stats?.upcoming_tasks ?? []} />
          <StudyActivityCard daily={stats?.daily ?? []} />
        </div>
      </section>
      {isSessionModalOpen && (
        <SessionSetupModal
          onClose={() => setIsSessionModalOpen(false)}
          onSubmit={handleSessionSubmit}
        />
      )}
    </>
  )
}

export default DashboardPage
