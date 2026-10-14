import { apiRequest } from './apiClient'

export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskStatus = 'todo' | 'in_progress' | 'done'
export interface Task {
  id: number; user_id: number; title: string; description: string | null; due_date: string | null
  priority: TaskPriority; status: TaskStatus; subject_id: number | null; topic_id: number | null
  created_at: string; updated_at: string
}
export interface CreateTaskPayload {
  title: string; description?: string; due_date?: string; priority: TaskPriority
  subject_id?: number; topic_id?: number
}

export const getTasks = () => apiRequest<Task[]>('/tasks')
export const createTask = (payload: CreateTaskPayload) => apiRequest<Task>('/tasks', { method: 'POST', body: JSON.stringify(payload) })
export const updateTask = (id: number, patch: Partial<Task>) => apiRequest<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
export const deleteTask = (id: number) => apiRequest<void>(`/tasks/${id}`, { method: 'DELETE' })
