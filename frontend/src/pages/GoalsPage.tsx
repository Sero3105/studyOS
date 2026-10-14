import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Plus } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import ProgressBar from '../components/ui/ProgressBar'
import ConfirmButton from '../components/ui/ConfirmButton'
import { EmptyState, ErrorNotice, LoadingRows } from '../components/ui/Feedback'
import { createGoal, deleteGoal, getGoals, goalKindLabels } from '../services/goalService'
import type { Goal, GoalKind } from '../services/goalService'
import { errorMessage } from '../utils/errors'

/** Unità di misura di ogni tipo di obiettivo, per i campi e per le righe. */
const goalUnits: Record<GoalKind, string> = {
  weekly_minutes: 'minuti',
  total_minutes: 'minuti',
  tasks_done: 'task',
  topics_done: 'argomenti',
  sessions_count: 'sessioni',
}

function GoalRow({ goal, onDelete }: { goal: Goal; onDelete: (id: number) => Promise<void> }) {
  const remaining = Math.max(0, goal.target - goal.current)
  const reached = goal.percent >= 100
  return (
    <li className={`panel goal${reached ? ' is-reached' : ''}`}>
      <span className="goal-percent num" aria-hidden="true">{Math.min(goal.percent, 100)}%</span>
      <div className="goal-body">
        <div className="goal-head">
          <div className="row-main">
            <h3 className="goal-title">{goal.title}</h3>
            <span className="row-meta">{goalKindLabels[goal.kind]}</span>
          </div>
          <ConfirmButton label={`Elimina ${goal.title}`} onConfirm={() => onDelete(goal.id)} />
        </div>
        <ProgressBar percent={goal.percent} label={`${goal.title}: ${goal.percent}%`} />
        <p className="goal-status num">
          {goal.current} di {goal.target} {goalUnits[goal.kind]}
          {reached ? ' · Raggiunto' : ` · ne mancano ${remaining}`}
        </p>
      </div>
    </li>
  )
}

/**
 * Obiettivi: il modulo si apre solo quando serve; gli obiettivi in corso
 * vengono prima di quelli raggiunti, con la percentuale come cifra guida.
 */
function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<GoalKind>('weekly_minutes')
  const [target, setTarget] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async (): Promise<void> => {
    try { setError(''); setGoals(await getGoals()) }
    catch (e) { setError(errorMessage(e, 'Impossibile caricare gli obiettivi')) }
    finally { setLoading(false) }
  }
  useEffect(() => { queueMicrotask(() => { void load() }) }, [])

  const addGoal = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      const created = await createGoal(title.trim(), kind, Number(target))
      setGoals((g) => [...g, created])
      setTitle(''); setTarget(''); setShowForm(false)
    } catch (e) { setError(errorMessage(e, 'Salvataggio non riuscito')) }
    finally { setSaving(false) }
  }

  const removeGoal = async (id: number) => {
    try {
      await deleteGoal(id)
      setGoals((g) => g.filter((x) => x.id !== id))
    } catch (e) { setError(errorMessage(e, 'Eliminazione non riuscita')) }
  }

  const active = goals.filter((g) => g.percent < 100).sort((a, b) => b.percent - a.percent)
  const reached = goals.filter((g) => g.percent >= 100)

  return (
    <div className="page goals-page">
      <PageHeader
        title="Obiettivi"
        description={
          goals.length
            ? `${active.length} in corso · ${reached.length} ${reached.length === 1 ? 'raggiunto' : 'raggiunti'}. Il progresso si aggiorna dai tuoi dati.`
            : 'Traguardi misurabili, aggiornati in automatico dalle tue sessioni e dai task.'
        }
        actions={
          !showForm && (
            <button className="btn btn-primary" type="button" onClick={() => setShowForm(true)}>
              <Plus aria-hidden="true" /> Nuovo obiettivo
            </button>
          )
        }
      />

      {error && <ErrorNotice message={error} onRetry={goals.length ? undefined : () => void load()} onDismiss={goals.length ? () => setError('') : undefined} />}

      {showForm && (
        <form className="panel goal-form" onSubmit={addGoal} aria-labelledby="goal-form-title">
          <h2 id="goal-form-title" className="panel-title">Nuovo obiettivo</h2>
          <label className="field">
            <span className="field-label">Nome</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} placeholder="Es. 10 ore questa settimana" autoFocus />
          </label>
          <div className="form-grid">
            <label className="field">
              <span className="field-label">Cosa misura</span>
              <select value={kind} onChange={(e) => setKind(e.target.value as GoalKind)}>
                {Object.entries(goalKindLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Traguardo ({goalUnits[kind]})</span>
              <input type="number" inputMode="numeric" min="1" step="1" value={target} onChange={(e) => setTarget(e.target.value)} required placeholder="Es. 600" />
            </label>
          </div>
          <div className="form-actions">
            <button className="btn btn-ghost" type="button" onClick={() => setShowForm(false)}>Annulla</button>
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Salvataggio…' : 'Crea obiettivo'}</button>
          </div>
        </form>
      )}

      {loading ? (
        <LoadingRows label="Caricamento obiettivi" />
      ) : goals.length === 0 ? (
        !showForm && !error && (
          <section className="panel">
            <EmptyState
              title="Nessun obiettivo"
              action={<button className="btn btn-primary" type="button" onClick={() => setShowForm(true)}><Plus aria-hidden="true" /> Crea il primo obiettivo</button>}
            >
              Per esempio: 600 minuti questa settimana, oppure 20 argomenti completati.
            </EmptyState>
          </section>
        )
      ) : (
        <>
          {active.length > 0 && (
            <section className="page-section" aria-labelledby="goals-active-title">
              <h2 id="goals-active-title" className="section-title">In corso</h2>
              <ul className="goal-list">{active.map((goal) => <GoalRow key={goal.id} goal={goal} onDelete={removeGoal} />)}</ul>
            </section>
          )}
          {reached.length > 0 && (
            <section className="page-section" aria-labelledby="goals-reached-title">
              <h2 id="goals-reached-title" className="section-title">Raggiunti</h2>
              <ul className="goal-list">{reached.map((goal) => <GoalRow key={goal.id} goal={goal} onDelete={removeGoal} />)}</ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}

export default GoalsPage
