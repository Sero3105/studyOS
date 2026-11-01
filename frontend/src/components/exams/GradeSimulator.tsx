import { useState } from 'react'
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
    <details className="grade-sim">
      <summary>{t('exams.simTitle')}</summary>
      <p className="panel-meta">{t('exams.simIntro', { total })}</p>
      <ul className="grade-sim-targets">
        {TARGETS.map((target) => {
          const needed = requiredAverage(simulated, total, target)
          const text = needed === null ? '—' : needed > 30 ? t('exams.simOut') : needed < 18 ? t('exams.simSafe') : fmt(needed)
          return (
            <li key={target} className={needed !== null && needed > 30 ? 'is-out' : needed !== null && needed < 18 ? 'is-safe' : undefined}>
              <span className="grade-sim-target num">{target}/110</span>
              <span className="grade-sim-needed num">{text}</span>
            </li>
          )
        })}
      </ul>
      {toTake.length > 0 && (
        <>
          <h3 className="settings-subtitle">{t('exams.simGuess')}</h3>
          <ul className="rows grade-sim-exams">
            {toTake.map((exam) => (
              <li className="row" key={exam.id}>
                <span className="row-main">
                  <span className="row-title">{exam.title}</span>
                  <span className="row-meta">{exam.cfu} CFU</span>
                </span>
                <select className="input grade-sim-select" value={guesses[exam.id] ?? ''} onChange={(e) => setGuesses((g) => ({ ...g, [exam.id]: e.target.value }))} aria-label={t('exams.outcomeGrade', { title: exam.title })}>
                  <option value="">—</option>
                  {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </li>
            ))}
          </ul>
          <p className="grade-sim-result">
            {t('exams.simResult', { average: projected.cfu ? fmt(projected.weightedAverage) : '—', base: projected.cfu ? projected.graduationBase.toLocaleString(locale, { maximumFractionDigits: 1 }) : '—' })}
          </p>
        </>
      )}
    </details>
  )
}

export default GradeSimulator
