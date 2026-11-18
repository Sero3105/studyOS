import { Archive, CalendarClock, CalendarDays, Clock3, MapPin, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import { ExamActions, StatusTag } from './ExamParts'
import OutcomePrompt from './OutcomePrompt'
import PlanStarter from './PlanStarter'
import ReadinessMeter from './ReadinessMeter'
import CoverageMap from './CoverageMap'
import type { ExamCoverage } from './CoverageMap'
import { isDated } from '../../services/examService'
import type { Exam, PlanRequest } from '../../services/examService'
import type { Readiness } from '../../utils/planning'
import { daysUntil, formatDay, urgencyClass } from '../../utils/dates'
import { useLanguage } from '../../i18n/useLanguage'
import type { TranslationKey } from '../../i18n/translations'

interface SubjectExamProps {
  exams: Exam[]
  readiness?: Readiness
  coverage?: ExamCoverage
  onAdd: () => void
  onEdit: (exam: Exam) => void
  onDelete: (exam: Exam) => Promise<void>
  onPlan: (exam: Exam, request: PlanRequest) => void
  /** Cambia con argomenti, stato e difficoltà: i suggerimenti del piano si ricalcolano. */
  topicsKey: string
  /** Salva una modifica dell'esame (esito, giorni liberi del piano); `failure` è il messaggio se non riesce. */
  onOutcome: (request: () => Promise<Exam>, failure?: TranslationKey) => Promise<void>
}

/** L'esame della materia, dentro la sua scheda: conto alla rovescia, prontezza, copertura; superato → archivio. */
function SubjectExam({ exams, readiness, coverage, onAdd, onEdit, onDelete, onPlan, onOutcome, topicsKey }: SubjectExamProps) {
  const { t, locale } = useLanguage()
  const open = exams.filter((e) => e.status === 'planned' || e.status === 'in_progress')
  const awaiting = open.filter((e) => isDated(e) && daysUntil(e.exam_date) < 0)
  const active = open.filter((e) => !awaiting.includes(e)).sort((a, b) => (a.exam_date ?? '9999').localeCompare(b.exam_date ?? '9999'))[0]
  const passed = exams.find((e) => e.status === 'passed')

  if (passed) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-success/25 bg-success/5 p-4 text-sm">
        <Archive className="size-4 shrink-0 text-success" aria-hidden="true" />
        <span className="flex-1">{t('subjects.archivedNote', { grade: passed.grade ? ` (${passed.grade}${passed.honors ? 'L' : ''})` : '' })}</span>
        <ExamActions exam={passed} onEdit={onEdit} onDelete={onDelete} />
      </div>
    )
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border bg-muted/20 p-4" aria-label={t('subjects.examSection')}>
      {awaiting.map((exam) => isDated(exam) && <OutcomePrompt key={exam.id} exam={exam} onSave={onOutcome} />)}
      {active ? (
        <>
          <div className="flex flex-wrap items-start gap-4">
            {isDated(active) ? (() => {
              const days = daysUntil(active.exam_date)
              return (
                <div className={cn('flex w-16 shrink-0 flex-col items-center rounded-lg border bg-card py-2', urgencyClass(days))}>
                  <span className="font-mono text-2xl leading-none font-semibold tabular-nums">{days === 0 ? '!' : days}</span>
                  <span className="mt-1 text-[0.625rem] text-muted-foreground uppercase">{days === 0 ? t('common.today') : days === 1 ? t('dashboard.day') : t('dashboard.days')}</span>
                </div>
              )
            })() : (
              <span className="flex size-16 shrink-0 items-center justify-center rounded-lg border border-dashed text-muted-foreground" aria-hidden="true"><CalendarClock className="size-5" /></span>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-col">
                  <span className="font-mono text-[0.6875rem] tracking-wider text-muted-foreground uppercase">{t('subjects.examSection')}</span>
                  <span className="truncate text-sm font-medium">{active.title}</span>
                </div>
                <ExamActions exam={active} onEdit={onEdit} onDelete={onDelete} />
              </div>
              <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground [&>li]:flex [&>li]:items-center [&>li]:gap-1.5 [&_svg]:size-3.5">
                <li><CalendarDays aria-hidden="true" />{active.exam_date ? formatDay(active.exam_date, 'full', locale) : t('exams.noDate')}</li>
                {active.exam_time && <li><Clock3 aria-hidden="true" /><span className="font-mono">{active.exam_time.slice(0, 5)}</span></li>}
                {active.location && <li><MapPin aria-hidden="true" />{active.location}</li>}
                {active.cfu && <li className="font-mono">{active.cfu} CFU</li>}
                <li><StatusTag exam={active} /></li>
              </ul>
            </div>
          </div>
          {isDated(active) && daysUntil(active.exam_date) > 1 && <PlanStarter key={active.id} exam={active} topicsKey={topicsKey} onPlan={onPlan} onSave={onOutcome} />}
          {readiness && <ReadinessMeter readiness={readiness} />}
          {coverage && <CoverageMap coverage={coverage} />}
        </>
      ) : awaiting.length === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{t('subjects.noExam')}</p>
          <Button variant="outline" size="sm" onClick={onAdd}><Plus data-icon="inline-start" aria-hidden="true" />{t('subjects.addExam')}</Button>
        </div>
      )}
    </section>
  )
}

export default SubjectExam
