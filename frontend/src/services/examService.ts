import { apiRequest } from './apiClient'
export type ExamStatus='planned'|'in_progress'|'passed'|'failed'
export interface Exam { id:number; user_id:number; title:string; subject:string; exam_date:string; exam_time:string|null; location:string|null; notes:string|null; status:ExamStatus; created_at:string; updated_at:string }
export interface CreateExamPayload { title:string; subject:string; exam_date:string; exam_time?:string; location?:string; notes?:string; status:ExamStatus }
export const getExams=()=>apiRequest<Exam[]>('/exams')
export const createExam=(payload:CreateExamPayload)=>apiRequest<Exam>('/exams',{method:'POST',body:JSON.stringify(payload)})
