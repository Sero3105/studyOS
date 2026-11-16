import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { ChevronRight, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet } from '../ui/field'
import { Input } from '../ui/input'
import { NativeSelect, NativeSelectOption } from '../ui/native-select'
import { Textarea } from '../ui/textarea'
import type { StudySessionConfig } from './types'
import { getActiveSubjects } from '../../services/subjectService'
import { getExams } from '../../services/examService'
import type { Exam } from '../../services/examService'
import { daysUntil } from '../../utils/dates'
import type { Subject } from '../../services/subjectService'
import { useLanguage } from '../../i18n/useLanguage'
import type { TranslationKey } from '../../i18n/translations'
import { LONG_BREAK_DEFAULTS } from '../../utils/pomodoro'
import { SESSION_KINDS } from '../../services/sessionService'
import type { SessionKind } from '../../services/sessionService'
import { CHECKLIST_MAX, parseChecklist } from '../../utils/sitting'

interface SessionSetupFormProps {
  onSubmit: (config: StudySessionConfig) => void
  onCancel?: () => void
  showCancel?: boolean
}

/**
 * Durate rapide: scorciatoie per i ritmi di studio più comuni.
 * Restano modificabili nei campi sotto; "Personalizzata" lascia scrivere.
 */
const presets: { id: string; labelKey: TranslationKey; focus: number; rest: number }[] = [
  { id: '25-5', labelKey: 'timer.preset.pomodoro', focus: 25, rest: 5 },
  { id: '50-10', labelKey: 'timer.preset.long', focus: 50, rest: 10 },
  { id: '90-15', labelKey: 'timer.preset.deep', focus: 90, rest: 15 },
]

function SessionSetupForm({
  onSubmit,
  onCancel,
  showCancel = false,
}: SessionSetupFormProps) {
  const { t } = useLanguage()
  const [focusMinutes, setFocusMinutes] = useState('25')
  const [breakMinutes, setBreakMinutes] = useState('5')
  const [longBreakMinutes, setLongBreakMinutes] = useState(String(LONG_BREAK_DEFAULTS.longBreakMinutes))
  const [blocksBeforeLongBreak, setBlocksBeforeLongBreak] = useState(String(LONG_BREAK_DEFAULTS.blocksBeforeLongBreak))
  const [goal, setGoal] = useState('')
  const [checklist, setChecklist] = useState('')
  const [kind, setKind] = useState<SessionKind>('study')
  const [subjectId, setSubjectId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [error, setError] = useState('')
  const [customOpen, setCustomOpen] = useState(false)
  const [exams, setExams] = useState<Exam[]>([])
  // Accanto alla materia, quanto manca al suo esame: aiuta a scegliere cosa studiare.
  const examHint = (subjectId: number) => {
    const days = exams.filter((e) => e.subject_id === subjectId && e.exam_date && (e.status === 'planned' || e.status === 'in_progress')).map((e) => daysUntil(e.exam_date!)).filter((d) => d >= 0).sort((a, b) => a - b)[0]
    return days === undefined ? '' : ` · ${t('timer.examIn', { days })}`
  }

  useEffect(() => {
    getActiveSubjects().then(setSubjects).catch(() => setSubjects([]))
    getExams().then(setExams).catch(() => setExams([]))
  }, [])

  const selectedSubject = subjects.find((s) => s.id === Number(subjectId))
  const selectedTopic = selectedSubject?.topics.find((t) => t.id === Number(topicId))
  const activePreset = presets.find(
    (preset) => String(preset.focus) === focusMinutes && String(preset.rest) === breakMinutes,
  )

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const durations = [focusMinutes, breakMinutes, longBreakMinutes, blocksBeforeLongBreak].map(Number)
    if (durations.some((value) => !Number.isInteger(value) || value <= 0)) {
      setError(t('timer.durationError'))
      return
    }
    const [focusDuration, breakDuration, longBreakDuration, everyBlocks] = durations

    onSubmit({
      focusMinutes: focusDuration,
      breakMinutes: breakDuration,
      longBreakMinutes: longBreakDuration,
      blocksBeforeLongBreak: everyBlocks,
      goal: goal.trim(),
      checklist: parseChecklist(checklist),
      subjectId: subjectId ? Number(subjectId) : null,
      topicId: topicId ? Number(topicId) : null,
      subject: selectedSubject?.name ?? '',
      topic: selectedTopic?.title ?? '',
      kind,
    })
  }

  const numberField = (id: string, label: string, value: string, set: (v: string) => void) => (
    <Field data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min="1"
        step="1"
        className="font-mono tabular-nums"
        value={value}
        onChange={(event) => { set(event.target.value); setError('') }}
        required
        aria-invalid={Boolean(error)}
      />
    </Field>
  )
  const optional = <span className="font-normal text-muted-foreground">{t('common.optional')}</span>

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup>
        <FieldSet>
          <FieldLegend>{t('timer.duration')}</FieldLegend>
          <div className="grid grid-cols-3 gap-2" role="group" aria-label={t('timer.duration')}>
            {presets.map((preset) => {
              const active = activePreset?.id === preset.id
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setFocusMinutes(String(preset.focus))
                    setBreakMinutes(String(preset.rest))
                    setError('')
                  }}
                  className={cn(
                    'flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50',
                    active && 'border-primary bg-primary/8 hover:bg-primary/12',
                  )}
                >
                  <span className="text-sm font-medium">{t(preset.labelKey)}</span>
                  <span className={cn('font-mono text-xs tabular-nums', active ? 'text-primary' : 'text-muted-foreground')}>{preset.focus} + {preset.rest} min</span>
                </button>
              )
            })}
          </div>
          <Collapsible open={customOpen || Boolean(error)} onOpenChange={setCustomOpen}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
                <ChevronRight data-icon="inline-start" className={cn('transition-transform', (customOpen || error) && 'rotate-90')} aria-hidden="true" />
                {t('timer.customize')}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="grid gap-4 pt-3 sm:grid-cols-2">
              {numberField('focus-minutes', t('timer.focusMinutes'), focusMinutes, setFocusMinutes)}
              {numberField('break-minutes', t('timer.breakMinutes'), breakMinutes, setBreakMinutes)}
              {numberField('long-break-minutes', t('timer.longBreakMinutes'), longBreakMinutes, setLongBreakMinutes)}
              {numberField('blocks-before-long', t('timer.blocksBeforeLongBreak'), blocksBeforeLongBreak, setBlocksBeforeLongBreak)}
            </CollapsibleContent>
          </Collapsible>
          {error && <FieldError>{error}</FieldError>}
        </FieldSet>

        <FieldSeparator />

        <FieldSet>
          <FieldLegend>{t('timer.whatYouStudy')}</FieldLegend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="setup-subject">{t('timer.subject')} {optional}</FieldLabel>
              <NativeSelect id="setup-subject" className="w-full" value={subjectId} onChange={(event) => { setSubjectId(event.target.value); setTopicId('') }}>
                <NativeSelectOption value="">{t('common.noneFeminine')}</NativeSelectOption>
                {subjects.map((s) => <NativeSelectOption key={s.id} value={s.id}>{s.name}{examHint(s.id)}</NativeSelectOption>)}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="setup-topic">{t('timer.topic')} {optional}</FieldLabel>
              <NativeSelect id="setup-topic" className="w-full" value={topicId} onChange={(event) => setTopicId(event.target.value)} disabled={!selectedSubject || selectedSubject.topics.length === 0}>
                <NativeSelectOption value="">{t('common.noneMasculine')}</NativeSelectOption>
                {selectedSubject?.topics.map((t) => <NativeSelectOption key={t.id} value={t.id}>{t.title}</NativeSelectOption>)}
              </NativeSelect>
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="setup-kind">{t('session.kind')}</FieldLabel>
            <NativeSelect id="setup-kind" className="w-full" value={kind} onChange={(event) => setKind(event.target.value as SessionKind)}>
              {SESSION_KINDS.map((value) => <NativeSelectOption key={value} value={value}>{t(`session.kind.${value}`)}</NativeSelectOption>)}
            </NativeSelect>
          </Field>
        </FieldSet>

        <FieldSeparator />

        <FieldSet>
          <FieldLegend>{t('sitting.plan')}</FieldLegend>
          <Field>
            <FieldLabel htmlFor="setup-goal">{t('sitting.goal')} {optional}</FieldLabel>
            <Input id="setup-goal" value={goal} maxLength={500} onChange={(event) => setGoal(event.target.value)} placeholder={t('sitting.goalPlaceholder')} />
          </Field>
          <Field>
            <FieldLabel htmlFor="setup-checklist">{t('sitting.checklist')} {optional}</FieldLabel>
            <Textarea
              id="setup-checklist"
              value={checklist}
              onChange={(event) => setChecklist(event.target.value)}
              placeholder={t('sitting.checklistPlaceholder')}
              rows={3}
            />
            <FieldDescription>{t('sitting.checklistHint', { max: CHECKLIST_MAX })}</FieldDescription>
          </Field>
        </FieldSet>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {showCancel && onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              {t('common.cancel')}
            </Button>
          )}
          <Button size="lg" type="submit">
            <Play data-icon="inline-start" aria-hidden="true" />
            {t('timer.startSession')}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}

export default SessionSetupForm
