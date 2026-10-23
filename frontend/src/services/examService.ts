import { apiRequest } from './apiClient'
import type { Task } from './taskService'
export type ExamStatus='planned'|'in_progress'|'passed'|'failed'
export interface Exam { id:number; user_id:number; title:string; subject:string; exam_date:string|null; exam_time:string|null; location:string|null; notes:string|null; status:ExamStatus; cfu:number|null; grade:number|null; honors:boolean; created_at:string; updated_at:string }
export interface CreateExamPayload { title:string; subject:string; exam_date?:string|null; exam_time?:string; location?:string; notes?:string; status:ExamStatus; cfu?:number|null; grade?:number|null; honors?:boolean }
/** Esame con appello fissato: gli unici con conto alla rovescia, calendario e piano di studio. */
export type DatedExam = Exam & { exam_date: string }
export const isDated = (exam: Exam): exam is DatedExam => exam.exam_date !== null
export const getExams=()=>apiRequest<Exam[]>('/exams')
export const createExam=(payload:CreateExamPayload)=>apiRequest<Exam>('/exams',{method:'POST',body:JSON.stringify(payload)})
export const updateExam=(id:number,payload:CreateExamPayload)=>apiRequest<Exam>(`/exams/${id}`,{method:'PATCH',body:JSON.stringify(payload)})
export const planExam=(id:number)=>apiRequest<Task[]>(`/exams/${id}/plan`,{method:'POST'})
export const deleteExam=(id:number)=>apiRequest<void>(`/exams/${id}`,{method:'DELETE'})
