import { createContext } from 'react'
import type { Dispatch, SetStateAction } from 'react'

export interface User {
  id: number
  username: string
  email: string
  full_name: string | null
}

export interface AuthContextValue {
  user: User | null
  setUser: Dispatch<SetStateAction<User | null>>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
