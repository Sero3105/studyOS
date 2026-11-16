import { useEffect, useState } from 'react'
import { CalendarPlus, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import DatePicker from '../ui/DatePicker'
import Segmented from '../ui/Segmented'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible'
import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from '../ui/field'
import { Input } from '../ui/input'
import { NativeSelect, NativeSelectOption } from '../ui/native-select'
import { Switch } from '../ui/switch'
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group'
import { getPlanAdvice } from '../../services/examService'
import type { DatedExam, PlanAdvice, PlanRequest } from '../../services/examService'
import { addDays, formatDay, todayIso, weekdayShort } from '../../utils/dates'
import { planPrefs, restDays, setPlanPrefs, setRestDays } from '../../utils/preferences'
import type { PlanPrefs } from '../../utils/preferences'
import { useLanguage } from '../../i18n/useLanguage'

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7]
const MONDAY = '2026-11-02'
const hours = (minutes: number) => (minutes / 60).toLocaleString(undefined, { maximumFractionDigits: 1 })

/** Preferenze dello studente → richiesta per il backend. */
function toRequest(prefs: PlanPrefs, rest: number[], start?: string): PlanRequest {
  return {
    rest_days: rest,
    start_date: start,
    days_off: prefs.daysOff,
    limit_unit: prefs.limitUnit === 'hours' ? 'hours' : 'tasks',
    limit_value: prefs.limitUnit === 'auto' ? null : prefs.limitValue,
    reviews: prefs.reviews,
    final_days: prefs.finalDays || null,
    rest_before_exam: prefs.restBeforeExam,
    order: prefs.order,
    study_minutes: prefs.studyMinutes,
  }
}

/**
 * Piano d'esame guidato dalle preferenze: lo studente sceglie da quando partire, giorni senza studio,
 * giorni liberi, limite giornaliero (attività o ore), intensità dei ripassi, giorni di ripasso finale,
 * ordine e durata dello studio. Data ideale e data limite si ricalcolano a ogni scelta.
 * Le preferenze restano salvate per i piani successivi; `topicsKey` cambia con argomenti, stato e difficoltà.
 */
function PlanStarter({ exam, topicsKey, onPlan }: { exam: DatedExam; topicsKey: string; onPlan: (exam: DatedExam, request: PlanRequest) => void }) {
  const { t, locale } = useLanguage()
  const [prefs, setPrefsState] = useState<PlanPrefs>(planPrefs)
  const [rest, setRestState] = useState<number[]>(restDays)
  const [advice, setAdvice] = useState<PlanAdvice | null>(null)
  const [start, setStart] = useState('')
  const [dayOff, setDayOff] = useState('')
  const today = todayIso()
  const lastDay = addDays(exam.exam_date, -1)
  const request = toRequest(prefs, rest)
  const requestKey = JSON.stringify(request)

  const update = (patch: Partial<PlanPrefs>) => { const next = { ...prefs, ...patch }; setPrefsState(next); setPlanPrefs(next) }
  const updateRest = (days: number[]) => { const next = [...days].sort(); setRestState(next); setRestDays(next) }

  useEffect(() => {
    let active = true
    getPlanAdvice(exam.id, JSON.parse(requestKey) as PlanRequest).then((a) => {
      if (!active) return
      setAdvice(a)
      // Proposta: la data ideale se è ancora davanti, altrimenti domani (finché lo studente non sceglie).
      setStart((current) => current || (a.ideal_start > today ? a.ideal_start : addDays(today, 1) <= lastDay ? addDays(today, 1) : today))
    }).catch(() => { if (active) setAdvice(null) })
    return () => { active = false }
  }, [exam.id, exam.exam_date, topicsKey, requestKey, today, lastDay])

  const chosen = start || addDays(today, 1)
  const status = !advice ? null : chosen > advice.latest_start ? 'late' : chosen > advice.ideal_start ? 'behind' : 'ontime'
  const tone = { late: 'text-destructive', behind: 'text-warning', ontime: 'text-success' } as const
  const workload = advice && (prefs.limitUnit === 'hours'
    ? t('plan.workloadHours', { hours: hours(advice.full_minutes) })
    : t('plan.workloadItems', { items: advice.full_items }))
  const choice = 'data-[state=on]:bg-primary/10 data-[state=on]:text-primary'

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-primary/25 bg-primary/5 p-4">
      {advice && (
        <>
          <dl className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">{t('plan.idealStart')}</dt>
              <dd className="text-sm font-medium first-letter:uppercase">{formatDay(advice.ideal_start, 'long', locale)}</dd>
              <dd className="text-xs text-muted-foreground">{t('plan.idealDetail', { days: advice.ideal_days })} · {workload}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">{t('plan.latestStart')}</dt>
              <dd className="text-sm font-medium first-letter:uppercase">{formatDay(advice.latest_start, 'long', locale)}</dd>
              <dd className="text-xs text-muted-foreground">{t('plan.latestDetail', { days: advice.min_days })}</dd>
            </div>
          </dl>
          {status && <p className={cn('text-xs font-medium', tone[status])} role="status">{t(`plan.status.${status}`)}</p>}
        </>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field className="sm:max-w-56">
          <FieldLabel htmlFor={`plan-start-${exam.id}`}>{t('plan.startFrom')}</FieldLabel>
          <DatePicker id={`plan-start-${exam.id}`} required min={today} max={lastDay} value={start} onChange={setStart} aria-label={t('plan.startFrom')} />
        </Field>
        <Button onClick={() => onPlan(exam, toRequest(prefs, rest, chosen))}>
          <CalendarPlus data-icon="inline-start" aria-hidden="true" />{t('exams.planTitle')}
        </Button>
      </div>

      <Collapsible defaultOpen>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="group/prefs -ml-2 text-muted-foreground">
            <ChevronRight data-icon="inline-start" className="transition-transform group-data-[state=open]/prefs:rotate-90" aria-hidden="true" />
            {t('plan.prefs')}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="grid gap-5 pt-3 sm:grid-cols-2">
          <FieldSet className="gap-2 sm:col-span-2">
            <FieldLegend variant="label">{t('plan.restDays')}</FieldLegend>
            <ToggleGroup type="multiple" variant="outline" spacing={0} value={rest.map(String)} onValueChange={(v) => updateRest(v.map(Number))} className="w-full max-w-md [&>*]:flex-1 [&>*]:px-0">
              {WEEKDAYS.map((d) => <ToggleGroupItem key={d} value={String(d)} className={choice}>{weekdayShort(addDays(MONDAY, d - 1), locale)}</ToggleGroupItem>)}
            </ToggleGroup>
          </FieldSet>

          <Field className="sm:col-span-2">
            <FieldLabel htmlFor={`plan-dayoff-${exam.id}`}>{t('plan.daysOff')}</FieldLabel>
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-48">
                <DatePicker id={`plan-dayoff-${exam.id}`} min={today} max={lastDay} value={dayOff} placeholder={t('plan.addDayOff')}
                  onChange={(day) => { if (day && !prefs.daysOff.includes(day)) update({ daysOff: [...prefs.daysOff, day].sort() }); setDayOff('') }} />
              </div>
              {prefs.daysOff.filter((d) => d >= today).map((d) => (
                <Badge key={d} variant="secondary" className="h-7 gap-1 pr-1">
                  {formatDay(d, 'short', locale)}
                  <button type="button" className="rounded-sm p-0.5 hover:bg-background/50" onClick={() => update({ daysOff: prefs.daysOff.filter((x) => x !== d) })} aria-label={t('plan.removeDayOff', { day: formatDay(d, 'long', locale) })}>
                    <X className="size-3" aria-hidden="true" />
                  </button>
                </Badge>
              ))}
            </div>
          </Field>

          <Field>
            <FieldLabel>{t('plan.limit')}</FieldLabel>
            <div className="flex flex-wrap items-center gap-2">
              <Segmented label={t('plan.limit')} value={prefs.limitUnit} onChange={(limitUnit) => update({ limitUnit, limitValue: limitUnit === 'hours' ? 2 : limitUnit === 'tasks' ? 4 : prefs.limitValue })}
                options={[{ value: 'auto', label: t('plan.limitAuto') }, { value: 'tasks', label: t('plan.limitTasks') }, { value: 'hours', label: t('plan.limitHours') }]} />
              {prefs.limitUnit !== 'auto' && (
                <Input className="w-20 font-mono" type="number" inputMode="decimal" min={prefs.limitUnit === 'hours' ? 0.5 : 1} max={prefs.limitUnit === 'hours' ? 12 : 20} step={prefs.limitUnit === 'hours' ? 0.5 : 1}
                  value={prefs.limitValue} onChange={(e) => { const v = Number(e.target.value); if (v > 0) update({ limitValue: v }) }}
                  aria-label={prefs.limitUnit === 'hours' ? t('plan.limitHoursLabel') : t('plan.limitTasksLabel')} />
              )}
            </div>
            <FieldDescription>{prefs.limitUnit === 'auto' ? t('plan.limitAutoHint') : t('plan.limitHint')}</FieldDescription>
          </Field>

          <Field>
            <FieldLabel>{t('plan.reviews')}</FieldLabel>
            <Segmented label={t('plan.reviews')} value={prefs.reviews} onChange={(reviews) => update({ reviews })}
              options={[{ value: 'light', label: t('plan.reviewsLight') }, { value: 'standard', label: t('plan.reviewsStandard') }, { value: 'intense', label: t('plan.reviewsIntense') }]} />
            <FieldDescription>{t('plan.reviewsHint')}</FieldDescription>
          </Field>

          <Field>
            <FieldLabel>{t('plan.studyMinutes')}</FieldLabel>
            <Segmented label={t('plan.studyMinutes')} value={String(prefs.studyMinutes) as '25' | '50' | '90'} onChange={(v) => update({ studyMinutes: Number(v) as 25 | 50 | 90 })}
              options={[{ value: '25', label: '25 min' }, { value: '50', label: '50 min' }, { value: '90', label: '90 min' }]} />
          </Field>

          <Field>
            <FieldLabel>{t('plan.order')}</FieldLabel>
            <Segmented label={t('plan.order')} value={prefs.order} onChange={(order) => update({ order })}
              options={[{ value: 'course', label: t('plan.orderCourse') }, { value: 'hardest', label: t('plan.orderHardest') }]} />
          </Field>

          <Field>
            <FieldLabel htmlFor={`plan-final-${exam.id}`}>{t('plan.finalDays')}</FieldLabel>
            <NativeSelect id={`plan-final-${exam.id}`} className="w-40" value={prefs.finalDays} onChange={(e) => update({ finalDays: Number(e.target.value) })}>
              <NativeSelectOption value={0}>{t('plan.limitAuto')}</NativeSelectOption>
              {[1, 2, 3, 4, 5, 7, 10].map((d) => <NativeSelectOption key={d} value={d}>{t('plan.finalDaysN', { days: d })}</NativeSelectOption>)}
            </NativeSelect>
          </Field>

          <Field orientation="horizontal" className="justify-between self-end rounded-lg border p-3">
            <FieldLabel htmlFor={`plan-rest-before-${exam.id}`} className="font-normal">{t('plan.restBeforeExam')}</FieldLabel>
            <Switch id={`plan-rest-before-${exam.id}`} checked={prefs.restBeforeExam} onCheckedChange={(restBeforeExam) => update({ restBeforeExam })} />
          </Field>
        </CollapsibleContent>
      </Collapsible>

      <p className="text-xs text-muted-foreground">{t('exams.planExplain')}</p>
    </div>
  )
}

export default PlanStarter
