import { Suspense, lazy } from 'react'
import type { Exam } from '../../services/examService'
import { DEGREE_CFU, gradeSummary, gradeTrend } from '../../utils/grades'
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
    <section className="panel grade-summary" aria-labelledby="grade-summary-title">
      <h2 id="grade-summary-title" className="panel-title">{t('exams.gradesTitle')}</h2>
      <dl className="grade-stats">
        <div><dt>{t('exams.weightedAverage')}</dt><dd className="num">{grades.cfu ? grades.weightedAverage.toFixed(2) : '—'}</dd></div>
        <div><dt>{t('exams.average')}</dt><dd className="num">{grades.average.toFixed(2)}</dd></div>
        <div><dt>{t('exams.graduationBase')}</dt><dd className="num">{grades.cfu ? `${grades.graduationBase.toFixed(1)}/110` : '—'}</dd></div>
        <div><dt>{t('exams.cfuTotal')}</dt><dd className="num">{grades.cfu}<span className="grade-stats-of">/{DEGREE_CFU}</span></dd></div>
        {detailed && (
          <>
            <div><dt>{t('exams.passedCount')}</dt><dd className="num">{passed.length}</dd></div>
            <div><dt>{t('exams.honorsCount')}</dt><dd className="num">{passed.filter((e) => e.honors).length}</dd></div>
            <div><dt>{t('exams.bestGrade')}</dt><dd className="num">{Math.max(...trend.map((p) => p.grade))}{trend.some((p) => p.honors) ? 'L' : ''}</dd></div>
            <div><dt>{t('exams.toTake')}</dt><dd className="num">{toTake}</dd></div>
          </>
        )}
      </dl>
      {grades.cfu === 0 && <p className="panel-meta">{t('exams.addCfuHint')}</p>}
      {trend.length >= 2 && <Suspense fallback={<div className="skeleton grade-trend-skeleton" />}><GradeTrendChart points={trend} /></Suspense>}
    </section>
  )
}

export default RecordBook
