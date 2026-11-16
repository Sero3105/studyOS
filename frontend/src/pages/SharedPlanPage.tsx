import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import BrandMark from '../components/BrandMark'
import PageHeader from '../components/ui/PageHeader'
import DateBlock from '../components/ui/DateBlock'
import Priority from '../components/ui/Priority'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import ProgressBar from '../components/ui/ProgressBar'
import { EmptyState, ErrorNotice, LoadingRows } from '../components/ui/Feedback'
import { getSharedPlan } from '../services/shareService'
import type { SharedPlan } from '../services/shareService'
import { formatDay, relativeDay } from '../utils/dates'
import { useLanguage } from '../i18n/useLanguage'

/** Vista pubblica, in sola lettura, del piano di studio condiviso da un link. */
function SharedPlanPage() {
  const { token = '' } = useParams()
  const { t, locale } = useLanguage()
  const [plan, setPlan] = useState<SharedPlan | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    getSharedPlan(token).then(setPlan).catch(() => setFailed(true))
  }, [token])

  const list = (title: string, empty: string, children: ReactNode | null) => (
    <Card>
      <CardHeader><CardTitle><h2>{title}</h2></CardTitle></CardHeader>
      <CardContent>{children ?? <EmptyState compact title={empty} />}</CardContent>
    </Card>
  )

  return (
    <main className="min-h-svh bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-8">
        <Link to="/register" className="flex items-center gap-2.5 self-start font-semibold tracking-tight">
          <BrandMark className="size-8" />
          StudyOS
        </Link>
        <PageHeader title={t('shared.title')} description={t('shared.description')} />
        {failed ? <ErrorNotice message={t('shared.notFound')} /> : !plan ? <LoadingRows label={t('shared.loading')} /> : (
          <div className="grid items-start gap-4 lg:grid-cols-3">
            {list(t('planner.upcomingExams'), t('exams.noUpcomingTitle'), plan.exams.length === 0 ? null : (
              <ul className="flex flex-col divide-y">
                {plan.exams.map((exam, i) => (
                  <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0" key={i}>
                    <DateBlock iso={exam.exam_date} />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-sm font-medium">{exam.title}</span>
                      <span className="text-xs text-muted-foreground">{exam.subject} · {formatDay(exam.exam_date, 'long', locale)} · {relativeDay(exam.exam_date, locale)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ))}
            {list(t('shared.openTasks'), t('planner.allDoneTitle'), plan.tasks.length === 0 ? null : (
              <ul className="flex flex-col divide-y">
                {plan.tasks.map((task, i) => (
                  <li className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0" key={i}>
                    <span className="text-sm font-medium">{task.title}</span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Priority value={task.priority} />
                      {task.due_date && <>· {relativeDay(task.due_date, locale)}</>}
                    </span>
                  </li>
                ))}
              </ul>
            ))}
            {list(t('nav.subjects'), t('subjects.emptyTitle'), plan.subjects.length === 0 ? null : (
              <ul className="flex flex-col gap-4">
                {plan.subjects.map((subject, i) => {
                  const done = subject.topics.filter((x) => x.completed).length
                  return (
                    <li className="flex flex-col gap-2" key={i}>
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-sm font-medium">{subject.name}</span>
                        <span className="font-mono text-xs text-muted-foreground tabular-nums">{t('subjects.topicsCompleted', { done, total: subject.topics.length })}</span>
                      </span>
                      <ProgressBar percent={subject.topics.length ? Math.round((done / subject.topics.length) * 100) : 0} label={t('subjects.progressLabel', { name: subject.name })} />
                    </li>
                  )
                })}
              </ul>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

export default SharedPlanPage
