import { apiRequest } from './apiClient'
import type { ReviewRating } from './taskService'

export interface Card { id: number; topic_id: number; front: string; back: string; due_date: string; interval: number }

export const getCards = () => apiRequest<Card[]>('/cards')
export const createCard = (payload: { topic_id: number; front: string; back: string }) => apiRequest<Card>('/cards', { method: 'POST', body: JSON.stringify(payload) })
export const reviewCard = (id: number, rating: ReviewRating) => apiRequest<Card>(`/cards/${id}/review`, { method: 'POST', body: JSON.stringify({ rating }) })
export const deleteCard = (id: number) => apiRequest<void>(`/cards/${id}`, { method: 'DELETE' })

/** Più carte in un argomento: le domande già presenti (senza maiuscole) vengono saltate. */
export const createCards = (topicId: number, cards: { front: string; back: string }[]) =>
  apiRequest<{ created: number; skipped: number }>('/cards/bulk', { method: 'POST', body: JSON.stringify({ topic_id: topicId, cards }) })

/** Quaderno degli errori: errore, spiegazione giusta, da dove viene; può diventare una flashcard. */
export interface Mistake { id: number; topic_id: number; mistake: string; correction: string; source: string | null; card_id: number | null; created_at: string }
export const getMistakes = () => apiRequest<Mistake[]>('/mistakes')
export const createMistake = (payload: { topic_id: number; mistake: string; correction: string; source?: string }) => apiRequest<Mistake>('/mistakes', { method: 'POST', body: JSON.stringify(payload) })
export const linkMistakeCard = (id: number, cardId: number | null) => apiRequest<Mistake>(`/mistakes/${id}`, { method: 'PATCH', body: JSON.stringify({ card_id: cardId }) })
export const deleteMistake = (id: number) => apiRequest<void>(`/mistakes/${id}`, { method: 'DELETE' })
