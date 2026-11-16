import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible'
import { NativeSelect, NativeSelectOption } from '../ui/native-select'
import type { Exam } from '../../services/examService'
import { gradeSummary, requiredAverage } from '../../utils/grades'
import { degreeCfu } from '../../utils/preferences'
import { useLanguage } from '../../i18n/useLanguage'

const TARGETS = [100, 105, 110]
const GRADES = Array.from({ length: 13 }, (_, i) => String(18 + i)).concat('30L')

/**
 * "E se...": voti ipotetici sugli esami da sostenere → media e base di laurea previste,
 * più la media che serve nei CFU mancanti per 100, 105 e 110. Niente viene salvato.
 */
function GradeSimulator({ exams }: { exams: Exam[] }) {
  const { t, locale } = useLanguage()
  const [guesses, setGuesses] = useState<Record<number, string>>({})
  const total = degreeCfu()
  const toTake = exams.filter((e) => (e.status === 'planned' || e.status === 'in_progress') && e.cfu)
  const simulated = [
    ...exams,
    ...toTake.filter((e) => guesses[e.id]).map((e) => ({ ...e, status: 'passed' as const, grade: parseInt(guesses[e.id], 10) })),
  ].filter((e) => !(toTake.some((x) => x.id === e.id) && e.status !== 'passed'))
  const projected = gradeSummary(simulated)
  const fmt = (value: number) => value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <Collapsible className="border-t pt-4">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="group/sim -ml-2.5 font-semibold">
          <ChevronRight data-icon="inline-start" className="transition-transform group-data-[state=open]/sim:rotate-90" aria-hidden="true" />
          {t('exams.simTitle')}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-4 pt-2">
        <p className="text-sm text-muted-foreground">{t('exams.simIntro', { total })}</p>
        <ul className="grid grid-cols-3 gap-2">
          {TARGETS.map((target) => {
            const needed = requiredAverage(simulated, total, target)
            const out = needed !== null && needed > 30
            const safe = needed !== null && needed < 18
            const text = needed === null ? '—' : out ? t('exams.simOut') : safe ? t('exams.simSafe') : fmt(needed)
            return (
              <li key={target} className="flex flex-col gap-1 rounded-lg bg-muted/50 p-3">
                <span className="font-mono text-xs text-muted-foreground tabular-nums">{target}/110</span>
                <span className={cn('font-mono font-semibold tabular-nums', out ? 'text-sm text-destructive' : safe ? 'text-sm text-success' : 'text-lg')}>{text}</span>
              </li>
            )
          })}
        </ul>
        {toTake.length > 0 && (
          <>
            <h3 className="text-sm font-medium">{t('exams.simGuess')}</h3>
            <ul className="flex flex-col divide-y">
              {toTake.map((exam) => (
                <li className="flex items-center gap-3 py-2" key={exam.id}>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm">{exam.title}</span>
                    <span className="font-mono text-xs text-muted-foreground">{exam.cfu} CFU</span>
                  </span>
                  <NativeSelect className="w-24" value={guesses[exam.id] ?? ''} onChange={(e) => setGuesses((g) => ({ ...g, [exam.id]: e.target.value }))} aria-label={t('exams.outcomeGrade', { title: exam.title })}>
                    <NativeSelectOption value="">—</NativeSelectOption>
                    {GRADES.map((g) => <NativeSelectOption key={g} value={g}>{g}</NativeSelectOption>)}
                  </NativeSelect>
                </li>
              ))}
            </ul>
            <p className="rounded-lg border border-primary/25 bg-primary/5 p-3 text-sm font-medium">
              {t('exams.simResult', { average: projected.cfu ? fmt(projected.weightedAverage) : '—', base: projected.cfu ? projected.graduationBase.toLocaleString(locale, { maximumFractionDigits: 1 }) : '—' })}
            </p>
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

export default GradeSimulator
