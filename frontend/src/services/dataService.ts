import { apiRequest } from './apiClient'

export interface ImportResult { subjects: number; topics: number; tasks: number; exams: number; sessions: number; goals: number }

export const exportData = () => apiRequest<unknown>('/data/export')
/** `replace`: cancella i dati attuali e importa il backup nella stessa transazione. */
export const importData = (data: unknown, replace = false) => apiRequest<ImportResult>(`/data/import${replace ? '?replace=true' : ''}`, { method: 'POST', body: JSON.stringify(data) })
export const exportNotesVault = (lang: string) => apiRequest<Blob>(`/data/notes-vault?lang=${lang}`)
