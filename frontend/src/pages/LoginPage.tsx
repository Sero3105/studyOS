import { LoginForm } from '../components/AuthForm'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CircleCheck } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'
import { Alert, AlertDescription } from '../components/ui/alert'
import type { SyntheticEvent } from 'react'
import { useAuth } from '../context/useAuth'
import { useLanguage } from '../i18n/useLanguage'

function LoginPage() {
  const { t } = useLanguage()
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
      setError(t('auth.loginMissing'))
      return
    }

    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('auth.loginErrorFallback'),
      )
    }
  }

  return (
    <AuthLayout title={t('auth.loginTitle')} description={t('auth.loginDescription')}>
      {justRegistered && !error && (
        <Alert role="status" className="border-success/30 text-success">
          <CircleCheck aria-hidden="true" />
          <AlertDescription className="text-success">{t('auth.registeredNotice')}</AlertDescription>
        </Alert>
      )}
      <LoginForm onSubmit={handleLogin} error={error} />
    </AuthLayout>
  )
}

export default LoginPage
