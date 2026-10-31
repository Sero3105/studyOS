import { apiRequest } from './apiClient'

export type GoalKind = 'weekly_minutes' | 'total_minutes' | 'tasks_done' | 'topics_done' | 'sessions_count'
export interface Goal {
  id: number; user_id: number; title: string; kind: GoalKind; target: number
  subject_id: number | null; deadline: string | null
  current: number; percent: number; created_at: string
}


export const getGoals = () => apiRequest<Goal[]>('/goals')
export interface CreateGoalPayload { title: string; kind: GoalKind; target: number; subject_id?: number; deadline?: string }
export const createGoal = (payload: CreateGoalPayload) =>
  apiRequest<Goal>('/goals', { method: 'POST', body: JSON.stringify(payload) })
export const deleteGoal = (id: number) => apiRequest<void>(`/goals/${id}`, { method: 'DELETE' })
