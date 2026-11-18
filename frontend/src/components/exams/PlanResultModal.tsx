import { CalendarDays, CircleAlert, CircleCheck } from 'lucide-react'
import Modal from '../ui/Modal'
import { Button } from '../ui/button'
import type { Task } from '../../services/taskService'
import { useLanguage } from '../../i18n/useLanguage'
import { formatDay } from '../../utils/dates'

/** Esito di "Crea piano di studio": i task creati oppure il motivo per cui non è stato creato. */
export type PlanResult = { subject: string; tasks: Task[] } | { subject: string; error: string }

/**
 * Conferma ben visibile dopo aver creato il piano: quante attività, di che tipo e in che periodo,
 * con un passaggio diretto al calendario. Se qualcosa va storto dice perché, nello stesso posto.
 */
function PlanResultModal({ result, onClose, onOpenCalendar }: { result: PlanResult; onClose: () => void; onOpenCalendar: () => void }) {
  const { t, locale } = useLanguage()

  if ('error' in result) {
    return (
      <Modal title={t('plan.result.errorTitle')} onClose={onClose}>
        <p className="flex items-start gap-2 text-sm text-destructive"><CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{result.error}</p>
        <div className="flex justify-end"><Button onClick={onClose}>{t('plan.result.close')}</Button></div>
      </Modal>
    )
  }

  const { tasks } = result
  if (!tasks.length) {
    return (
      <Modal title={t('plan.result.emptyTitle')} onClose={onClose}>
        <p className="text-sm text-muted-foreground">{t('exams.planNothing')}</p>
        <div className="flex justify-end"><Button onClick={onClose}>{t('plan.result.close')}</Button></div>
      </Modal>
    )
  }

  const study = tasks.filter((x) => x.review_interval === null).length
  const finals = tasks.filter((x) => x.description?.includes('Ripasso finale')).length
  const days = tasks.map((x) => x.due_date).filter((d): d is string => !!d).sort()
  const figures = [
    { label: t('plan.result.study'), value: study },
    { label: t('plan.result.reviews'), value: tasks.length - study - finals },
    { label: t('plan.result.finals'), value: finals },
  ]

  return (
    <Modal title={t('plan.result.title', { subject: result.subject })} onClose={onClose}>
      <p className="flex items-start gap-2 text-sm">
        <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
        {t('plan.result.summary', { total: tasks.length, from: formatDay(days[0], 'long', locale), to: formatDay(days[days.length - 1], 'long', locale) })}
      </p>
      <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border bg-border">
        {figures.map((f) => (
          <div key={f.label} className="flex flex-col gap-1 bg-card p-3">
            <dt className="text-xs text-muted-foreground">{f.label}</dt>
            <dd className="font-mono text-2xl font-semibold tabular-nums">{f.value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted-foreground">{t('plan.result.where')}</p>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onClose}>{t('plan.result.close')}</Button>
        <Button onClick={onOpenCalendar}><CalendarDays data-icon="inline-start" aria-hidden="true" />{t('plan.result.openCalendar')}</Button>
      </div>
    </Modal>
  )
}

export default PlanResultModal
