import { apiRequest } from './apiClient'
import type { Task } from './taskService'
export type ExamStatus='planned'|'in_progress'|'passed'|'failed'
/** Appello già sostenuto senza superare l'esame: bocciato o voto rifiutato. */
export interface ExamAttempt { id:number; exam_date:string; outcome:'failed'|'rejected'; grade:number|null }
export interface Exam { id:number; user_id:number; title:string; subject:string; subject_id:number|null; exam_date:string|null; exam_time:string|null; location:string|null; notes:string|null; status:ExamStatus; cfu:number|null; grade:number|null; honors:boolean; graded:boolean; plan_days_off:string[]; created_at:string; updated_at:string; attempts:ExamAttempt[] }
export interface CreateExamPayload { title:string; subject:string; exam_date?:string|null; exam_time?:string; location?:string; notes?:string; status:ExamStatus; cfu?:number|null; grade?:number|null; honors?:boolean; graded?:boolean; plan_days_off?:string[] }
/** Esame con appello fissato: gli unici con conto alla rovescia, calendario e piano di studio. */
export type DatedExam = Exam & { exam_date: string }
export const isDated = (exam: Exam): exam is DatedExam => exam.exam_date !== null
export const getExams=()=>apiRequest<Exam[]>('/exams')
export const createExam=(payload:CreateExamPayload)=>apiRequest<Exam>('/exams',{method:'POST',body:JSON.stringify(payload)})
export const updateExam=(id:number,payload:Partial<CreateExamPayload>)=>apiRequest<Exam>(`/exams/${id}`,{method:'PATCH',body:JSON.stringify(payload)})
/** Preferenze del piano (vedi backend PlanRequest): l'algoritmo si adatta a queste. */
export interface PlanRequest {
  rest_days: number[]; start_date?: string; days_off: string[]; limit_unit: 'tasks'|'hours'; limit_value: number|null
  reviews: 'light'|'standard'|'intense'; final_days: number|null; rest_before_exam: boolean; order: 'course'|'hardest'; study_minutes: number
  weekday_limits: (number|null)[]|null; adapt: boolean; focus_days: number
}
export const planExam=(id:number, request:PlanRequest)=>apiRequest<Task[]>(`/exams/${id}/plan`,{method:'POST',body:JSON.stringify(request)})
/** Quando conviene iniziare il piano (metodo completo a ritmo sostenibile) e l'ultimo giorno utile (versione minima). */
export interface PlanAdvice { ideal_start:string; latest_start:string; ideal_days:number; min_days:number; full_items:number; min_items:number; full_minutes:number; min_minutes:number
  /** Dallo storico: quota di task del piano fatti in tempo e tempo reale / previsto; null = pochi dati. */
  reliability:number|null; pace:number|null }
export const getPlanAdvice=(id:number, request:PlanRequest)=>apiRequest<PlanAdvice>(`/exams/${id}/plan/advice`,{method:'POST',body:JSON.stringify(request)})
/** Registra l'appello attuale come non superato: l'esame torna da preparare, senza data. */
export const recordAttempt=(id:number, outcome:ExamAttempt['outcome'], grade:number|null)=>apiRequest<Exam>(`/exams/${id}/attempts`,{method:'POST',body:JSON.stringify({outcome,grade})})
export const deleteExam=(id:number)=>apiRequest<void>(`/exams/${id}`,{method:'DELETE'})
