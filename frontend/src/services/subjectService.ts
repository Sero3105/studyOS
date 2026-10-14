import { apiRequest } from './apiClient'

export interface Topic { id: number; subject_id: number; title: string; completed: boolean; created_at: string }
export interface Subject { id: number; user_id: number; name: string; created_at: string; topics: Topic[] }

export const getSubjects = () => apiRequest<Subject[]>('/subjects')
export const createSubject = (name: string) => apiRequest<Subject>('/subjects', { method: 'POST', body: JSON.stringify({ name }) })
export const deleteSubject = (id: number) => apiRequest<void>(`/subjects/${id}`, { method: 'DELETE' })
export const createTopic = (subjectId: number, title: string) => apiRequest<Topic>(`/subjects/${subjectId}/topics`, { method: 'POST', body: JSON.stringify({ title }) })
export const updateTopic = (id: number, completed: boolean) => apiRequest<Topic>(`/topics/${id}`, { method: 'PATCH', body: JSON.stringify({ completed }) })
export const deleteTopic = (id: number) => apiRequest<void>(`/topics/${id}`, { method: 'DELETE' })
