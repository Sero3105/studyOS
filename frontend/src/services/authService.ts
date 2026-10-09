export interface RegisterRequest {
    username: string
    email: string
    full_name: string
    password: string
}

export interface UserResponse {
  id: number
  username: string
  email: string
  full_name: string | null
}

export interface LoginRequest {
  email: string
  password: string
}

import { apiRequest } from './apiClient'

export async function register(
    userData: RegisterRequest,
): Promise<UserResponse> {
    return apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
    })
}

export async function login(
  credentials: LoginRequest,
): Promise<UserResponse> {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}