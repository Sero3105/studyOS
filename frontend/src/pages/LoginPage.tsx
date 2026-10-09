import { LoginForm } from '../components/AuthForm'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { SyntheticEvent } from 'react'
import { login } from '../services/authService'

function LoginPage() {
  const navigate = useNavigate()
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
    await login({
      email,
      password,
    })

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
    <main className="auth-page">
      <div className="auth-decoration auth-decoration-left" aria-hidden="true" />
      <div className="auth-decoration auth-decoration-right" aria-hidden="true" />

      <section className="auth-card" aria-labelledby="login-title">
        <div className="auth-brand" aria-label="StudyOS">
          <span className="brand-icon" aria-hidden="true">S</span>
          <span>StudyOS</span>
        </div>
        <div className="auth-heading">
          <p className="eyebrow">Bentornato</p>
          <h1 id="login-title">Riprendi il tuo focus.</h1>
          <p>Accedi al tuo spazio di studio e continua da dove avevi lasciato.</p>
        </div>

        <LoginForm onSubmit={handleLogin} error={error} />
      </section>
    </main>
  )
}

export default LoginPage
