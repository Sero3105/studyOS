import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { RegisterForm } from '../components/AuthForm'
import { register } from '../services/authService'
import type { SyntheticEvent } from 'react'

function validatePassword(password: string): string | null {
  const rules = [
    {
      isInvalid: password.length < 8,
      message: 'La password deve contenere almeno 8 caratteri.',
    },
    {
      isInvalid: !/[A-Z]/.test(password),
      message: 'La password deve contenere almeno una lettera maiuscola.',
    },
    {
      isInvalid: !/[a-z]/.test(password),
      message: 'La password deve contenere almeno una lettera minuscola.',
    },
    {
      isInvalid: !/\d/.test(password),
      message: 'La password deve contenere almeno un numero.',
    },
    {
      isInvalid: !/[^A-Za-z0-9]/.test(password),
      message: 'La password deve contenere almeno un carattere speciale.',
    },
  ]

  return rules.find((rule) => rule.isInvalid)?.message ?? null
}

function RegisterPage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  const handleRegister = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    const formData = new FormData(event.currentTarget)

    const username = String(formData.get('username') ?? '').trim()
    const email = String(formData.get('email') ?? '').trim()
    const full_name = String(formData.get('full_name') ?? '').trim()
    const password = String(formData.get('password') ?? '')
    const confirmPassword = String(formData.get('confirmPassword') ?? '')

    if (!username || !email || !password) {
      setError('Compila tutti i campi obbligatori.')
      return
    }

    if (password !== confirmPassword) {
      setError('Le password non coincidono.')
      return
    }

    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      return
    }

    try {
      await register({
        username,
        email,
        full_name,
        password,
      })

      navigate('/login', { state: { registered: true } })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Si è verificato un errore durante la registrazione.',
      )
    }
  }

  return (
    <AuthLayout title="Crea il tuo account" description="Un unico spazio per sessioni, esami, task e progressi.">
      <RegisterForm onSubmit={handleRegister} error={error} />
    </AuthLayout>
  )
}

export default RegisterPage
