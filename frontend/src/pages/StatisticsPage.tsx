import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import WeekChart from '../components/ui/WeekChart'
import ProgressBar from '../components/ui/ProgressBar'
import { EmptyState, ErrorNotice, LoadingRows } from '../components/ui/Feedback'
import { getStatsSummary } from '../services/statsService'
import type { NameMinutes, StatsSummary } from '../services/statsService'
import { goalKindLabels } from '../services/goalService'
import { formatMinutes } from '../utils/dates'
import { errorMessage } from '../utils/errors'

function percentOf(part: number, total: number): number {
  return total ? Math.round((part / total) * 100) : 0
}

/** Classifica a barre orizzontali: nome, barra proporzionale, minuti e quota. */
function RankedBars({ items, label }: { items: NameMinutes[]; label: string }) {
  const max = Math.max(1, ...items.map((item) => item.minutes))
  const total = items.reduce((sum, item) => sum + item.minutes, 0)
  return (
    <ol className="ranked" aria-label={label}>
      {items.map((item) => (
        <li className="ranked-row" key={item.name}>
          <span className="ranked-name">{item.name}</span>
          <span className="ranked-track" aria-hidden="true">
            <span style={{ width: `${(item.minutes / max) * 100}%` }} />
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
  const [stats, setStats] = useState<StatsSummary | null>(null)
  const [error, setError] = useState('')

  const load = () => {
    setError('')
    getStatsSummary()
      .then(setStats)
      .catch((e) => setError(errorMessage(e, 'Impossibile caricare le statistiche')))
  }

  useEffect(() => { queueMicrotask(load) }, [])

  const activeDays = stats?.daily.filter((day) => day.minutes > 0).length ?? 0

  return (
    <div className="page stats-page">
      <PageHeader title="Statistiche" description="Calcolate dalle tue sessioni, dai task e dagli argomenti." />

      {error && <ErrorNotice message={error} onRetry={load} />}
      {!stats && !error && <LoadingRows rows={4} label="Caricamento statistiche" />}

      {stats && (
        <>
          <section className="panel figures" aria-label="Riepilogo">
            <div className="figure figure-lead">
              <span className="figure-label">Tempo totale</span>
              <span className="figure-value num">{formatMinutes(stats.total_minutes)}</span>
            </div>
            <dl className="figure-grid">
              <div className="figure"><dt className="figure-label">Questo mese</dt><dd className="figure-value num">{formatMinutes(stats.month_minutes)}</dd></div>
              <div className="figure"><dt className="figure-label">Questa settimana</dt><dd className="figure-value num">{formatMinutes(stats.week_minutes)}</dd></div>
              <div className="figure"><dt className="figure-label">Oggi</dt><dd className="figure-value num">{formatMinutes(stats.today_minutes)}</dd></div>
              <div className="figure"><dt className="figure-label">Sessioni</dt><dd className="figure-value num">{stats.sessions_count}</dd></div>
              <div className="figure"><dt className="figure-label">Giorni di fila</dt><dd className="figure-value num">{stats.streak_days}</dd></div>
              <div className="figure"><dt className="figure-label">Media sessione</dt><dd className="figure-value num">{stats.sessions_count ? formatMinutes(Math.round(stats.total_minutes / stats.sessions_count)) : '—'}</dd></div>
            </dl>
          </section>

          <div className="stats-split">
            <section className="panel" aria-labelledby="stats-week-title">
              <div className="panel-head">
                <h2 id="stats-week-title" className="panel-title">Ultimi 7 giorni</h2>
                <span className="panel-meta num">
                  {activeDays} {activeDays === 1 ? 'giorno attivo' : 'giorni attivi'} · media {formatMinutes(Math.round(stats.daily.reduce((s, d) => s + d.minutes, 0) / Math.max(1, stats.daily.length)))} al giorno
                </span>
              </div>
              <WeekChart daily={stats.daily} tall />
            </section>

            <section className="panel progress-panel" aria-labelledby="stats-progress-title">
              <h2 id="stats-progress-title" className="panel-title">Avanzamento</h2>
              <div className="progress-stat">
                <div className="progress-stat-line">
                  <span>Task completati</span>
                  <span className="num">{stats.tasks_done}/{stats.tasks_total}</span>
                </div>
                <ProgressBar percent={percentOf(stats.tasks_done, stats.tasks_total)} label="Task completati" />
              </div>
              <div className="progress-stat">
                <div className="progress-stat-line">
                  <span>Argomenti completati</span>
                  <span className="num">{stats.topics_done}/{stats.topics_total}</span>
                </div>
                <ProgressBar percent={percentOf(stats.topics_done, stats.topics_total)} label="Argomenti completati" />
              </div>
            </section>
          </div>

          <div className="stats-pair">
            <section className="panel" aria-labelledby="stats-subject-title">
              <h2 id="stats-subject-title" className="panel-title panel-head">Tempo per materia</h2>
              {stats.by_subject.length === 0 ? (
                <EmptyState compact title="Nessun dato">Associa una materia alle sessioni per vedere dove va il tempo.</EmptyState>
              ) : (
                <RankedBars items={stats.by_subject} label="Tempo per materia" />
              )}
            </section>
            <section className="panel" aria-labelledby="stats-topic-title">
              <h2 id="stats-topic-title" className="panel-title panel-head">Tempo per argomento</h2>
              {stats.by_topic.length === 0 ? (
                <EmptyState compact title="Nessun dato">Scegli un argomento quando avvii una sessione.</EmptyState>
              ) : (
                <RankedBars items={stats.by_topic} label="Tempo per argomento" />
              )}
            </section>
          </div>

          <section className="panel" aria-labelledby="stats-goals-title">
            <div className="panel-head">
              <h2 id="stats-goals-title" className="panel-title">Obiettivi</h2>
              <Link className="text-link" to="/goals">Gestisci <ArrowRight aria-hidden="true" /></Link>
            </div>
            {stats.goals.length === 0 ? (
              <EmptyState compact title="Nessun obiettivo" action={<Link className="text-link" to="/goals">Crea un obiettivo <ArrowRight aria-hidden="true" /></Link>}>
                Un traguardo misurabile rende questi numeri più utili.
              </EmptyState>
            ) : (
              <ul className="rows">
                {stats.goals.map((goal) => (
                  <li className="row goal-stat" key={goal.id}>
                    <span className="row-main">
                      <span className="row-title">{goal.title}</span>
                      <span className="row-meta">{goalKindLabels[goal.kind]} · {goal.current} di {goal.target}</span>
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
