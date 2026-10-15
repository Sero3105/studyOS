import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Plus } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import ProgressBar from '../components/ui/ProgressBar'
import ConfirmButton from '../components/ui/ConfirmButton'
import { EmptyState, ErrorNotice, LoadingRows } from '../components/ui/Feedback'
import { createGoal, deleteGoal, getGoals } from '../services/goalService'
import { useLanguage } from '../i18n/useLanguage'
import type { TranslationKey } from '../i18n/translations'
import type { Goal, GoalKind } from '../services/goalService'
import { errorMessage } from '../utils/errors'

/** Unità di misura di ogni tipo di obiettivo, per i campi e per le righe. */
const goalKindKeys: Record<GoalKind, TranslationKey> = {
  weekly_minutes: 'goal.kind.weekly_minutes', total_minutes: 'goal.kind.total_minutes', tasks_done: 'goal.kind.tasks_done', topics_done: 'goal.kind.topics_done', sessions_count: 'goal.kind.sessions_count',
}
const goalUnitKeys: Record<GoalKind, TranslationKey> = {
  weekly_minutes: 'goals.unit.weekly_minutes', total_minutes: 'goals.unit.total_minutes', tasks_done: 'goals.unit.tasks_done', topics_done: 'goals.unit.topics_done', sessions_count: 'goals.unit.sessions_count',
}

function GoalRow({ goal, onDelete }: { goal: Goal; onDelete: (id: number) => Promise<void> }) {
  const { t } = useLanguage()
  const remaining = Math.max(0, goal.target - goal.current)
  const reached = goal.percent >= 100
  return (
    <li className={`panel goal${reached ? ' is-reached' : ''}`}>
      <span className="goal-percent num" aria-hidden="true">{Math.min(goal.percent, 100)}%</span>
      <div className="goal-body">
        <div className="goal-head">
          <div className="row-main">
            <h3 className="goal-title">{goal.title}</h3>
            <span className="row-meta">{t(goalKindKeys[goal.kind])}</span>
          </div>
          <ConfirmButton label={t('goals.deleteLabel', { title: goal.title })} onConfirm={() => onDelete(goal.id)} />
        </div>
        <ProgressBar percent={goal.percent} label={`${goal.title}: ${goal.percent}%`} />
        <p className="goal-status num">
          {t('goals.ofTarget', { current: goal.current, target: goal.target, unit: t(goalUnitKeys[goal.kind]) })}
          {reached ? t('goals.reachedSuffix') : t('goals.remainingSuffix', { remaining })}
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
  const { t } = useLanguage()
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
    catch (e) { setError(errorMessage(e, t('goals.loadError'))) }
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
    } catch (e) { setError(errorMessage(e, t('goals.saveError'))) }
    finally { setSaving(false) }
  }

  const removeGoal = async (id: number) => {
    try {
      await deleteGoal(id)
      setGoals((g) => g.filter((x) => x.id !== id))
    } catch (e) { setError(errorMessage(e, t('goals.deleteError'))) }
  }

  const active = goals.filter((g) => g.percent < 100).sort((a, b) => b.percent - a.percent)
  const reached = goals.filter((g) => g.percent >= 100)

  return (
    <div className="page goals-page">
      <PageHeader
        title={t('goals.title')}
        description={
          goals.length
            ? t('goals.descriptionWith', { active: active.length, reached: reached.length, reachedLabel: reached.length === 1 ? t('goals.reachedOne') : t('goals.reachedMany') })
            : t('goals.descriptionEmpty')
        }
        actions={
          !showForm && (
            <button className="btn btn-primary" type="button" onClick={() => setShowForm(true)}>
              <Plus aria-hidden="true" /> {t('goals.newGoal')}
            </button>
          )
        }
      />

      {error && <ErrorNotice message={error} onRetry={goals.length ? undefined : () => void load()} onDismiss={goals.length ? () => setError('') : undefined} />}

      {showForm && (
        <form className="panel goal-form" onSubmit={addGoal} aria-labelledby="goal-form-title">
          <h2 id="goal-form-title" className="panel-title">{t('goals.newGoal')}</h2>
          <label className="field">
            <span className="field-label">{t('goals.name')}</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} placeholder={t('goals.namePlaceholder')} autoFocus />
          </label>
          <div className="form-grid">
            <label className="field">
              <span className="field-label">{t('goals.measures')}</span>
              <select value={kind} onChange={(e) => setKind(e.target.value as GoalKind)}>
                {(Object.keys(goalKindKeys) as GoalKind[]).map((v) => <option key={v} value={v}>{t(goalKindKeys[v])}</option>)}
              </select>
            </label>
            <label className="field">
              <span className="field-label">{t('goals.target', { unit: t(goalUnitKeys[kind]) })}</span>
              <input type="number" inputMode="numeric" min="1" step="1" value={target} onChange={(e) => setTarget(e.target.value)} required placeholder={t('goals.targetPlaceholder')} />
            </label>
          </div>
          <div className="form-actions">
            <button className="btn btn-ghost" type="button" onClick={() => setShowForm(false)}>{t('common.cancel')}</button>
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? t('common.saving') : t('goals.create')}</button>
          </div>
        </form>
      )}

      {loading ? (
        <LoadingRows label={t('goals.loading')} />
      ) : goals.length === 0 ? (
        !showForm && !error && (
          <section className="panel">
            <EmptyState
              title={t('goals.emptyTitle')}
              action={<button className="btn btn-primary" type="button" onClick={() => setShowForm(true)}><Plus aria-hidden="true" /> {t('goals.createFirst')}</button>}
            >
              {t('goals.emptyBody')}
            </EmptyState>
          </section>
        )
      ) : (
        <>
          {active.length > 0 && (
            <section className="page-section" aria-labelledby="goals-active-title">
              <h2 id="goals-active-title" className="section-title">{t('goals.inProgress')}</h2>
              <ul className="goal-list">{active.map((goal) => <GoalRow key={goal.id} goal={goal} onDelete={removeGoal} />)}</ul>
            </section>
          )}
          {reached.length > 0 && (
            <section className="page-section" aria-labelledby="goals-reached-title">
              <h2 id="goals-reached-title" className="section-title">{t('goals.reachedTitle')}</h2>
              <ul className="goal-list">{reached.map((goal) => <GoalRow key={goal.id} goal={goal} onDelete={removeGoal} />)}</ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}

export default GoalsPage
