import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Download } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import WeekChart from '../components/ui/WeekChart'
import ProgressBar from '../components/ui/ProgressBar'
import { EmptyState, ErrorNotice, LoadingRows } from '../components/ui/Feedback'
import { getStatsSummary } from '../services/statsService'
import { getSessions } from '../services/sessionService'
import type { StudySession } from '../services/sessionService'
import { getTasks } from '../services/taskService'
import type { Task } from '../services/taskService'
import { getSubjects } from '../services/subjectService'
import type { Subject } from '../services/subjectService'
import StudyHeatmap from '../components/stats/StudyHeatmap'
import BestHours from '../components/stats/BestHours'
import SubjectDot from '../components/ui/SubjectDot'
import { subjectColor } from '../services/subjectService'
import type { SubjectMinutes } from '../services/statsService'
import RecordBook from '../components/exams/RecordBook'
import { getExams } from '../services/examService'
import type { Exam } from '../services/examService'
import { buildHeatmap, focusBySubject, hourGrid, minutesByKind, planVsActual } from '../utils/studyStats'
import { toCsv } from '../utils/csv'
import { saveBlob } from '../utils/download'
import type { NameMinutes, StatsSummary } from '../services/statsService'
import { useLanguage } from '../i18n/useLanguage'
import type { TranslationKey } from '../i18n/translations'
import type { GoalKind } from '../services/goalService'
import { formatMinutes, todayIso } from '../utils/dates'
import { errorMessage } from '../utils/errors'
const goalKindKeys: Record<GoalKind, TranslationKey> = { weekly_minutes: 'goal.kind.weekly_minutes', total_minutes: 'goal.kind.total_minutes', tasks_done: 'goal.kind.tasks_done', topics_done: 'goal.kind.topics_done', sessions_count: 'goal.kind.sessions_count' }

function percentOf(part: number, total: number): number {
  return total ? Math.round((part / total) * 100) : 0
}

/** Classifica a barre orizzontali: nome, barra proporzionale, minuti e quota. */
function RankedBars({ items, label }: { items: (NameMinutes | SubjectMinutes)[]; label: string }) {
  const max = Math.max(1, ...items.map((item) => item.minutes))
  const total = items.reduce((sum, item) => sum + item.minutes, 0)
  return (
    <ol className="ranked" aria-label={label}>
      {items.map((item) => (
        <li className="ranked-row" key={'id' in item ? item.id : item.name}>
          <span className="ranked-name">{'id' in item && <SubjectDot subject={item} />}{item.name}</span>
          <span className="ranked-track" aria-hidden="true">
            <span style={{ width: `${(item.minutes / max) * 100}%`, ...('id' in item && { background: `var(--subject-${subjectColor(item)})` }) }} />
          </span>
          <span className="ranked-value num">
            {formatMinutes(item.minutes)}
            <span className="ranked-share">{percentOf(item.minutes, total)}%</span>
          </span>
        </li>
      ))}
    </ol>
  )
}

/**
 * Statistiche: prima le cifre (il totale è la più grande), poi il ritmo
 * della settimana accanto all'avanzamento, poi dove va il tempo, infine
 * gli obiettivi. Tutto viene da `/stats/summary`.
 */
function StatisticsPage() {
  const { t, locale } = useLanguage()
  const [stats, setStats] = useState<StatsSummary | null>(null)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState<{ sessions: StudySession[]; tasks: Task[]; subjects: Subject[]; exams: Exam[] } | null>(null)

  const load = useCallback(() => {
    setError('')
    getStatsSummary()
      .then(setStats)
      .catch((e) => setError(errorMessage(e, t('stats.loadError'))))
    // Heatmap e piano vs realtà sono di contorno: se falliscono, il resto della pagina resta.
    Promise.all([getSessions(), getTasks(), getSubjects(), getExams()])
      .then(([sessions, tasks, subjects, exams]) => setDetail({ sessions, tasks, subjects, exams }))
      .catch(() => setDetail(null))
  }, [t])
  const today = todayIso()
  const planRows = detail ? planVsActual(detail.subjects, detail.tasks, detail.sessions, today) : []

  useEffect(() => { queueMicrotask(load) }, [load])

  const activeDays = stats?.daily.filter((day) => day.minutes > 0).length ?? 0
  const subjectById = (id: number | null) => detail?.subjects.find((s) => s.id === id)
  const kinds = detail ? minutesByKind(detail.sessions).map((k) => ({ name: t(`session.kind.${k.kind}` as TranslationKey), minutes: k.minutes })) : []
  const focus = detail ? focusBySubject(detail.sessions) : []

  // Tutte le sessioni, una per riga, in ordine di data: per un foglio di calcolo.
  const exportCsv = () => {
    if (!detail) return
    const topicTitle = (s: StudySession) => subjectById(s.subject_id)?.topics.find((x) => x.id === s.topic_id)?.title
    const rows = [...detail.sessions].sort((a, b) => a.studied_on.localeCompare(b.studied_on) || a.id - b.id).map((s) => [
      s.studied_on, s.duration_minutes, subjectById(s.subject_id)?.name, topicTitle(s), t(`session.kind.${s.kind}`), s.focus ? t(`session.focus.${s.focus}`) : '', s.notes,
    ])
    const header = [t('history.date'), t('history.minutes'), t('timer.subject'), t('timer.topic'), t('session.kind'), t('session.focus'), t('timer.note')]
    saveBlob(new Blob([toCsv([header, ...rows])], { type: 'text/csv;charset=utf-8' }), `studyos-sessioni-${today}.csv`)
  }

  return (
    <div className="page stats-page">
      <PageHeader
        title={t('stats.title')}
        description={t('stats.description')}
        actions={detail && detail.sessions.length > 0 && (
          <button className="btn btn-secondary" type="button" onClick={exportCsv} title={t('stats.exportHint')}>
            <Download aria-hidden="true" /> {t('stats.export')}
          </button>
        )}
      />

      {error && <ErrorNotice message={error} onRetry={load} />}
      {!stats && !error && <LoadingRows rows={4} label={t('stats.loading')} />}

      {stats && (
        <>
          <section className="panel figures" aria-label={t('stats.summary')}>
            <div className="figure figure-lead">
              <span className="figure-label">{t('stats.totalTime')}</span>
              <span className="figure-value num">{formatMinutes(stats.total_minutes)}</span>
            </div>
            <dl className="figure-grid">
              <div className="figure"><dt className="figure-label">{t('stats.thisMonth')}</dt><dd className="figure-value num">{formatMinutes(stats.month_minutes)}</dd></div>
              <div className="figure"><dt className="figure-label">{t('stats.thisWeek')}</dt><dd className="figure-value num">{formatMinutes(stats.week_minutes)}</dd></div>
              <div className="figure"><dt className="figure-label">{t('stats.today')}</dt><dd className="figure-value num">{formatMinutes(stats.today_minutes)}</dd></div>
              <div className="figure"><dt className="figure-label">{t('stats.sessions')}</dt><dd className="figure-value num">{stats.sessions_count}</dd></div>
              <div className="figure"><dt className="figure-label">{t('stats.streakDays')}</dt><dd className="figure-value num">{stats.streak_days}</dd></div>
              <div className="figure"><dt className="figure-label">{t('stats.avgSession')}</dt><dd className="figure-value num">{stats.sessions_count ? formatMinutes(Math.round(stats.total_minutes / stats.sessions_count)) : '—'}</dd></div>
            </dl>
          </section>

          <div className="stats-split">
            <section className="panel" aria-labelledby="stats-week-title">
              <div className="panel-head">
                <h2 id="stats-week-title" className="panel-title">{t('stats.last7Days')}</h2>
                <span className="panel-meta num">
                  {t('stats.activeDays', { count: activeDays, label: activeDays === 1 ? t('stats.activeDayOne') : t('stats.activeDayMany'), avg: formatMinutes(Math.round(stats.daily.reduce((s, d) => s + d.minutes, 0) / Math.max(1, stats.daily.length))) })}
                </span>
              </div>
              <WeekChart daily={stats.daily} tall />
            </section>

            <section className="panel progress-panel" aria-labelledby="stats-progress-title">
              <h2 id="stats-progress-title" className="panel-title">{t('stats.progress')}</h2>
              <div className="progress-stat">
                <div className="progress-stat-line">
                  <span>{t('stats.tasksCompleted')}</span>
                  <span className="num">{stats.tasks_done}/{stats.tasks_total}</span>
                </div>
                <ProgressBar percent={percentOf(stats.tasks_done, stats.tasks_total)} label={t('stats.tasksCompleted')} />
              </div>
              <div className="progress-stat">
                <div className="progress-stat-line">
                  <span>{t('stats.topicsCompleted')}</span>
                  <span className="num">{stats.topics_done}/{stats.topics_total}</span>
                </div>
                <ProgressBar percent={percentOf(stats.topics_done, stats.topics_total)} label={t('stats.topicsCompleted')} />
              </div>
            </section>
          </div>

          <div className="stats-pair">
            <section className="panel" aria-labelledby="stats-subject-title">
              <h2 id="stats-subject-title" className="panel-title panel-head">{t('stats.timeBySubject')}</h2>
              {stats.by_subject.length === 0 ? (
                <EmptyState compact title={t('stats.noData')}>{t('stats.noSubjectData')}</EmptyState>
              ) : (
                <RankedBars items={stats.by_subject} label={t('stats.timeBySubject')} />
              )}
            </section>
            <section className="panel" aria-labelledby="stats-topic-title">
              <h2 id="stats-topic-title" className="panel-title panel-head">{t('stats.timeByTopic')}</h2>
              {stats.by_topic.length === 0 ? (
                <EmptyState compact title={t('stats.noData')}>{t('stats.noTopicData')}</EmptyState>
              ) : (
                <RankedBars items={stats.by_topic} label={t('stats.timeByTopic')} />
              )}
            </section>
          </div>

          {detail && detail.sessions.length > 0 && (
            <div className="stats-pair">
              <section className="panel" aria-labelledby="stats-kind-title">
                <h2 id="stats-kind-title" className="panel-title panel-head">{t('stats.byKind')}</h2>
                <RankedBars items={kinds} label={t('stats.byKind')} />
              </section>
              <section className="panel" aria-labelledby="stats-focus-title">
                <h2 id="stats-focus-title" className="panel-title panel-head">{t('stats.focusTitle')}</h2>
                {focus.length === 0 ? (
                  <EmptyState compact title={t('stats.focusEmptyTitle')}>{t('stats.focusEmptyBody')}</EmptyState>
                ) : (
                  <ol className="ranked" aria-label={t('stats.focusTitle')}>
                    {focus.map((row) => {
                      const subject = subjectById(row.subjectId)
                      return (
                        <li className="ranked-row" key={row.subjectId ?? 'free'} title={t('stats.focusDetail', { value: row.average.toLocaleString(locale, { maximumFractionDigits: 1 }), count: row.count })}>
                          <span className="ranked-name"><SubjectDot subject={subject} />{subject?.name ?? t('history.freeSession')}</span>
                          <span className="ranked-track" aria-hidden="true"><span style={{ width: `${Math.max(4, ((row.average - 1) / 2) * 100)}%` }} /></span>
                          <span className="ranked-value">{t(`session.focus.${Math.round(row.average) as 1 | 2 | 3}`)}</span>
                        </li>
                      )
                    })}
                  </ol>
                )}
              </section>
            </div>
          )}

          {detail && <RecordBook exams={detail.exams} detailed />}

          {detail && (
            <section className="panel" aria-labelledby="stats-heatmap-title">
              <h2 id="stats-heatmap-title" className="panel-title panel-head">{t('stats.heatmapTitle')}</h2>
              <StudyHeatmap weeks={buildHeatmap(detail.sessions, today)} />
            </section>
          )}

          {detail && (
            <section className="panel" aria-labelledby="stats-hours-title">
              <h2 id="stats-hours-title" className="panel-title panel-head">{t('stats.bestHoursTitle')}</h2>
              <BestHours grid={hourGrid(detail.sessions)} />
            </section>
          )}

          {planRows.length > 0 && (
            <section className="panel" aria-labelledby="stats-plan-title">
              <div className="panel-head">
                <h2 id="stats-plan-title" className="panel-title">{t('stats.planTitle')}</h2>
                <span className="panel-meta">{t('stats.planWindow')}</span>
              </div>
              <table className="plan-table">
                <thead>
                  <tr>
                    <th scope="col">{t('planner.subject')}</th>
                    <th scope="col">{t('stats.planPlanned')}</th>
                    <th scope="col" className="plan-bar-col"><span className="visually-hidden">{t('stats.progress')}</span></th>
                    <th scope="col">{t('stats.planStudied')}</th>
                  </tr>
                </thead>
                <tbody>
                  {planRows.map((row) => (
                    <tr key={row.subjectId}>
                      <th scope="row">{row.name}</th>
                      <td className="num">{row.planned ? `${row.done}/${row.planned}` : '—'}</td>
                      <td className="plan-bar-col">{row.planned > 0 && <ProgressBar percent={percentOf(row.done, row.planned)} label={t('stats.planProgress', { name: row.name })} />}</td>
                      <td className="num">{row.minutes ? formatMinutes(row.minutes) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          <section className="panel" aria-labelledby="stats-goals-title">
            <div className="panel-head">
              <h2 id="stats-goals-title" className="panel-title">{t('stats.goals')}</h2>
              <Link className="text-link" to="/goals">{t('stats.manage')} <ArrowRight aria-hidden="true" /></Link>
            </div>
            {stats.goals.length === 0 ? (
              <EmptyState compact title={t('stats.noGoals')} action={<Link className="text-link" to="/goals">{t('stats.createGoal')} <ArrowRight aria-hidden="true" /></Link>}>
                {t('stats.noGoalsBody')}
              </EmptyState>
            ) : (
              <ul className="rows">
                {stats.goals.map((goal) => (
                  <li className="row goal-stat" key={goal.id}>
                    <span className="row-main">
                      <span className="row-title">{goal.title}</span>
                      <span className="row-meta">{t('stats.ofTarget', { kind: t(goalKindKeys[goal.kind]), current: goal.current, target: goal.target })}</span>
                    </span>
                    <span className="goal-stat-bar"><ProgressBar percent={goal.percent} label={goal.title} /></span>
                    <span className="goal-stat-percent num">{goal.percent}%</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}

export default StatisticsPage
