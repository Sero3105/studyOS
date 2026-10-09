import type { ReactNode, SyntheticEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ContactRound,
  Fingerprint,
  Mail,
  UserRound,
} from 'lucide-react'

interface AuthFormProps {
  onSubmit?: (event: SyntheticEvent<HTMLFormElement>) => void
  error?: string
}

interface AuthFieldProps {
  id: string
  label: string
  icon: ReactNode
  children: ReactNode
}

function AuthField({ id, label, icon, children }: AuthFieldProps) {
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>

      <div className="input-wrapper">
        <span className="input-icon" aria-hidden="true">
          {icon}
        </span>

        {children}
      </div>
    </div>
  )
}

function AuthSubmit({ children }: { children: ReactNode }) {
  return (
    <button className="auth-submit" type="submit">
      <span>{children}</span>
      <ArrowRight aria-hidden="true" />
    </button>
  )
}

function AuthFooter({
  children,
  to,
  linkLabel,
}: {
  children: ReactNode
  to: string
  linkLabel: string
}) {
  return (
    <p className="auth-switch">
      {children}{' '}
      <Link to={to}>{linkLabel}</Link>
    </p>
  )
}

export function LoginForm({ onSubmit, error }: AuthFormProps) {
  return (
    <form className="auth-form auth-form-login" onSubmit={onSubmit}>
      <AuthField id="email" label="Email" icon={<Mail />}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="nome@esempio.it"
        />
      </AuthField>

      <AuthField id="password" label="Password" icon={<Fingerprint />}>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Inserisci la password"
        />
      </AuthField>

      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}

      <AuthSubmit>Accedi</AuthSubmit>

      <AuthFooter to="/register" linkLabel="Registrati">
        Non hai ancora un account?
      </AuthFooter>
    </form>
  )
}

export function RegisterForm({ onSubmit, error }: AuthFormProps) {
  return (
    <form className="auth-form auth-form-register" onSubmit={onSubmit}>
      <AuthField id="username" label="Username" icon={<ContactRound />}>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          placeholder="Scegli un username"
        />
      </AuthField>

      <AuthField id="register-email" label="Email" icon={<Mail />}>
        <input
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="nome@esempio.it"
        />
      </AuthField>

      <AuthField id="full-name" label="Nome completo" icon={<UserRound />}>
        <input
          id="full-name"
          name="full_name"
          type="text"
          autoComplete="name"
          placeholder="Il tuo nome e cognome"
        />
      </AuthField>

      <div className="register-password-grid">
        <AuthField
          id="register-password"
          label="Password"
          icon={<Fingerprint />}
        >
          <input
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Crea una password"
          />
        </AuthField>

        <AuthField
          id="confirm-password"
          label="Conferma"
          icon={<Fingerprint />}
        >
          <input
            id="confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Ripetila"
          />
        </AuthField>
      </div>

      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}

      <AuthSubmit>Crea account</AuthSubmit>

      <AuthFooter to="/login" linkLabel="Accedi">
        Hai già un account?
      </AuthFooter>
    </form>
  )
}