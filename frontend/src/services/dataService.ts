import { apiRequest } from './apiClient'

export interface ImportResult { subjects: number; topics: number; tasks: number; exams: number; sessions: number; goals: number }

export const exportData = () => apiRequest<unknown>('/data/export')
export const importData = (data: unknown) => apiRequest<ImportResult>('/data/import', { method: 'POST', body: JSON.stringify(data) })
export const exportNotesVault = (lang: string) => apiRequest<Blob>(`/data/notes-vault?lang=${lang}`)
