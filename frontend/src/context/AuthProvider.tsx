import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { AuthContext } from './authContext'
import type { User } from './authContext'
import { login as loginRequest, logout as logoutRequest, refreshSession } from '../services/authService'
import { setRefreshHandler } from '../services/apiClient'

interface AuthProviderProps { children: ReactNode }

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const restoreSession = useCallback(async (): Promise<boolean> => {
    try { setUser(await refreshSession()); return true }
    catch { setUser(null); return false }
  }, [])
  useEffect(() => {
    setRefreshHandler(restoreSession)
    queueMicrotask(() => { void restoreSession().finally(() => setIsLoading(false)) })
    return () => setRefreshHandler(null)
  }, [restoreSession])
  const login = useCallback(async (email: string, password: string) => { setUser(await loginRequest({ email, password })) }, [])
  const logout = useCallback(async () => { await logoutRequest(); setUser(null) }, [])
  return <AuthContext.Provider value={{ user, login, logout, isLoading }}>{children}</AuthContext.Provider>
}
