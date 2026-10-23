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

/** CFU di una laurea triennale. shortcut: fisso a 180, rendilo un'impostazione se servono magistrali (120) o ciclo unico. */
export const DEGREE_CFU = 180

export interface GradePoint { id: number; title: string; date: string; grade: number; honors: boolean; cfu: number | null; average: number | null }

/** Esami superati in ordine di data, con la media ponderata sui CFU dopo ciascuno (null finché nessuno ha CFU). */
export function gradeTrend(exams: Pick<Exam, 'id' | 'title' | 'status' | 'grade' | 'honors' | 'cfu' | 'exam_date'>[]): GradePoint[] {
  let points = 0
  let credits = 0
  return exams
    .filter((e) => e.status === 'passed' && e.grade && e.exam_date)
    .sort((a, b) => a.exam_date!.localeCompare(b.exam_date!) || a.id - b.id)
    .map((e) => {
      if (e.cfu) { points += e.grade! * e.cfu; credits += e.cfu }
      return { id: e.id, title: e.title, date: e.exam_date!, grade: e.grade!, honors: e.honors, cfu: e.cfu, average: credits ? points / credits : null }
    })
}
