import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) {
    return (
      <main className="session-loading" aria-busy="true">
        <span className="brand-mark" aria-hidden="true" />
        <span>Caricamento sessione…</span>
      </main>
    )
  }
  return user ? <>{children}</> : <Navigate to="/login" replace />
}
