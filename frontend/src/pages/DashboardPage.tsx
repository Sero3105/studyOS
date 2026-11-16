import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarCheck } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import MoreLink from '../components/ui/MoreLink'
import { Button } from '../components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Skeleton } from '../components/ui/skeleton'
import WeekChart from '../components/ui/WeekChart'
import { ErrorNotice } from '../components/ui/Feedback'
import SessionSetupModal from '../components/timer/SessionSetupModal'
import type { StudySessionConfig } from '../components/timer/types'
import TodayOverview from '../components/dashboard/TodayOverview'
import UpcomingExams from '../components/dashboard/UpcomingExams'
import OpenTasks from '../components/dashboard/OpenTasks'
import WeeklyReview from '../components/dashboard/WeeklyReview'
import { getStatsSummary } from '../services/statsService'
import TodayPlan from '../components/dashboard/TodayPlan'
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
  const [reviewOpen, setReviewOpen] = useState(false)
  const [stats, setStats] = useState<StatsSummary | null>(null)
  const [error, setError] = useState('')
  const firstName = (user?.full_name?.split(' ')[0] || user?.username) ?? t('nav.studentFallback')

  const load = useCallback(() => {
    setError('')
    getStatsSummary()
      .then(setStats)
      .catch((e) => setError(errorMessage(e, t('dashboard.loadError'))))
  }, [t])

  useEffect(() => { queueMicrotask(load) }, [load])

  const today = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={today}
        title={`${greeting(t)}, ${firstName}`}
        actions={
          <Button variant="outline" onClick={() => setReviewOpen(true)}>
            <CalendarCheck data-icon="inline-start" aria-hidden="true" /> {t('review.title')}
          </Button>
        }
      />

      {error && <ErrorNotice message={error} onRetry={load} />}

      {!stats && !error && (
        <div className="grid gap-4 lg:grid-cols-3" aria-busy="true">
          <span className="sr-only">{t('dashboard.loading')}</span>
          <Skeleton className="h-64 lg:col-span-2" aria-hidden="true" />
          <Skeleton className="h-64" aria-hidden="true" />
        </div>
      )}

      {stats && (
        <div className="grid items-start gap-4 lg:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
            <TodayOverview stats={stats} onStartSession={() => setIsSessionModalOpen(true)} />
            <TodayPlan />

            <Card>
              <CardHeader>
                <CardTitle><h2 id="dash-week-title">{t('dashboard.last7Days')}</h2></CardTitle>
                <CardDescription className="font-mono tabular-nums">
                  {t('dashboard.total', { value: formatMinutes(stats.daily.reduce((sum, day) => sum + day.minutes, 0)) })}
                </CardDescription>
                <CardAction><MoreLink to="/statistics">{t('dashboard.allStatistics')}</MoreLink></CardAction>
              </CardHeader>
              <CardContent>
                <WeekChart daily={stats.daily} />
              </CardContent>
            </Card>
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <UpcomingExams exams={stats.upcoming_exams} />
            <OpenTasks tasks={stats.upcoming_tasks} />
          </div>
        </div>
      )}

      {reviewOpen && <WeeklyReview onClose={() => { setReviewOpen(false); load() }} />}

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
