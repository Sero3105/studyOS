import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { RegisterForm } from '../components/AuthForm'
import { register } from '../services/authService'
import { useLanguage } from '../i18n/useLanguage'
import { validatePassword } from '../utils/password'
import type { SyntheticEvent } from 'react'

function RegisterPage() {
  const { t } = useLanguage()
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
      setError(t('auth.requiredFields'))
      return
    }

    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'))
      return
    }

    const passwordError = validatePassword(password, t)
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
          : t('auth.registerErrorFallback'),
      )
    }
  }

  return (
    <AuthLayout title={t('auth.registerTitle')} description={t('auth.registerDescription')}>
      <RegisterForm onSubmit={handleRegister} error={error} />
    </AuthLayout>
  )
}

export default RegisterPage
