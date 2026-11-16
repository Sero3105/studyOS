import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import BrandMark from './BrandMark'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) {
    return (
      <main className="grid min-h-svh place-items-center bg-background" aria-busy="true">
        <span className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
          <BrandMark className="size-10 animate-pulse" />
          Caricamento sessione…
        </span>
      </main>
    )
  }
  return user ? <>{children}</> : <Navigate to="/login" replace />
}
