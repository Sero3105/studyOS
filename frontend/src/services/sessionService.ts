import { apiRequest } from './apiClient'

export interface StudySession {
  id: number; user_id: number; subject_id: number | null; topic_id: number | null
  duration_minutes: number; studied_on: string; notes: string | null; created_at: string
}
export interface CreateSessionPayload {
  subject_id?: number; topic_id?: number; duration_minutes: number; studied_on: string; notes?: string
}

export const getSessions = () => apiRequest<StudySession[]>('/sessions')
export const createSession = (payload: CreateSessionPayload) => apiRequest<StudySession>('/sessions', { method: 'POST', body: JSON.stringify(payload) })
export const deleteSession = (id: number) => apiRequest<void>(`/sessions/${id}`, { method: 'DELETE' })
