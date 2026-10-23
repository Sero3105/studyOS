import { apiRequest } from './apiClient'

export interface ShareStatus { active: boolean; created_at: string | null }
export interface SharedPlan {
  subjects: { name: string; topics: { title: string; completed: boolean }[] }[]
  tasks: { title: string; due_date: string | null; priority: 'low' | 'medium' | 'high'; status: string }[]
  exams: { title: string; subject: string; exam_date: string; exam_time: string | null }[]
}

export const getShareStatus = () => apiRequest<ShareStatus>('/share')
export const createShareLink = () => apiRequest<{ token: string; created_at: string }>('/share', { method: 'POST' })
export const revokeShareLink = () => apiRequest<void>('/share', { method: 'DELETE' })
export const getSharedPlan = (token: string) => apiRequest<SharedPlan>(`/share/public/${encodeURIComponent(token)}`)
export const shareUrl = (token: string) => `${window.location.origin}/shared/${token}`
