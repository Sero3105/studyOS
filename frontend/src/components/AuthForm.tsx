import { useState } from 'react'
import type { ReactNode, SyntheticEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CircleAlert, Eye, EyeOff } from 'lucide-react'
import { Alert, AlertDescription } from './ui/alert'
import { Button } from './ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel } from './ui/field'
import { Input } from './ui/input'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from './ui/input-group'
import { Spinner } from './ui/spinner'
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
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children}
      {hint && <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>}
    </Field>
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
    <InputGroup>
      <InputGroupInput
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-describedby={describedBy}
        required
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-xs"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t('auth.hidePassword') : t('auth.showPassword')}
          aria-pressed={visible}
        >
          {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}

/** Invio con stato di attesa: il pulsante si disattiva finché la richiesta non risponde. */
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
    <Button size="lg" type="submit" disabled={submitting} className="w-full">
      {submitting ? <><Spinner data-icon="inline-start" /> {t('auth.wait')}</> : <>{children} <ArrowRight data-icon="inline-end" aria-hidden="true" /></>}
    </Button>
  )
}

function AuthError({ error }: { error?: string }) {
  return error ? (
    <Alert variant="destructive" role="alert">
      <CircleAlert aria-hidden="true" />
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  ) : null
}

function AuthSwitch({ text, to, label }: { text: string; to: string; label: string }) {
  return (
    <p className="text-center text-sm text-muted-foreground">
      {text}{' '}
      <Link className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline" to={to}>{label}</Link>
    </p>
  )
}

export function LoginForm({ onSubmit, error }: AuthFormProps) {
  const { t } = useLanguage()
  const { submitting, handle } = useSubmitting(onSubmit)
  return (
    <form onSubmit={handle} noValidate>
      <FieldGroup>
        <AuthField id="email" label={t('auth.email')}>
          <Input id="email" name="email" type="email" autoComplete="email" placeholder={t('auth.emailPlaceholder')} required />
        </AuthField>
        <AuthField id="password" label={t('auth.password')}>
          <PasswordInput id="password" name="password" autoComplete="current-password" placeholder={t('auth.yourPassword')} />
        </AuthField>
        <AuthError error={error} />
        <AuthSubmit submitting={submitting}>{t('auth.loginSubmit')}</AuthSubmit>
        <AuthSwitch text={t('auth.noAccount')} to="/register" label={t('auth.registerLink')} />
      </FieldGroup>
    </form>
  )
}

export function RegisterForm({ onSubmit, error }: AuthFormProps) {
  const { t } = useLanguage()
  const { submitting, handle } = useSubmitting(onSubmit)
  return (
    <form onSubmit={handle} noValidate>
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <AuthField id="username" label={t('auth.username')}>
            <Input id="username" name="username" type="text" autoComplete="username" maxLength={50} placeholder={t('auth.usernamePlaceholder')} required />
          </AuthField>
          <AuthField id="full-name" label={t('auth.fullName')}>
            <Input id="full-name" name="full_name" type="text" autoComplete="name" placeholder={t('auth.optionalPlaceholder')} />
          </AuthField>
        </div>
        <AuthField id="register-email" label={t('auth.email')}>
          <Input id="register-email" name="email" type="email" autoComplete="email" placeholder={t('auth.emailPlaceholder')} required />
        </AuthField>
        <AuthField id="register-password" label={t('auth.password')} hint={t('auth.passwordHint')}>
          <PasswordInput id="register-password" name="password" autoComplete="new-password" placeholder={t('auth.createPassword')} describedBy="register-password-hint" />
        </AuthField>
        <AuthField id="confirm-password" label={t('auth.confirmPassword')}>
          <PasswordInput id="confirm-password" name="confirmPassword" autoComplete="new-password" placeholder={t('auth.repeatPassword')} />
        </AuthField>
        <AuthError error={error} />
        <AuthSubmit submitting={submitting}>{t('auth.createAccount')}</AuthSubmit>
        <AuthSwitch text={t('auth.haveAccount')} to="/login" label={t('auth.loginSubmit')} />
      </FieldGroup>
    </form>
  )
}
