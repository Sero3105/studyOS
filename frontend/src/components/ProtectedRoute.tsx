import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return <main aria-busy="true">Caricamento sessione…</main>
  return user ? <>{children}</> : <Navigate to="/login" replace />
}
