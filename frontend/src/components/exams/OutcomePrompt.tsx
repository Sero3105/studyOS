import { useState } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { NativeSelect, NativeSelectOption } from '../ui/native-select'
import { recordAttempt, updateExam } from '../../services/examService'
import type { DatedExam, Exam } from '../../services/examService'
import { relativeDay } from '../../utils/dates'
import { useLanguage } from '../../i18n/useLanguage'

const GRADES = Array.from({ length: 13 }, (_, i) => String(18 + i)).concat('30L')

/**
 * Esame con data passata ancora "da preparare": si registra com'è andato in un clic. Voto facoltativo (idoneità).
 * Bocciato o rifiutato diventa un tentativo nello storico dell'esame, che torna da preparare per il prossimo appello.
 */
export default function OutcomePrompt({ exam, onSave }: { exam: DatedExam; onSave: (request: () => Promise<Exam>) => Promise<void> }) {
  const { t, locale } = useLanguage()
  const [grade, setGrade] = useState('')
  const [busy, setBusy] = useState(false)
  const save = (request: () => Promise<Exam>) => { setBusy(true); void onSave(request).finally(() => setBusy(false)) }
  const value = grade ? parseInt(grade, 10) : null

  return (
    <Card size="sm" className="ring-warning/30">
      <CardContent className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-sm font-medium">{t('exams.outcomeQuestion', { title: exam.title, when: relativeDay(exam.exam_date, locale).toLowerCase() })}</p>
        <div className="flex flex-wrap items-center gap-2">
          {exam.graded && <NativeSelect className="w-32" value={grade} onChange={(e) => setGrade(e.target.value)} aria-label={t('exams.outcomeGrade', { title: exam.title })}>
            <NativeSelectOption value="">{t('exams.outcomeNoGrade')}</NativeSelectOption>
            {GRADES.map((g) => <NativeSelectOption key={g} value={g}>{g}</NativeSelectOption>)}
          </NativeSelect>}
          <Button disabled={busy}
            onClick={() => save(() => updateExam(exam.id, { status: 'passed', grade: value, honors: grade === '30L' }))}>
            {t('exams.status.passed')}
          </Button>
          {exam.graded && <Button variant="outline" disabled={busy || value === null} title={value === null ? t('exams.rejectedNeedsGrade') : undefined}
            onClick={() => save(() => recordAttempt(exam.id, 'rejected', value))}>
            {t('exams.attempt.rejected')}
          </Button>}
          <Button variant="ghost" disabled={busy} onClick={() => save(() => recordAttempt(exam.id, 'failed', null))}>
            {t('exams.attempt.failed')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
