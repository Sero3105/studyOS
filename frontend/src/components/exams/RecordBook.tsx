import { Suspense, lazy } from 'react'
import type { Exam } from '../../services/examService'
import { gradeSummary, gradeTrend } from '../../utils/grades'
import { degreeCfu } from '../../utils/preferences'
import GradeSimulator from './GradeSimulator'
import Figures from '../ui/Figures'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Skeleton } from '../ui/skeleton'
// Recharts è pesante: si scarica solo quando c'è un grafico da mostrare.
const GradeTrendChart = lazy(() => import('./GradeTrendChart'))
import { useLanguage } from '../../i18n/useLanguage'

/**
 * Libretto: medie, base di laurea, CFU e andamento dei voti. Nelle
 * statistiche (`detailed`) aggiunge esami superati, lodi ed esami da sostenere.
 */
function RecordBook({ exams, detailed = false }: { exams: Exam[]; detailed?: boolean }) {
  const { t } = useLanguage()
  const grades = gradeSummary(exams)
  const trend = gradeTrend(exams)
  if (grades.count === 0) return null
  const passed = exams.filter((e) => e.status === 'passed')
  const toTake = exams.filter((e) => e.status === 'planned' || e.status === 'in_progress').length

  return (
    <Card aria-labelledby="grade-summary-title">
      <CardHeader>
        <CardTitle><h2 id="grade-summary-title">{t('exams.gradesTitle')}</h2></CardTitle>
        {grades.cfu === 0 && <CardDescription>{t('exams.addCfuHint')}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <Figures items={[
          { label: t('exams.weightedAverage'), value: grades.cfu ? grades.weightedAverage.toFixed(2) : '—' },
          { label: t('exams.average'), value: grades.average.toFixed(2) },
          { label: t('exams.graduationBase'), value: grades.cfu ? `${grades.graduationBase.toFixed(1)}/110` : '—' },
          { label: t('exams.cfuTotal'), value: <>{grades.cfu}<span className="text-base text-muted-foreground">/{degreeCfu()}</span></> },
          ...(detailed ? [
            { label: t('exams.passedCount'), value: passed.length },
            { label: t('exams.honorsCount'), value: passed.filter((e) => e.honors).length },
            { label: t('exams.bestGrade'), value: `${Math.max(...trend.map((p) => p.grade))}${trend.some((p) => p.honors) ? 'L' : ''}` },
            { label: t('exams.toTake'), value: toTake },
          ] : []),
        ]} className="sm:grid-cols-4" />
        {trend.length >= 2 && <Suspense fallback={<Skeleton className="h-64" />}><GradeTrendChart points={trend} /></Suspense>}
        <GradeSimulator exams={exams} />
      </CardContent>
    </Card>
  )
}

export default RecordBook
