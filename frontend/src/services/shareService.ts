import { apiRequest, apiUrl } from './apiClient'

export interface LinkStatus { active: boolean; created_at: string | null }
export interface SharedPlan {
  subjects: { name: string; topics: { title: string; completed: boolean }[] }[]
  tasks: { title: string; due_date: string | null; priority: 'low' | 'medium' | 'high'; status: string }[]
  exams: { title: string; subject: string; exam_date: string; exam_time: string | null }[]
}

/** Link segreti (condivisione del piano, feed iCal): stato, crea/rigenera, revoca. */
export type LinkKind = 'share' | 'calendar-feed'
export const getLinkStatus = (kind: LinkKind) => apiRequest<LinkStatus>(`/${kind}`)
export const createLink = (kind: LinkKind) => apiRequest<{ token: string; created_at: string }>(`/${kind}`, { method: 'POST' })
export const revokeLink = (kind: LinkKind) => apiRequest<void>(`/${kind}`, { method: 'DELETE' })

export const linkUrl = (kind: LinkKind, token: string) =>
  kind === 'share' ? `${window.location.origin}/shared/${token}` : apiUrl(`/calendar/${token}.ics`)
export const getSharedPlan = (token: string) => apiRequest<SharedPlan>(`/share/public/${encodeURIComponent(token)}`)
