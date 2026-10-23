import type { Exam } from '../services/examService'

/** Libretto: media aritmetica e ponderata sui CFU (lode = 30), base di laurea in 110. */
export function gradeSummary(exams: Pick<Exam, 'status' | 'grade' | 'cfu'>[]) {
  const graded = exams.filter((e) => e.status === 'passed' && e.grade)
  const weighted = graded.filter((e) => e.cfu)
  const cfu = weighted.reduce((sum, e) => sum + e.cfu!, 0)
  const average = graded.length ? graded.reduce((sum, e) => sum + e.grade!, 0) / graded.length : 0
  const weightedAverage = cfu ? weighted.reduce((sum, e) => sum + e.grade! * e.cfu!, 0) / cfu : 0
  return { count: graded.length, cfu, average, weightedAverage, graduationBase: (weightedAverage * 110) / 30 }
}
