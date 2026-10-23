import { useState } from 'react'
import type { ReactNode, SyntheticEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import { useLanguage } from '../i18n/useLanguage'

interface AuthFormProps {
  onSubmit?: (event: SyntheticEvent<HTMLFormElement>) => void | Promise<void>
  error?: string
}

interface AuthFieldProps {
  id: string
  label: string
  hint?: string
  children: ReactNode
}

function AuthField({ id, label, hint, children }: AuthFieldProps) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>{label}</label>
      {children}
      {hint && <span className="field-hint" id={`${id}-hint`}>{hint}</span>}
    </div>
  )
}

/** Campo password con pulsante per mostrare o nascondere il testo. */
function PasswordInput({ id, name, autoComplete, placeholder, describedBy }: {
  id: string
  name: string
  autoComplete: string
  placeholder: string
  describedBy?: string
}) {
  const { t } = useLanguage()
  const [visible, setVisible] = useState(false)
  return (
    <div className="password-input">
      <input
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-describedby={describedBy}
        required
      />
      <button
        className="icon-btn"
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t('auth.hidePassword') : t('auth.showPassword')}
        aria-pressed={visible}
      >
        {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
      </button>
    </div>
  )
}

/**
 * Invio con stato di attesa: il pulsante si disattiva finché la richiesta
 * non risponde, così un doppio clic non manda due richieste.
 */
function useSubmitting(onSubmit?: AuthFormProps['onSubmit']) {
  const [submitting, setSubmitting] = useState(false)
  const handle = async (event: SyntheticEvent<HTMLFormElement>) => {
    if (!onSubmit) return
    setSubmitting(true)
    try {
      await onSubmit(event)
    } finally {
      setSubmitting(false)
    }
  }
  return { submitting, handle }
}

function AuthSubmit({ children, submitting }: { children: ReactNode; submitting: boolean }) {
  const { t } = useLanguage()
  return (
    <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={submitting}>
      {submitting ? t('auth.wait') : children}
      {!submitting && <ArrowRight aria-hidden="true" />}
    </button>
  )
}

function AuthError({ error }: { error?: string }) {
  return error ? <p className="notice notice-error" role="alert">{error}</p> : null
}

export function LoginForm({ onSubmit, error }: AuthFormProps) {
  const { t } = useLanguage()
  const { submitting, handle } = useSubmitting(onSubmit)
  return (
    <form className="auth-form" onSubmit={handle} noValidate>
      <AuthField id="email" label={t('auth.email')}>
        <input
          id="email"
          className="input"
          name="email"
          type="email"
          autoComplete="email"
          placeholder={t('auth.emailPlaceholder')}
          required
        />
      </AuthField>

      <AuthField id="password" label={t('auth.password')}>
        <PasswordInput id="password" name="password" autoComplete="current-password" placeholder={t('auth.yourPassword')} />
      </AuthField>

      <AuthError error={error} />

      <AuthSubmit submitting={submitting}>{t('auth.loginSubmit')}</AuthSubmit>

      <p className="auth-switch">
        {t('auth.noAccount')} <Link to="/register">{t('auth.registerLink')}</Link>
      </p>
    </form>
  )
}

export function RegisterForm({ onSubmit, error }: AuthFormProps) {
  const { t } = useLanguage()
  const { submitting, handle } = useSubmitting(onSubmit)
  return (
    <form className="auth-form" onSubmit={handle} noValidate>
      <div className="form-grid">
        <AuthField id="username" label={t('auth.username')}>
          <input
            id="username"
            className="input"
            name="username"
            type="text"
            autoComplete="username"
            maxLength={50}
            placeholder={t('auth.usernamePlaceholder')}
            required
          />
        </AuthField>

        <AuthField id="full-name" label={t('auth.fullName')}>
          <input
            id="full-name"
            className="input"
            name="full_name"
            type="text"
            autoComplete="name"
            placeholder={t('auth.optionalPlaceholder')}
          />
        </AuthField>
      </div>

      <AuthField id="register-email" label={t('auth.email')}>
        <input
          id="register-email"
          className="input"
          name="email"
          type="email"
          autoComplete="email"
          placeholder={t('auth.emailPlaceholder')}
          required
        />
      </AuthField>

      <AuthField
        id="register-password"
        label={t('auth.password')}
        hint={t('auth.passwordHint')}
      >
        <PasswordInput
          id="register-password"
          name="password"
          autoComplete="new-password"
          placeholder={t('auth.createPassword')}
          describedBy="register-password-hint"
        />
      </AuthField>

      <AuthField id="confirm-password" label={t('auth.confirmPassword')}>
        <PasswordInput id="confirm-password" name="confirmPassword" autoComplete="new-password" placeholder={t('auth.repeatPassword')} />
      </AuthField>

      <AuthError error={error} />

      <AuthSubmit submitting={submitting}>{t('auth.createAccount')}</AuthSubmit>

      <p className="auth-switch">
        {t('auth.haveAccount')} <Link to="/login">{t('auth.loginSubmit')}</Link>
      </p>
    </form>
  )
}
