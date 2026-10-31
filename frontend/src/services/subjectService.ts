import { apiRequest } from './apiClient'

export interface Topic { id: number; subject_id: number; title: string; completed: boolean; notes: string | null; created_at: string }
export const SUBJECT_COLORS = ['yellow', 'green', 'teal', 'blue', 'violet', 'pink', 'red', 'orange'] as const
export type SubjectColor = typeof SUBJECT_COLORS[number]
export interface Subject { id: number; user_id: number; name: string; color: SubjectColor | null; created_at: string; topics: Topic[] }

/** Colore scelto, o uno fisso in base all'id: ogni materia ha sempre il suo. */
export const subjectColor = (subject: { id: number; color: SubjectColor | null }): SubjectColor => subject.color ?? SUBJECT_COLORS[subject.id % SUBJECT_COLORS.length]

export const getSubjects = () => apiRequest<Subject[]>('/subjects')
export const createSubject = (name: string) => apiRequest<Subject>('/subjects', { method: 'POST', body: JSON.stringify({ name }) })
export const updateSubject = (id: number, patch: { name?: string; color?: SubjectColor }) => apiRequest<Subject>(`/subjects/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
export const deleteSubject = (id: number) => apiRequest<void>(`/subjects/${id}`, { method: 'DELETE' })
export const createTopic = (subjectId: number, title: string) => apiRequest<Topic>(`/subjects/${subjectId}/topics`, { method: 'POST', body: JSON.stringify({ title }) })
export interface TopicPatch { title?: string; completed?: boolean; notes?: string; schedule_reviews?: boolean }
export const updateTopic = (id: number, patch: TopicPatch) => apiRequest<Topic>(`/topics/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
export const deleteTopic = (id: number) => apiRequest<void>(`/topics/${id}`, { method: 'DELETE' })
