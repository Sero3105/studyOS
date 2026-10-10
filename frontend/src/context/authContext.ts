import { createContext } from 'react'

export interface User {
  id: number
  username: string
  email: string
  full_name: string | null
}

export interface AuthContextValue {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  isLoading: boolean
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
