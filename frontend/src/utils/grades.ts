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

export interface GradePoint { id: number; title: string; date: string; grade: number; honors: boolean; cfu: number | null; average: number | null; delta: number | null }

/** Esami superati in ordine di data, con la media ponderata sui CFU dopo ciascuno (null finché nessuno ha CFU) e quanto è cambiata. */
export function gradeTrend(exams: Pick<Exam, 'id' | 'title' | 'status' | 'grade' | 'honors' | 'cfu' | 'exam_date'>[]): GradePoint[] {
  let points = 0
  let credits = 0
  let previous: number | null = null
  return exams
    .filter((e) => e.status === 'passed' && e.grade && e.exam_date)
    .sort((a, b) => a.exam_date!.localeCompare(b.exam_date!) || a.id - b.id)
    .map((e) => {
      if (e.cfu) { points += e.grade! * e.cfu; credits += e.cfu }
      const average = credits ? points / credits : null
      const delta = average !== null && previous !== null ? average - previous : null
      previous = average ?? previous
      return { id: e.id, title: e.title, date: e.exam_date!, grade: e.grade!, honors: e.honors, cfu: e.cfu, average, delta }
    })
}

/**
 * Media ponderata da tenere nei CFU che mancano per arrivare a `targetBase` (in 110) su `totalCfu`.
 * null se non mancano CFU. Sopra 30 il traguardo è irraggiungibile, sotto 18 è già al sicuro.
 * shortcut: tutti i CFU mancanti contano come esami con voto (tesi, tirocinio e idoneità no); va bene come stima.
 */
export function requiredAverage(exams: Pick<Exam, 'status' | 'grade' | 'cfu'>[], totalCfu: number, targetBase: number): number | null {
  const graded = exams.filter((e) => e.status === 'passed' && e.grade && e.cfu)
  const cfu = graded.reduce((sum, e) => sum + e.cfu!, 0)
  const points = graded.reduce((sum, e) => sum + e.grade! * e.cfu!, 0)
  const remaining = totalCfu - cfu
  if (remaining <= 0) return null
  return ((targetBase * 30) / 110 * totalCfu - points) / remaining
}
