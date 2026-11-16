import { CalendarPlus, Pencil } from 'lucide-react'
import ConfirmButton from '../ui/ConfirmButton'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { isDated } from '../../services/examService'
import type { Exam, ExamStatus } from '../../services/examService'
import { daysUntil, formatDay } from '../../utils/dates'
import { useLanguage } from '../../i18n/useLanguage'
import type { TranslationKey } from '../../i18n/translations'

const statusKeys: Record<ExamStatus, TranslationKey> = {
  planned: 'exams.status.planned',
  in_progress: 'exams.status.in_progress',
  passed: 'exams.status.passed',
  failed: 'exams.status.failed',
}

const statusTone = {
  planned: 'outline',
  in_progress: 'accent',
  passed: 'success',
  failed: 'destructive',
} as const satisfies Record<ExamStatus, string>

interface ExamActionsProps {
  exam: Exam
  onEdit: (exam: Exam) => void
  onDelete: (exam: Exam) => Promise<void>
  onPlan?: (exam: Exam) => void
}

export function ExamActions({ exam, onEdit, onDelete, onPlan }: ExamActionsProps) {
  const { t } = useLanguage()
  const canPlan = onPlan && isDated(exam) && (exam.status === 'planned' || exam.status === 'in_progress') && daysUntil(exam.exam_date) > 1
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      {canPlan && (
        <Button variant="ghost" size="icon-sm" onClick={() => onPlan(exam)} aria-label={t('exams.planLabel', { title: exam.title })} title={t('exams.planTitle')}>
          <CalendarPlus aria-hidden="true" />
        </Button>
      )}
      <Button variant="ghost" size="icon-sm" onClick={() => onEdit(exam)} aria-label={t('exams.editLabel', { title: exam.title })} title={t('exams.editTitle')}>
        <Pencil aria-hidden="true" />
      </Button>
      <ConfirmButton label={t('exams.deleteLabel', { title: exam.title })} onConfirm={() => onDelete(exam)} />
    </div>
  )
}

export function StatusTag({ exam }: { exam: Exam }) {
  const { t, locale } = useLanguage()
  const grade = exam.status === 'passed' && exam.grade ? ` · ${exam.grade}${exam.honors ? 'L' : ''}` : ''
  const attempts = exam.attempts.map((a) => `${formatDay(a.exam_date, 'long', locale)} · ${t(`exams.attempt.${a.outcome}`)}${a.grade ? ` ${a.grade}` : ''}`)
  return (
    <>
      <Badge variant={statusTone[exam.status]}>{t(statusKeys[exam.status])}{grade}</Badge>
      {attempts.length > 0 && (
        <Badge variant="outline" className="cursor-help" title={`${t('exams.previousAttempts')}\n${attempts.join('\n')}`}>
          {t('exams.attemptNumber', { n: attempts.length + 1 })}
        </Badge>
      )}
    </>
  )
}
