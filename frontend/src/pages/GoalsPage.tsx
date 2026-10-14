import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { createGoal, deleteGoal, getGoals, goalKindLabels } from '../services/goalService'
import type { Goal, GoalKind } from '../services/goalService'

function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<GoalKind>('weekly_minutes')
  const [target, setTarget] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async (): Promise<void> => {
    try { setError(''); setGoals(await getGoals()) }
    catch (e) { setError(e instanceof Error ? e.message : 'Impossibile caricare gli obiettivi') }
    finally { setLoading(false) }
  }
  useEffect(() => { queueMicrotask(() => { void load() }) }, [])

  const addGoal = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      const created = await createGoal(title.trim(), kind, Number(target))
      setGoals((g) => [...g, created])
      setTitle(''); setTarget('')
    } catch (e) { setError(e instanceof Error ? e.message : 'Salvataggio non riuscito') }
    finally { setSaving(false) }
  }

  const removeGoal = async (id: number) => {
    await deleteGoal(id)
    setGoals((g) => g.filter((x) => x.id !== id))
  }

  return (
    <section className="dashboard-page">
      <div className="dashboard-section-heading">
        <div><p className="section-kicker">Improve</p><h1>Obiettivi</h1><p className="muted-note">Progresso calcolato dai tuoi dati reali.</p></div>
      </div>

      <form className="dashboard-card task-form" onSubmit={addGoal}>
        <label>Titolo<input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} placeholder="Es. 10 ore questa settimana" /></label>
        <div className="form-grid">
          <label>Tipo
            <select value={kind} onChange={(e) => setKind(e.target.value as GoalKind)}>
              {Object.entries(goalKindLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label>Obiettivo (numero)<input type="number" min="1" step="1" value={target} onChange={(e) => setTarget(e.target.value)} required placeholder="Es. 600" /></label>
        </div>
        <button className="button button-primary" type="submit" disabled={saving}><Plus size={16} aria-hidden="true" /> Aggiungi obiettivo</button>
      </form>

      {loading ? <p>Caricamento obiettivi…</p> : error ? (
        <div className="dashboard-card" role="alert"><h2>Caricamento non riuscito</h2><p>{error}</p><button className="button button-secondary" type="button" onClick={() => void load()}>Riprova</button></div>
      ) : goals.length === 0 ? (
        <div className="dashboard-card"><h2>Nessun obiettivo</h2><p>Crea il primo obiettivo misurabile.</p></div>
      ) : (
        <div className="card-list goals-grid">
          {goals.map((goal) => (
            <article className="dashboard-card" key={goal.id}>
              <div className="card-row-between">
                <h3>{goal.title}</h3>
                {goal.percent >= 100 && <span className="goal-done">Completato</span>}
                <button className="icon-action" type="button" onClick={() => void removeGoal(goal.id)} aria-label={`Elimina ${goal.title}`}><Trash2 size={16} /></button>
              </div>
              <p className="muted-note">{goalKindLabels[goal.kind]}: {goal.current} / {goal.target} ({goal.percent}%)</p>
              <div className="progress-track" role="progressbar" aria-valuenow={goal.percent} aria-valuemin={0} aria-valuemax={100} aria-label={goal.title}>
                <span style={{ width: `${goal.percent}%` }} />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default GoalsPage
