import { useState } from 'react'
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
import { useAuth } from '../context/useAuth'

function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false)
  const userName = user?.username || user?.full_name || 'Studente'

  const handleSessionSubmit = (config: StudySessionConfig) => {
    // TODO: Persistire materia, argomento e note tramite il servizio sessioni
    // quando il backend e il modello dati saranno disponibili.
    navigate('/timer', { state: config })
  }

  return (
    <>
      <Header userName={userName} onNewSession={() => setIsSessionModalOpen(true)} />

      <section className="dashboard-page">
        <DashboardSectionHeading />
        <DashboardStats />

        <div className="dashboard-grid dashboard-grid-primary">
          <ContinueStudyingCard />
          <DailyGoalCard />
        </div>

        <div className="dashboard-grid dashboard-grid-secondary">
          <UpcomingTasksCard />
          <StudyActivityCard />
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
