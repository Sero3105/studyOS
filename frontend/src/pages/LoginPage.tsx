import { LoginForm } from '../components/AuthForm'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import type { SyntheticEvent } from 'react'
import { useAuth } from '../context/useAuth'

function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const justRegistered = (location.state as { registered?: boolean } | null)?.registered === true
  const { login } = useAuth()
  const [error, setError] = useState('')

  const handleLogin = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    const formData = new FormData(event.currentTarget)

    const email = String(formData.get('email') ?? '').trim()
    const password = String(formData.get('password') ?? '')

    if (!email || !password) {
      setError('Inserisci email e password.')
      return
    }

    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Si è verificato un errore durante il login.',
      )
    }
  }

  return (
    <AuthLayout title="Accedi" description="Bentornato. Riprendi da dove avevi lasciato.">
      {justRegistered && !error && (
        <p className="notice notice-success" role="status">Account creato. Accedi con le tue credenziali.</p>
      )}
      <LoginForm onSubmit={handleLogin} error={error} />
    </AuthLayout>
  )
}

export default LoginPage
