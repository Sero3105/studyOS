import { useState } from 'react'
import type { ReactNode, SyntheticEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'

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
        aria-label={visible ? 'Nascondi password' : 'Mostra password'}
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
  return (
    <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={submitting}>
      {submitting ? 'Attendi…' : children}
      {!submitting && <ArrowRight aria-hidden="true" />}
    </button>
  )
}

function AuthError({ error }: { error?: string }) {
  return error ? <p className="notice notice-error" role="alert">{error}</p> : null
}

export function LoginForm({ onSubmit, error }: AuthFormProps) {
  const { submitting, handle } = useSubmitting(onSubmit)
  return (
    <form className="auth-form" onSubmit={handle} noValidate>
      <AuthField id="email" label="Email">
        <input
          id="email"
          className="input"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="nome@esempio.it"
          required
        />
      </AuthField>

      <AuthField id="password" label="Password">
        <PasswordInput id="password" name="password" autoComplete="current-password" placeholder="La tua password" />
      </AuthField>

      <AuthError error={error} />

      <AuthSubmit submitting={submitting}>Accedi</AuthSubmit>

      <p className="auth-switch">
        Non hai un account? <Link to="/register">Registrati</Link>
      </p>
    </form>
  )
}

export function RegisterForm({ onSubmit, error }: AuthFormProps) {
  const { submitting, handle } = useSubmitting(onSubmit)
  return (
    <form className="auth-form" onSubmit={handle} noValidate>
      <div className="form-grid">
        <AuthField id="username" label="Username">
          <input
            id="username"
            className="input"
            name="username"
            type="text"
            autoComplete="username"
            placeholder="Es. giulia.r"
            required
          />
        </AuthField>

        <AuthField id="full-name" label="Nome completo">
          <input
            id="full-name"
            className="input"
            name="full_name"
            type="text"
            autoComplete="name"
            placeholder="Facoltativo"
          />
        </AuthField>
      </div>

      <AuthField id="register-email" label="Email">
        <input
          id="register-email"
          className="input"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="nome@esempio.it"
          required
        />
      </AuthField>

      <AuthField
        id="register-password"
        label="Password"
        hint="Almeno 8 caratteri, con maiuscola, minuscola, numero e simbolo."
      >
        <PasswordInput
          id="register-password"
          name="password"
          autoComplete="new-password"
          placeholder="Crea una password"
          describedBy="register-password-hint"
        />
      </AuthField>

      <AuthField id="confirm-password" label="Conferma password">
        <PasswordInput id="confirm-password" name="confirmPassword" autoComplete="new-password" placeholder="Ripeti la password" />
      </AuthField>

      <AuthError error={error} />

      <AuthSubmit submitting={submitting}>Crea account</AuthSubmit>

      <p className="auth-switch">
        Hai già un account? <Link to="/login">Accedi</Link>
      </p>
    </form>
  )
}
