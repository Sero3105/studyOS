import { apiRequest } from './apiClient'

export const SESSION_KINDS = ['study', 'lesson', 'exercises', 'review', 'lab'] as const
export type SessionKind = typeof SESSION_KINDS[number]
/** 1 distratto, 2 ok, 3 concentrato. */
export type Focus = 1 | 2 | 3
export interface StudySession {
  id: number; user_id: number; subject_id: number | null; topic_id: number | null
  duration_minutes: number; studied_on: string; notes: string | null; kind: SessionKind; focus: Focus | null; created_at: string
}
export interface CreateSessionPayload {
  subject_id?: number | null; topic_id?: number | null; duration_minutes: number; studied_on: string; notes?: string | null
  kind?: SessionKind; focus?: Focus | null
}

export const getSessions = () => apiRequest<StudySession[]>('/sessions')
export const createSession = (payload: CreateSessionPayload) => apiRequest<StudySession>('/sessions', { method: 'POST', body: JSON.stringify(payload) })
export const updateSession = (id: number, payload: Partial<CreateSessionPayload>) => apiRequest<StudySession>(`/sessions/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
export const deleteSession = (id: number) => apiRequest<void>(`/sessions/${id}`, { method: 'DELETE' })
