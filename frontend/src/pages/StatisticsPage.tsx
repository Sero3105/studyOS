import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getStatsSummary } from '../services/statsService'
import type { StatsSummary } from '../services/statsService'
import { goalKindLabels } from '../services/goalService'

function StatisticsPage() {
  const [stats, setStats] = useState<StatsSummary | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getStatsSummary()
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : 'Impossibile caricare le statistiche'))
  }, [])

  if (error) return <section className="dashboard-page"><div className="dashboard-card" role="alert"><h2>Caricamento non riuscito</h2><p>{error}</p></div></section>
  if (!stats) return <section className="dashboard-page"><p>Caricamento statistiche…</p></section>

  return (
    <section className="dashboard-page">
      <div className="dashboard-section-heading">
        <div><p className="section-kicker">Analyze</p><h1>Statistiche</h1><p className="muted-note">Dati reali dalle tue sessioni, task e obiettivi.</p></div>
      </div>

      <div className="stats-grid">
        <article className="stat-card"><p>Tempo totale</p><strong className="stat-value">{stats.total_minutes} min</strong></article>
        <article className="stat-card"><p>Oggi / settimana / mese</p><strong className="stat-value">{stats.today_minutes} / {stats.week_minutes} / {stats.month_minutes} min</strong></article>
        <article className="stat-card"><p>Sessioni</p><strong className="stat-value">{stats.sessions_count}</strong></article>
        <article className="stat-card"><p>Giorni consecutivi</p><strong className="stat-value">{stats.streak_days}</strong></article>
        <article className="stat-card"><p>Task completati</p><strong className="stat-value">{stats.tasks_done}/{stats.tasks_total}</strong></article>
        <article className="stat-card"><p>Argomenti completati</p><strong className="stat-value">{stats.topics_done}/{stats.topics_total}</strong></article>
      </div>

      <div className="dashboard-grid dashboard-grid-primary">
        <article className="dashboard-card">
          <h2>Tempo per materia</h2>
          {stats.by_subject.length === 0 ? <p className="muted-note">Nessun dato.</p> : (
            <ul className="topic-list">{stats.by_subject.map((x) => <li key={x.name}><span>{x.name}</span><span>{x.minutes} min</span></li>)}</ul>
          )}
          <h2>Tempo per argomento</h2>
          {stats.by_topic.length === 0 ? <p className="muted-note">Nessun dato.</p> : (
            <ul className="topic-list">{stats.by_topic.map((x) => <li key={x.name}><span>{x.name}</span><span>{x.minutes} min</span></li>)}</ul>
          )}
        </article>

        <article className="dashboard-card">
          <h2>Ultimi 7 giorni</h2>
          <ul className="topic-list">{stats.daily.map((d) => <li key={d.date}><span>{d.date}</span><span>{d.minutes} min</span></li>)}</ul>
        </article>
      </div>

      <article className="dashboard-card">
        <h2>Progresso obiettivi</h2>
        {stats.goals.length === 0 ? <p className="muted-note">Nessun obiettivo. <Link className="text-action" to="/goals">Crea obiettivo</Link></p> : (
          <ul className="topic-list">
            {stats.goals.map((g) => <li key={g.id}><span>{g.title} ({goalKindLabels[g.kind]})</span><span>{g.current}/{g.target} · {g.percent}%</span></li>)}
          </ul>
        )}
      </article>

      <article className="dashboard-card">
        <h2>Prossimi esami</h2>
        {stats.upcoming_exams.length === 0 ? <p className="muted-note">Nessun esame pianificato.</p> : (
          <ul className="topic-list">{stats.upcoming_exams.map((e) => <li key={e.id}><span>{e.title} — {e.subject}</span><span>{e.exam_date}</span></li>)}</ul>
        )}
      </article>
    </section>
  )
}

export default StatisticsPage
