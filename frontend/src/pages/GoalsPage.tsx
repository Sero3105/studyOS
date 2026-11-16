import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import PageHeader from '../components/ui/PageHeader'
import Modal from '../components/ui/Modal'
import { Button } from '../components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Field, FieldGroup, FieldLabel } from '../components/ui/field'
import { Input } from '../components/ui/input'
import { NativeSelect, NativeSelectOption } from '../components/ui/native-select'
import { Spinner } from '../components/ui/spinner'
import ProgressBar from '../components/ui/ProgressBar'
import ConfirmButton from '../components/ui/ConfirmButton'
import { EmptyState, ErrorNotice, LoadingRows } from '../components/ui/Feedback'
import { createGoal, deleteGoal, getGoals } from '../services/goalService'
import { useLanguage } from '../i18n/useLanguage'
import type { TranslationKey } from '../i18n/translations'
import type { Goal, GoalKind } from '../services/goalService'
import { errorMessage } from '../utils/errors'
import { getActiveSubjects, getSubjects } from '../services/subjectService'
import type { Subject } from '../services/subjectService'
import SubjectDot from '../components/ui/SubjectDot'
import { formatDay, relativeDay, todayIso } from '../utils/dates'
import DatePicker from '../components/ui/DatePicker'

/** Unità di misura di ogni tipo di obiettivo, per i campi e per le righe. */
const goalKindKeys: Record<GoalKind, TranslationKey> = {
  weekly_minutes: 'goal.kind.weekly_minutes', total_minutes: 'goal.kind.total_minutes', tasks_done: 'goal.kind.tasks_done', topics_done: 'goal.kind.topics_done', sessions_count: 'goal.kind.sessions_count',
}
const goalUnitKeys: Record<GoalKind, TranslationKey> = {
  weekly_minutes: 'goals.unit.weekly_minutes', total_minutes: 'goals.unit.total_minutes', tasks_done: 'goals.unit.tasks_done', topics_done: 'goals.unit.topics_done', sessions_count: 'goals.unit.sessions_count',
}

function GoalRow({ goal, subject, onDelete }: { goal: Goal; subject?: Subject; onDelete: (id: number) => Promise<void> }) {
  const { t, locale } = useLanguage()
  const remaining = Math.max(0, goal.target - goal.current)
  const reached = goal.percent >= 100
  return (
    <li>
      <Card className={cn('h-full', reached && 'ring-success/30')}>
        <CardHeader>
          <CardTitle><h3 className="break-words">{goal.title}</h3></CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-x-1.5 text-xs">
            {subject && <><SubjectDot subject={subject} />{subject.name} ·</>}
            {t(goalKindKeys[goal.kind])}
            {goal.deadline && <span title={relativeDay(goal.deadline, locale)}> · {t('goals.deadlineMeta', { when: formatDay(goal.deadline, 'short', locale) })}</span>}
          </CardDescription>
          <CardAction><ConfirmButton label={t('goals.deleteLabel', { title: goal.title })} onConfirm={() => onDelete(goal.id)} /></CardAction>
        </CardHeader>
        <CardContent className="mt-auto flex flex-col gap-3">
          <span className={cn('font-mono text-4xl font-semibold tracking-tighter tabular-nums', reached ? 'text-success' : 'text-foreground')} aria-hidden="true">
            {Math.min(goal.percent, 100)}<span className="text-lg text-muted-foreground">%</span>
          </span>
          <ProgressBar percent={goal.percent} label={`${goal.title}: ${goal.percent}%`} />
          <p className="font-mono text-xs text-muted-foreground tabular-nums">
            {t('goals.ofTarget', { current: goal.current, target: goal.target, unit: t(goalUnitKeys[goal.kind]) })}
            {reached ? t('goals.reachedSuffix') : t('goals.remainingSuffix', { remaining })}
          </p>
        </CardContent>
      </Card>
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
  const [subjectId, setSubjectId] = useState('')
  const [deadline, setDeadline] = useState('')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [saving, setSaving] = useState(false)

  const load = useCallback(async (): Promise<void> => {
    try { setError(''); setGoals(await getGoals()) }
    catch (e) { setError(errorMessage(e, t('goals.loadError'))) }
    finally { setLoading(false) }
  }, [t])
  useEffect(() => { queueMicrotask(() => { void load() }) }, [load])
  // Materie solo per il filtro e i nomi: se non arrivano, gli obiettivi restano globali.
  useEffect(() => { getSubjects().then(setSubjects).catch(() => setSubjects([])) }, [])
  // Nel modulo solo le materie non archiviate (esame non ancora superato).
  const [activeSubjects, setActiveSubjects] = useState<Subject[]>([])
  useEffect(() => { getActiveSubjects().then(setActiveSubjects).catch(() => setActiveSubjects([])) }, [])

  const addGoal = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      const created = await createGoal({
        title: title.trim(), kind, target: Number(target),
        subject_id: subjectId ? Number(subjectId) : undefined, deadline: deadline || undefined,
      })
      setGoals((g) => [...g, created])
      setTitle(''); setTarget(''); setSubjectId(''); setDeadline(''); setShowForm(false)
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

  const newButton = (label: string) => (
    <Button onClick={() => setShowForm(true)}>
      <Plus data-icon="inline-start" aria-hidden="true" /> {label}
    </Button>
  )
  const optional = <span className="font-normal text-muted-foreground">{t('common.optional')}</span>
  const list = (id: string, title: string, items: Goal[]) => (
    <section className="flex flex-col gap-3" aria-labelledby={id}>
      <h2 id={id} className="font-mono text-xs tracking-wider text-muted-foreground uppercase">{title}</h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((goal) => <GoalRow key={goal.id} goal={goal} subject={subjects.find((s) => s.id === goal.subject_id)} onDelete={removeGoal} />)}</ul>
    </section>
  )

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={t('goals.title')}
        description={
          goals.length
            ? t('goals.descriptionWith', { active: active.length, reached: reached.length, reachedLabel: reached.length === 1 ? t('goals.reachedOne') : t('goals.reachedMany') })
            : t('goals.descriptionEmpty')
        }
        actions={newButton(t('goals.newGoal'))}
      />

      {error && <ErrorNotice message={error} onRetry={goals.length ? undefined : () => void load()} onDismiss={goals.length ? () => setError('') : undefined} />}

      {showForm && (
        <Modal title={t('goals.newGoal')} onClose={() => setShowForm(false)}>
          <form onSubmit={addGoal}>
            <FieldGroup className="gap-5">
              <Field>
                <FieldLabel htmlFor="goal-title">{t('goals.name')}</FieldLabel>
                <Input id="goal-title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} placeholder={t('goals.namePlaceholder')} autoFocus />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="goal-kind">{t('goals.measures')}</FieldLabel>
                  <NativeSelect id="goal-kind" className="w-full" value={kind} onChange={(e) => setKind(e.target.value as GoalKind)}>
                    {(Object.keys(goalKindKeys) as GoalKind[]).map((v) => <NativeSelectOption key={v} value={v}>{t(goalKindKeys[v])}</NativeSelectOption>)}
                  </NativeSelect>
                </Field>
                <Field>
                  <FieldLabel htmlFor="goal-target">{t('goals.target', { unit: t(goalUnitKeys[kind]) })}</FieldLabel>
                  <Input id="goal-target" className="font-mono" type="number" inputMode="numeric" min="1" step="1" value={target} onChange={(e) => setTarget(e.target.value)} required placeholder={t('goals.targetPlaceholder')} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="goal-subject">{t('planner.subject')} {optional}</FieldLabel>
                  <NativeSelect id="goal-subject" className="w-full" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                    <NativeSelectOption value="">{t('goals.allSubjects')}</NativeSelectOption>
                    {activeSubjects.map((s) => <NativeSelectOption key={s.id} value={s.id}>{s.name}</NativeSelectOption>)}
                  </NativeSelect>
                </Field>
                <Field>
                  <FieldLabel htmlFor="goal-deadline">{t('goals.deadline')} {optional}</FieldLabel>
                  <DatePicker id="goal-deadline" value={deadline} onChange={setDeadline} min={todayIso()} aria-label={t('goals.deadline')} />
                </Field>
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
                <Button type="submit" disabled={saving}>{saving && <Spinner data-icon="inline-start" />}{saving ? t('common.saving') : t('goals.create')}</Button>
              </div>
            </FieldGroup>
          </form>
        </Modal>
      )}

      {loading ? (
        <LoadingRows label={t('goals.loading')} />
      ) : goals.length === 0 ? (
        !error && (
          <EmptyState title={t('goals.emptyTitle')} action={newButton(t('goals.createFirst'))}>
            {t('goals.emptyBody')}
          </EmptyState>
        )
      ) : (
        <>
          {active.length > 0 && list('goals-active-title', t('goals.inProgress'), active)}
          {reached.length > 0 && list('goals-reached-title', t('goals.reachedTitle'), reached)}
        </>
      )}
    </div>
  )
}

export default GoalsPage
