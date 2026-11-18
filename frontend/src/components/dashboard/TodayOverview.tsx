import { Link } from 'react-router-dom'
import { Play } from 'lucide-react'
import ProgressBar from '../ui/ProgressBar'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import type { StatsSummary } from '../../services/statsService'
import { formatMinutes, relativeDay } from '../../utils/dates'
import { useLanguage } from '../../i18n/useLanguage'

interface TodayOverviewProps {
  stats: StatsSummary
  onStartSession: () => void
}

/**
 * Il primo blocco della dashboard: quanto ho studiato oggi, a che punto è
 * l'obiettivo della settimana e il pulsante per iniziare. Il numero di oggi è
 * l'elemento più grande della schermata; i dati di contorno stanno a lato.
 */
function TodayOverview({ stats, onStartSession }: TodayOverviewProps) {
  const { t, locale } = useLanguage()
  const weeklyGoal = stats.goals.find((goal) => goal.kind === 'weekly_minutes') ?? null
  const last = stats.last_session
  const hours = Math.floor(stats.today_minutes / 60)
  const minutes = stats.today_minutes % 60

  const figures = [
    { label: t('dashboard.thisWeek'), value: formatMinutes(stats.week_minutes) },
    { label: t('dashboard.streakDays'), value: String(stats.streak_days) },
    { label: t('dashboard.tasksToday'), value: <>{stats.today_tasks_done}<span className="text-muted-foreground">/{stats.today_tasks_total}</span></> },
  ]

  return (
    <Card className="relative" aria-labelledby="today-title">
      <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-primary/10 blur-3xl" />
      <CardContent className="relative grid gap-8 md:grid-cols-[1fr_auto]">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 id="today-title" className="font-mono text-xs tracking-wider text-muted-foreground uppercase">{t('dashboard.studiedToday')}</h2>
            <p className="font-mono text-6xl font-semibold tracking-tighter tabular-nums md:text-7xl">
              {hours > 0 && <>{hours}<span className="ml-1 text-2xl tracking-normal text-muted-foreground">h</span> </>}
              {hours > 0 ? String(minutes).padStart(2, '0') : minutes}
              <span className="ml-1.5 text-2xl tracking-normal text-muted-foreground">min</span>
            </p>
          </div>

          {weeklyGoal ? (
            <div className="flex max-w-md flex-col gap-2">
              <div className="flex items-baseline justify-between gap-4 text-sm">
                <span className="truncate">{weeklyGoal.title}</span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                  {t('dashboard.of', { current: formatMinutes(weeklyGoal.current), target: formatMinutes(weeklyGoal.target) })}
                </span>
              </div>
              <ProgressBar percent={weeklyGoal.percent} label={`${weeklyGoal.title}: ${weeklyGoal.percent}%`} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('dashboard.noWeeklyGoal')}{' '}
              <Link className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline" to="/goals">{t('dashboard.setOne')}</Link>
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Button size="lg" onClick={onStartSession} className="sm:w-auto">
              <Play data-icon="inline-start" aria-hidden="true" />
              {stats.sessions_count === 0 ? t('dashboard.startFirstSession') : t('dashboard.startSession')}
            </Button>
            {last && (
              <p className="text-xs text-muted-foreground">
                {t('dashboard.lastSession', { subject: last.subject ?? t('dashboard.freeSession') })}
                {last.topic ? ` / ${last.topic}` : ''} · {formatMinutes(last.duration_minutes)} ·{' '}
                {relativeDay(last.studied_on, locale).toLowerCase()}
              </p>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border bg-border md:w-44 md:grid-cols-1">
          {figures.map((figure) => (
            <div key={figure.label} className="flex flex-col gap-1 bg-card p-3 md:p-4">
              <dt className="text-xs text-muted-foreground">{figure.label}</dt>
              <dd className="font-mono text-lg font-semibold tabular-nums md:text-xl">{figure.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}

export default TodayOverview
