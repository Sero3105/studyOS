import { useCallback, useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Figures from '../components/ui/Figures'
import MoreLink from '../components/ui/MoreLink'
import { Button } from '../components/ui/button'
import Ranked from '../components/stats/Ranked'
import Section from '../components/stats/Section'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
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
import StudyTrend from '../components/stats/StudyTrend'
import StudyQuality from '../components/stats/StudyQuality'
import ExamStatsTable from '../components/stats/ExamStatsTable'
import { getCards, getMistakes } from '../services/cardService'
import type { Card as FlashCard, Mistake } from '../services/cardService'
import { examStats } from '../utils/planning'
import SubjectDot from '../components/ui/SubjectDot'
import { SUBJECT_BG } from '@/lib/subjectColors'
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
    <ol className="flex flex-col gap-3" aria-label={label}>
      {items.map((item) => (
        <Ranked
          key={'id' in item ? item.id : item.name}
          name={<>{'id' in item && <SubjectDot subject={item} />}{item.name}</>}
          width={(item.minutes / max) * 100}
          barClass={'id' in item ? SUBJECT_BG[subjectColor(item)] : 'bg-primary/80'}
          value={<>{formatMinutes(item.minutes)}<span className="ml-1.5 text-muted-foreground">{percentOf(item.minutes, total)}%</span></>}
        />
      ))}
    </ol>
  )
}

/**
 * Statistiche in tre schede: Panoramica (cifre, ritmo, dove va il tempo, obiettivi),
 * Esami (libretto con l'andamento dei voti, copertura) e Abitudini (tipo, focus, qualità,
 * heatmap, ore migliori, piano contro realtà). Dati da `/stats/summary` e dai dettagli.
 */
function StatisticsPage() {
  const { t, locale } = useLanguage()
  const [stats, setStats] = useState<StatsSummary | null>(null)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState<{ sessions: StudySession[]; tasks: Task[]; subjects: Subject[]; exams: Exam[]; cards: FlashCard[]; mistakes: Mistake[] } | null>(null)

  const load = useCallback(() => {
    setError('')
    getStatsSummary()
      .then(setStats)
      .catch((e) => setError(errorMessage(e, t('stats.loadError'))))
    // Heatmap e piano vs realtà sono di contorno: se falliscono, il resto della pagina resta.
    // Carte ed errori servono solo alla copertura degli esami: senza, la tabella conta solo le sessioni.
    Promise.all([getSessions(), getTasks(), getSubjects(), getExams(), getCards().catch(() => []), getMistakes().catch(() => [])])
      .then(([sessions, tasks, subjects, exams, cards, mistakes]) => setDetail({ sessions, tasks, subjects, exams, cards, mistakes }))
      .catch(() => setDetail(null))
  }, [t])
  const today = todayIso()
  const planRows = detail ? planVsActual(detail.subjects, detail.tasks, detail.sessions, today) : []
  const examRows = detail ? examStats(detail.exams, detail.subjects, detail, today) : []

  useEffect(() => { queueMicrotask(load) }, [load])

  const activeDays = stats?.daily.filter((day) => day.minutes > 0).length ?? 0
  const subjectById = (id: number | null) => detail?.subjects.find((s) => s.id === id)
  const kinds = detail ? minutesByKind(detail.sessions).map((k) => ({ name: t(`session.kind.${k.kind}` as TranslationKey), minutes: k.minutes })) : []
  const focus = detail ? focusBySubject(detail.sessions) : []
  const hasSessions = Boolean(detail && detail.sessions.length > 0)

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
    <div className="flex flex-col gap-8">
      <PageHeader
        title={t('stats.title')}
        description={t('stats.description')}
        actions={hasSessions && (
          <Button variant="outline" onClick={exportCsv} title={t('stats.exportHint')}>
            <Download data-icon="inline-start" aria-hidden="true" /> {t('stats.export')}
          </Button>
        )}
      />

      {error && <ErrorNotice message={error} onRetry={load} />}
      {!stats && !error && <LoadingRows rows={4} label={t('stats.loading')} />}

      {stats && (
        <Tabs defaultValue="overview" className="gap-6">
          <TabsList className="w-full sm:w-fit">
            <TabsTrigger value="overview">{t('stats.tabOverview')}</TabsTrigger>
            <TabsTrigger value="exams">{t('nav.exams')}</TabsTrigger>
            <TabsTrigger value="habits">{t('stats.tabHabits')}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="flex flex-col gap-4">
            <Figures label={t('stats.summary')} className="sm:grid-cols-4 lg:grid-cols-7" items={[
              { label: t('stats.totalTime'), value: <span className="text-primary">{formatMinutes(stats.total_minutes)}</span> },
              { label: t('stats.thisMonth'), value: formatMinutes(stats.month_minutes) },
              { label: t('stats.thisWeek'), value: formatMinutes(stats.week_minutes) },
              { label: t('stats.today'), value: formatMinutes(stats.today_minutes) },
              { label: t('stats.sessions'), value: stats.sessions_count },
              { label: t('stats.streakDays'), value: stats.streak_days },
              { label: t('stats.avgSession'), value: stats.sessions_count ? formatMinutes(Math.round(stats.total_minutes / stats.sessions_count)) : '—' },
            ]} />

            <div className="grid gap-4 lg:grid-cols-3">
              <Section id="stats-week-title" className="lg:col-span-2" title={t('stats.last7Days')}
                meta={t('stats.activeDays', { count: activeDays, label: activeDays === 1 ? t('stats.activeDayOne') : t('stats.activeDayMany'), avg: formatMinutes(Math.round(stats.daily.reduce((s, d) => s + d.minutes, 0) / Math.max(1, stats.daily.length))) })}>
                <WeekChart daily={stats.daily} tall />
              </Section>

              <Section id="stats-progress-title" title={t('stats.progress')}>
                <div className="flex flex-col gap-6">
                  {[
                    { label: t('stats.tasksCompleted'), done: stats.tasks_done, total: stats.tasks_total },
                    { label: t('stats.topicsCompleted'), done: stats.topics_done, total: stats.topics_total },
                  ].map((row) => (
                    <div key={row.label} className="flex flex-col gap-2">
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span>{row.label}</span>
                        <span className="font-mono text-xs text-muted-foreground tabular-nums">{row.done}/{row.total}</span>
                      </div>
                      <ProgressBar percent={percentOf(row.done, row.total)} label={row.label} />
                    </div>
                  ))}
                </div>
              </Section>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Section id="stats-subject-title" title={t('stats.timeBySubject')}>
                {stats.by_subject.length === 0 ? (
                  <EmptyState compact title={t('stats.noData')}>{t('stats.noSubjectData')}</EmptyState>
                ) : (
                  <RankedBars items={stats.by_subject} label={t('stats.timeBySubject')} />
                )}
              </Section>
              <Section id="stats-topic-title" title={t('stats.timeByTopic')}>
                {stats.by_topic.length === 0 ? (
                  <EmptyState compact title={t('stats.noData')}>{t('stats.noTopicData')}</EmptyState>
                ) : (
                  <RankedBars items={stats.by_topic} label={t('stats.timeByTopic')} />
                )}
              </Section>
            </div>

            {detail && hasSessions && <StudyTrend sessions={detail.sessions} subjects={detail.subjects} tasks={detail.tasks} today={today} />}

            <Section id="stats-goals-title" title={t('stats.goals')} action={<MoreLink to="/goals">{t('stats.manage')}</MoreLink>}>
              {stats.goals.length === 0 ? (
                <EmptyState compact title={t('stats.noGoals')} action={<MoreLink to="/goals">{t('stats.createGoal')}</MoreLink>}>
                  {t('stats.noGoalsBody')}
                </EmptyState>
              ) : (
                <ul className="flex flex-col divide-y">
                  {stats.goals.map((goal) => (
                    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_12rem_3rem]" key={goal.id}>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-sm font-medium">{goal.title}</span>
                        <span className="text-xs text-muted-foreground">{t('stats.ofTarget', { kind: t(goalKindKeys[goal.kind]), current: goal.current, target: goal.target })}</span>
                      </span>
                      <span className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto"><ProgressBar percent={goal.percent} label={goal.title} /></span>
                      <span className="col-start-2 row-start-1 text-right font-mono text-sm tabular-nums sm:col-start-auto sm:row-start-auto">{goal.percent}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </TabsContent>

          <TabsContent value="exams" className="flex flex-col gap-4">
            {!detail ? <LoadingRows rows={3} label={t('stats.loading')} /> : (
              <>
                <RecordBook exams={detail.exams} detailed />
                {examRows.length > 0 && <ExamStatsTable rows={examRows} />}
                {detail.exams.length === 0 && <EmptyState title={t('stats.noData')} action={<MoreLink to="/subjects">{t('nav.exams')}</MoreLink>} />}
              </>
            )}
          </TabsContent>

          <TabsContent value="habits" className="flex flex-col gap-4">
            {!detail ? <LoadingRows rows={3} label={t('stats.loading')} /> : (
              <>
                <Section id="stats-heatmap-title" title={t('stats.heatmapTitle')}>
                  <StudyHeatmap weeks={buildHeatmap(detail.sessions, today)} />
                </Section>

                {hasSessions && (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <Section id="stats-kind-title" title={t('stats.byKind')}>
                      <RankedBars items={kinds} label={t('stats.byKind')} />
                    </Section>
                    <Section id="stats-focus-title" title={t('stats.focusTitle')}>
                      {focus.length === 0 ? (
                        <EmptyState compact title={t('stats.focusEmptyTitle')}>{t('stats.focusEmptyBody')}</EmptyState>
                      ) : (
                        <ol className="flex flex-col gap-3" aria-label={t('stats.focusTitle')}>
                          {focus.map((row) => {
                            const subject = subjectById(row.subjectId)
                            return (
                              <Ranked
                                key={row.subjectId ?? 'free'}
                                title={t('stats.focusDetail', { value: row.average.toLocaleString(locale, { maximumFractionDigits: 1 }), count: row.count })}
                                name={<><SubjectDot subject={subject} />{subject?.name ?? t('history.freeSession')}</>}
                                width={Math.max(4, ((row.average - 1) / 2) * 100)}
                                barClass="bg-info"
                                value={t(`session.focus.${Math.round(row.average) as 1 | 2 | 3}`)}
                              />
                            )
                          })}
                        </ol>
                      )}
                    </Section>
                  </div>
                )}

                {hasSessions && <StudyQuality sessions={detail.sessions} />}

                <Section id="stats-hours-title" title={t('stats.bestHoursTitle')}>
                  <BestHours grid={hourGrid(detail.sessions)} />
                </Section>

                {planRows.length > 0 && (
                  <Section id="stats-plan-title" title={t('stats.planTitle')} meta={t('stats.planWindow')}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead scope="col">{t('planner.subject')}</TableHead>
                          <TableHead scope="col" className="text-right">{t('stats.planPlanned')}</TableHead>
                          <TableHead scope="col" className="hidden w-1/3 sm:table-cell"><span className="sr-only">{t('stats.progress')}</span></TableHead>
                          <TableHead scope="col" className="text-right">{t('stats.planStudied')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {planRows.map((row) => (
                          <TableRow key={row.subjectId}>
                            <TableHead scope="row" className="font-normal text-foreground">{row.name}</TableHead>
                            <TableCell className="text-right font-mono tabular-nums">{row.planned ? `${row.done}/${row.planned}` : '—'}</TableCell>
                            <TableCell className="hidden sm:table-cell">{row.planned > 0 && <ProgressBar percent={percentOf(row.done, row.planned)} label={t('stats.planProgress', { name: row.name })} />}</TableCell>
                            <TableCell className="text-right font-mono tabular-nums">{row.minutes ? formatMinutes(row.minutes) : '—'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Section>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

export default StatisticsPage
