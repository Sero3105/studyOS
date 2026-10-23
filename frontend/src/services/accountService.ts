import { apiRequest } from './apiClient'

export const changePassword = (current_password: string, new_password: string) =>
  apiRequest<void>('/auth/password', { method: 'POST', body: JSON.stringify({ current_password, new_password }) })
export const deleteAccount = (password: string) =>
  apiRequest<void>('/auth/account', { method: 'DELETE', body: JSON.stringify({ password }) })
