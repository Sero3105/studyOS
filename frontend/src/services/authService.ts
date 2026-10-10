import { apiRequest, setAuthTokens } from './apiClient'

export interface RegisterRequest { username: string; email: string; full_name: string; password: string }
export interface UserResponse { id: number; username: string; email: string; full_name: string | null }
export interface LoginRequest { email: string; password: string }
export interface AuthResponse { access_token: string; token_type: 'bearer'; csrf_token: string; user: UserResponse }

function saveInMemorySession(response: AuthResponse) {
  setAuthTokens(response.access_token, response.csrf_token)
  return response.user
}

export async function register(userData: RegisterRequest): Promise<UserResponse> {
  return apiRequest<UserResponse>('/auth/register', { method: 'POST', body: JSON.stringify(userData) })
}
export async function login(credentials: LoginRequest): Promise<UserResponse> {
  return saveInMemorySession(await apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }))
}
export async function refreshSession(): Promise<UserResponse> {
  return saveInMemorySession(await apiRequest<AuthResponse>('/auth/refresh', { method: 'POST' }, false))
}
export async function logout(): Promise<void> {
  try { await apiRequest<void>('/auth/logout', { method: 'POST' }, false) }
  finally { setAuthTokens(null, null) }
}
