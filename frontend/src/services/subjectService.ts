import { apiRequest } from './apiClient'
import { getExams } from './examService'
import { archivedSubjectIds } from '../utils/grades'

export interface Topic { id: number; subject_id: number; title: string; completed: boolean; notes: string | null; difficulty: Difficulty; mastery: Mastery; created_at: string }
/** 1 facile, 2 media, 3 difficile: pesa nel piano d'esame. */
export type Difficulty = 1 | 2 | 3
/** 0 da fare, 1 studiato, 2 ripassato, 3 sicuro; `completed` = mastery >= 1. */
export type Mastery = 0 | 1 | 2 | 3
export const SUBJECT_COLORS = ['yellow', 'green', 'teal', 'blue', 'violet', 'pink', 'red', 'orange'] as const
export type SubjectColor = typeof SUBJECT_COLORS[number]
export interface Subject { id: number; user_id: number; name: string; color: SubjectColor | null; created_at: string; topics: Topic[] }

/** Colore scelto, o uno fisso in base all'id: ogni materia ha sempre il suo. */
export const subjectColor = (subject: { id: number; color: SubjectColor | null }): SubjectColor => subject.color ?? SUBJECT_COLORS[subject.id % SUBJECT_COLORS.length]

export const getSubjects = () => apiRequest<Subject[]>('/subjects')
/** Materie senza esame superato, per i selettori (timer, obiettivi). Se gli esami non arrivano, tutte. */
export const getActiveSubjects = async () => {
  const [subjects, archived] = await Promise.all([getSubjects(), getExams().then(archivedSubjectIds).catch(() => new Set<number>())])
  return subjects.filter((s) => !archived.has(s.id))
}
export const createSubject = (name: string) => apiRequest<Subject>('/subjects', { method: 'POST', body: JSON.stringify({ name }) })
export const updateSubject = (id: number, patch: { name?: string; color?: SubjectColor }) => apiRequest<Subject>(`/subjects/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
export const deleteSubject = (id: number) => apiRequest<void>(`/subjects/${id}`, { method: 'DELETE' })
export const createTopic = (subjectId: number, title: string) => apiRequest<Topic>(`/subjects/${subjectId}/topics`, { method: 'POST', body: JSON.stringify({ title }) })
export interface TopicPatch { title?: string; completed?: boolean; notes?: string; difficulty?: Difficulty; mastery?: Mastery; schedule_reviews?: boolean }
export const updateTopic = (id: number, patch: TopicPatch) => apiRequest<Topic>(`/topics/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
export const deleteTopic = (id: number) => apiRequest<void>(`/topics/${id}`, { method: 'DELETE' })
