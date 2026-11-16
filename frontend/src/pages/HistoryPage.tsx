import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronDown, Circle, Pencil, Play, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import PageHeader from '../components/ui/PageHeader'
import Modal from '../components/ui/Modal'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible'
import { Field, FieldError, FieldGroup, FieldLabel } from '../components/ui/field'
import { Input } from '../components/ui/input'
import { NativeSelect, NativeSelectOption } from '../components/ui/native-select'
import { Spinner } from '../components/ui/spinner'
import DeleteButton from '../components/ui/DeleteButton'
import { useUndo } from '../context/undoContext'
import { EmptyState, ErrorNotice, LoadingRows } from '../components/ui/Feedback'
import { createSession, deleteSession, getSessions, getSittings, SESSION_KINDS, updateSession } from '../services/sessionService'
import type { CreateSessionPayload, SessionKind, StudySession } from '../services/sessionService'
import { getSubjects } from '../services/subjectService'
import type { Subject } from '../services/subjectService'
import { daysUntil, formatDay, formatMinutes, relativeDay, todayIso } from '../utils/dates'
import { errorMessage } from '../utils/errors'
import { useLanguage } from '../i18n/useLanguage'
import DatePicker from '../components/ui/DatePicker'
import { groupBySitting, hasDetails } from '../utils/sitting'
import type { SavedSitting } from '../utils/sitting'

/** Sessione inserita o corretta a mano: studio senza timer (lezione, biblioteca) o blocco registrato male. */
function SessionForm({ subjects, initial, onSave, onCancel }: {
  subjects: Subject[]
  initial?: StudySession
  onSave: (payload: CreateSessionPayload) => Promise<void>
  onCancel: () => void
}) {
  const { t } = useLanguage()
  const [studiedOn, setStudiedOn] = useState(initial?.studied_on ?? todayIso())
  const [minutes, setMinutes] = useState(String(initial?.duration_minutes ?? 60))
  const [subjectId, setSubjectId] = useState(String(initial?.subject_id ?? ''))
  const [topicId, setTopicId] = useState(String(initial?.topic_id ?? ''))
  const [notes, setNotes] = useState(initial?.notes ?? '')
  // Una sessione aggiunta a mano è spesso una lezione: è il default solo per quelle nuove.
  const [kind, setKind] = useState<SessionKind>(initial?.kind ?? 'lesson')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const subject = subjects.find((s) => s.id === Number(subjectId))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const duration = Number(minutes)
    if (!Number.isInteger(duration) || duration <= 0 || duration > 1440 || !studiedOn) { setError(t('history.formError')); return }
    setBusy(true); setError('')
    try {
      await onSave({
        studied_on: studiedOn,
        duration_minutes: duration,
        subject_id: subjectId ? Number(subjectId) : null,
        topic_id: topicId ? Number(topicId) : null,
        notes: notes.trim() || null,
        kind,
      })
    } catch (e) { setError(errorMessage(e, t('history.saveError'))); setBusy(false) }
  }

  const optional = <span className="font-normal text-muted-foreground">{t('common.optional')}</span>
  return (
    <form onSubmit={(e) => void submit(e)} noValidate>
      <FieldGroup className="gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="session-date">{t('history.date')}</FieldLabel>
            <DatePicker id="session-date" required max={todayIso()} value={studiedOn} onChange={setStudiedOn} aria-label={t('history.date')} />
          </Field>
          <Field data-invalid={Boolean(error) || undefined}>
            <FieldLabel htmlFor="session-minutes">{t('history.minutes')}</FieldLabel>
            <Input id="session-minutes" className="font-mono" type="number" inputMode="numeric" min="1" max="1440" step="1" required value={minutes} onChange={(e) => setMinutes(e.target.value)} aria-invalid={Boolean(error)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="session-kind">{t('session.kind')}</FieldLabel>
            <NativeSelect id="session-kind" className="w-full" value={kind} onChange={(e) => setKind(e.target.value as SessionKind)}>
              {SESSION_KINDS.map((value) => <NativeSelectOption key={value} value={value}>{t(`session.kind.${value}`)}</NativeSelectOption>)}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="session-subject">{t('timer.subject')} {optional}</FieldLabel>
            <NativeSelect id="session-subject" className="w-full" value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setTopicId('') }}>
              <NativeSelectOption value="">{t('common.noneFeminine')}</NativeSelectOption>
              {subjects.map((s) => <NativeSelectOption key={s.id} value={s.id}>{s.name}</NativeSelectOption>)}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="session-topic">{t('timer.topic')} {optional}</FieldLabel>
            <NativeSelect id="session-topic" className="w-full" value={topicId} onChange={(e) => setTopicId(e.target.value)} disabled={!subject?.topics.length}>
              <NativeSelectOption value="">{t('common.noneMasculine')}</NativeSelectOption>
              {subject?.topics.map((topic) => <NativeSelectOption key={topic.id} value={topic.id}>{topic.title}</NativeSelectOption>)}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="session-note">{t('timer.note')} {optional}</FieldLabel>
            <Input id="session-note" value={notes} maxLength={2000} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
        {error && <FieldError>{error}</FieldError>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onCancel}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={busy}>{busy && <Spinner data-icon="inline-start" />}{busy ? t('common.saving') : t('history.save')}</Button>
        </div>
      </FieldGroup>
    </form>
  )
}

/**
 * Storico: sessioni raggruppate per giorno, dal più recente, con il totale
 * di ogni giorno sulla stessa riga della data. Il filtro per materia
 * ricalcola sia i gruppi sia i totali. I blocchi della stessa seduta al timer stanno
 * in una voce sola, che si apre su obiettivo, checklist, distrazioni e blocchi.
 */
function HistoryPage() {
  const { t, locale } = useLanguage()
  const { undoable } = useUndo()
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [sittings, setSittings] = useState<Map<string, SavedSitting>>(new Map())
  const [openSitting, setOpenSitting] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const load = useCallback(async (): Promise<void> => {
    try {
      setError('')
      // Le sedute arricchiscono lo storico: se non arrivano, restano i blocchi.
      const [sessionList, subjectList, sittingList] = await Promise.all([getSessions(), getSubjects(), getSittings().catch(() => [])])
      setSessions(sessionList); setSubjects(subjectList); setSittings(new Map(sittingList.map((x) => [x.uid, x])))
    } catch (e) { setError(errorMessage(e, t('history.loadError'))) }
    finally { setLoading(false) }
  }, [t])
  useEffect(() => { queueMicrotask(() => { void load() }) }, [load])

  const remove = (session: StudySession) => {
    setSessions((s) => s.filter((x) => x.id !== session.id))
    undoable(t('history.deleted', { minutes: formatMinutes(session.duration_minutes) }), () => deleteSession(session.id), () => setSessions((s) => [...s, session]))
  }

  const add = async (payload: CreateSessionPayload) => {
    const created = await createSession(payload)
    setSessions((s) => [...s, created]); setAdding(false)
  }

  const save = async (id: number, payload: CreateSessionPayload) => {
    const updated = await updateSession(id, payload)
    setSessions((s) => s.map((x) => (x.id === id ? updated : x))); setEditingId(null)
  }

  const subjectName = (id: number | null) => subjects.find((s) => s.id === id)?.name ?? t('history.freeSession')
  const blockMeta = (session: StudySession) => [
    session.kind !== 'study' && t(`session.kind.${session.kind}`),
    session.partial && t('sitting.partial'),
    session.focus && t(`session.focus.${session.focus}`),
    session.interruptions && t('history.interruptions', { count: session.interruptions }),
    session.notes,
  ].filter(Boolean).join(' · ')
  const topicName = (session: StudySession) =>
    subjects.find((s) => s.id === session.subject_id)?.topics.find((t) => t.id === session.topic_id)?.title

  const duration = (minutes: number) => <span className="w-16 shrink-0 font-mono text-sm font-medium text-primary tabular-nums">{formatMinutes(minutes)}</span>

  const sessionRow = (session: StudySession) => {
    const topic = topicName(session)
    if (editingId === session.id) {
      return (
        <li className="bg-muted/30 px-4 py-4 md:px-5" key={session.id}>
          <SessionForm subjects={subjects} initial={session} onSave={(payload) => save(session.id, payload)} onCancel={() => setEditingId(null)} />
        </li>
      )
    }
    const meta = blockMeta(session)
    return (
      <li className="group/session flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40 md:px-5" key={session.id}>
        {duration(session.duration_minutes)}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-medium">{subjectName(session.subject_id)}{topic ? ` / ${topic}` : ''}</span>
          {meta && <span className="line-clamp-2 text-xs text-muted-foreground">{meta}</span>}
        </span>
        <span className="flex items-center gap-0.5 md:opacity-0 md:transition-opacity md:group-focus-within/session:opacity-100 md:group-hover/session:opacity-100">
          <Button variant="ghost" size="icon-sm" onClick={() => setEditingId(session.id)} aria-label={t('history.editSession')} title={t('history.editSession')}>
            <Pencil aria-hidden="true" />
          </Button>
          <DeleteButton label={t('history.deleteSession')} onDelete={() => remove(session)} />
        </span>
      </li>
    )
  }

  const sittingRow = (uid: string, group: StudySession[]) => {
    // Dentro la seduta i blocchi vanno nell'ordine in cui sono stati fatti.
    const blocks = [...group].sort((a, b) => a.id - b.id)
    const sitting = sittings.get(uid)
    const first = blocks[0]
    const topic = topicName(first)
    const open = openSitting === uid
    const done = sitting?.checklist.filter((i) => i.done).length ?? 0
    const meta = [
      t('history.blocks', { count: blocks.length }),
      sitting?.goal,
      sitting?.checklist.length && t('sitting.progress', { done, total: sitting.checklist.length }),
      sitting?.distractions.length && t('history.interruptions', { count: sitting.distractions.length }),
    ].filter(Boolean).join(' · ')
    return (
      <li key={`sitting-${uid}`}>
        <Collapsible open={open} onOpenChange={(next) => setOpenSitting(next ? uid : null)}>
          <div className="flex items-center gap-3 px-4 py-3 md:px-5">
            {duration(blocks.reduce((sum, b) => sum + b.duration_minutes, 0))}
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-sm font-medium">{subjectName(first.subject_id)}{topic ? ` / ${topic}` : ''}</span>
              <span className="line-clamp-2 text-xs text-muted-foreground">{meta}</span>
            </span>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={t('history.sittingDetails')} title={t('history.sittingDetails')}>
                <ChevronDown className={cn('transition-transform', open && 'rotate-180')} aria-hidden="true" />
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="border-t border-dashed bg-muted/20">
            <div className="flex flex-col gap-2 px-4 pt-3 pl-[5.75rem] text-sm empty:hidden md:px-5 md:pl-[6.25rem]">
              {sitting && sitting.checklist.length > 0 && (
                <ul className="flex flex-col gap-1" aria-label={t('sitting.checklist')}>
                  {sitting.checklist.map((item, i) => (
                    <li key={i} className={cn('flex items-start gap-2', !item.done && 'text-muted-foreground')}>
                      {item.done ? <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" /> : <Circle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
                      <span className="sr-only">{item.done ? t('history.itemDone') : t('history.itemOpen')}</span>
                      {item.text}
                    </li>
                  ))}
                </ul>
              )}
              {sitting?.resume_note && <p><strong className="font-medium">{t('sitting.resume')}:</strong> <span className="text-muted-foreground">{sitting.resume_note}</span></p>}
              {sitting && sitting.distractions.length > 0 && (
                <p><strong className="font-medium">{t('sitting.distractionsTitle')}:</strong> <span className="text-muted-foreground">{sitting.distractions.map((d) => d.text).join(' · ')}</span></p>
              )}
            </div>
            <ul className="flex flex-col">{blocks.map(sessionRow)}</ul>
          </CollapsibleContent>
        </Collapsible>
      </li>
    )
  }

  const filtered = sessions
    .filter((s) => subjectFilter === 'all' || (subjectFilter === 'none' ? s.subject_id === null : s.subject_id === Number(subjectFilter)))
    .sort((a, b) => b.studied_on.localeCompare(a.studied_on) || b.id - a.id)
  const total = filtered.reduce((sum, s) => sum + s.duration_minutes, 0)
  const days = [...new Set(filtered.map((s) => s.studied_on))]

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={t('history.title')}
        description={
          sessions.length
            ? t('history.descriptionWith', { count: filtered.length, countLabel: filtered.length === 1 ? t('history.sessionOne') : t('history.sessionMany'), total: formatMinutes(total), days: days.length, daysLabel: days.length === 1 ? t('history.dayOne') : t('history.dayMany') })
            : t('history.descriptionEmpty')
        }
        actions={
          <>
            {sessions.length > 0 && (
              <NativeSelect className="w-48" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} aria-label={t('history.filterBySubject')}>
                <NativeSelectOption value="all">{t('history.allSubjects')}</NativeSelectOption>
                {subjects.map((s) => <NativeSelectOption key={s.id} value={s.id}>{s.name}</NativeSelectOption>)}
                <NativeSelectOption value="none">{t('history.freeSessions')}</NativeSelectOption>
              </NativeSelect>
            )}
            <Button onClick={() => setAdding(true)}>
              <Plus data-icon="inline-start" aria-hidden="true" /> {t('history.addSession')}
            </Button>
          </>
        }
      />

      {adding && (
        <Modal wide title={t('history.addTitle')} description={t('history.addHint')} onClose={() => setAdding(false)}>
          <SessionForm subjects={subjects} onSave={add} onCancel={() => setAdding(false)} />
        </Modal>
      )}

      {error && <ErrorNotice message={error} onRetry={sessions.length ? undefined : () => void load()} onDismiss={sessions.length ? () => setError('') : undefined} />}

      {loading ? (
        <LoadingRows rows={5} label={t('history.loading')} />
      ) : sessions.length === 0 ? (
        !error && (
          <EmptyState
            title={t('history.emptyTitle')}
            action={<Button asChild><Link to="/timer"><Play data-icon="inline-start" aria-hidden="true" /> {t('history.startTimer')}</Link></Button>}
          >
            {t('history.emptyBody')}
          </EmptyState>
        )
      ) : filtered.length === 0 ? (
        <EmptyState title={t('history.noForSubjectTitle')}>{t('history.noForSubjectBody')}</EmptyState>
      ) : (
        <Card className="gap-0 py-0">
          <ol>
            {days.map((day) => {
              const daySessions = filtered.filter((s) => s.studied_on === day)
              const dayTotal = daySessions.reduce((sum, s) => sum + s.duration_minutes, 0)
              const relative = relativeDay(day, locale)
              return (
                <li className="border-b last:border-b-0" key={day}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2 bg-muted/30 px-4 py-2.5 md:px-5">
                    <h2 className="flex items-baseline gap-2 text-sm font-medium first-letter:uppercase">
                      {formatDay(day, 'full', locale)}
                      {(daysUntil(day) === 0 || daysUntil(day) === -1) && <Badge variant="accent">{relative}</Badge>}
                    </h2>
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">
                      {formatMinutes(dayTotal)} · {daySessions.length} {daySessions.length === 1 ? t('history.sessionOne') : t('history.sessionMany')}
                    </span>
                  </div>
                  <ul className="flex flex-col divide-y">
                    {groupBySitting(daySessions, (uid) => hasDetails(sittings.get(uid))).map((entry) =>
                      entry.kind === 'session' ? sessionRow(entry.session) : sittingRow(entry.uid, entry.sessions))}
                  </ul>
                </li>
              )
            })}
          </ol>
        </Card>
      )}
    </div>
  )
}

export default HistoryPage
