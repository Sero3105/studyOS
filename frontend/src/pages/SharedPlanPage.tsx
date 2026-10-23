import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageHeader from '../components/ui/PageHeader'
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

  return (
    <main className="content shared-page">
      <div className="content-inner page">
        <Link to="/register" className="brand shared-brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">StudyOS</span>
        </Link>
        <PageHeader title={t('shared.title')} description={t('shared.description')} />
        {failed ? <ErrorNotice message={t('shared.notFound')} /> : !plan ? <LoadingRows label={t('shared.loading')} /> : (
          <div className="shared-grid">
            <section className="panel">
              <h2 className="panel-title">{t('planner.upcomingExams')}</h2>
              {plan.exams.length === 0 ? <EmptyState compact title={t('exams.noUpcomingTitle')} /> : (
                <ul className="rows">
                  {plan.exams.map((exam, i) => (
                    <li className="row" key={i}>
                      <span className="row-main">
                        <span className="row-title">{exam.title}</span>
                        <span className="row-meta">{exam.subject} · {formatDay(exam.exam_date, 'long', locale)} · {relativeDay(exam.exam_date, locale)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="panel">
              <h2 className="panel-title">{t('shared.openTasks')}</h2>
              {plan.tasks.length === 0 ? <EmptyState compact title={t('planner.allDoneTitle')} /> : (
                <ul className="rows">
                  {plan.tasks.map((task, i) => (
                    <li className="row" key={i}>
                      <span className={`priority priority-${task.priority}`} aria-hidden="true" />
                      <span className="row-main">
                        <span className="row-title">{task.title}</span>
                        {task.due_date && <span className="row-meta">{relativeDay(task.due_date, locale)}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="panel">
              <h2 className="panel-title">{t('nav.subjects')}</h2>
              {plan.subjects.length === 0 ? <EmptyState compact title={t('subjects.emptyTitle')} /> : (
                <ul className="rows">
                  {plan.subjects.map((subject, i) => {
                    const done = subject.topics.filter((x) => x.completed).length
                    return (
                      <li className="row" key={i}>
                        <span className="row-main">
                          <span className="row-title">{subject.name}</span>
                          <span className="row-meta">{t('subjects.topicsCompleted', { done, total: subject.topics.length })}</span>
                          <ProgressBar percent={subject.topics.length ? Math.round((done / subject.topics.length) * 100) : 0} label={t('subjects.progressLabel', { name: subject.name })} />
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  )
}

export default SharedPlanPage
