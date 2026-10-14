import { apiRequest } from './apiClient'

export type GoalKind = 'weekly_minutes' | 'total_minutes' | 'tasks_done' | 'topics_done' | 'sessions_count'
export interface Goal {
  id: number; user_id: number; title: string; kind: GoalKind; target: number
  current: number; percent: number; created_at: string
}

export const goalKindLabels: Record<GoalKind, string> = {
  weekly_minutes: 'Minuti questa settimana',
  total_minutes: 'Minuti totali',
  tasks_done: 'Task completati',
  topics_done: 'Argomenti completati',
  sessions_count: 'Sessioni di studio',
}

export const getGoals = () => apiRequest<Goal[]>('/goals')
export const createGoal = (title: string, kind: GoalKind, target: number) =>
  apiRequest<Goal>('/goals', { method: 'POST', body: JSON.stringify({ title, kind, target }) })
export const deleteGoal = (id: number) => apiRequest<void>(`/goals/${id}`, { method: 'DELETE' })
