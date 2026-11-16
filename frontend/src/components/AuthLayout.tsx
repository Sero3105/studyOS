import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import BrandMark from './BrandMark'
import { useLanguage } from '../i18n/useLanguage'

interface AuthLayoutProps {
  title: string
  description: string
  children: ReactNode
}

/**
 * Struttura comune di accesso e registrazione. Su schermi larghi: a sinistra
 * il marchio e cosa fa StudyOS su una griglia tecnica, a destra il modulo.
 * Su mobile resta solo il modulo, con il marchio in alto.
 */
function AuthLayout({ title, description, children }: AuthLayoutProps) {
  const { t } = useLanguage()
  useEffect(() => {
    document.title = `${title} · StudyOS`
  }, [title])

  const points = [t('auth.pointSubjects'), t('auth.pointExams'), t('auth.pointTimer'), t('auth.pointStats')]

  return (
    <main className="grid min-h-svh bg-background lg:grid-cols-[1.1fr_1fr]">
      <section
        aria-label="StudyOS"
        className="relative hidden flex-col justify-between overflow-hidden border-r bg-sidebar p-12 lg:flex"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[48px_48px] mask-[radial-gradient(ellipse_at_30%_40%,black_20%,transparent_75%)]"
        />
        <div aria-hidden="true" className="pointer-events-none absolute -top-40 -left-40 size-[480px] rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex items-center gap-2.5 text-lg font-semibold tracking-tight">
          <BrandMark className="size-9" />
          StudyOS
        </div>
        <div className="relative flex max-w-md flex-col gap-8">
          <p className="text-4xl leading-tight font-semibold tracking-tight text-balance">{t('auth.statement')}</p>
          <ul className="flex flex-col gap-3">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-3 text-sm text-muted-foreground">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                  <Check className="size-3.5" aria-hidden="true" />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative font-mono text-xs tracking-wider text-muted-foreground uppercase">Focus · Plan · Review</p>
      </section>

      <section className="flex items-center justify-center px-4 py-12 sm:px-8" aria-labelledby="auth-title">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <div className="flex items-center gap-2.5 font-semibold tracking-tight lg:hidden">
            <BrandMark className="size-8" />
            StudyOS
          </div>
          <header className="flex flex-col gap-1.5">
            <h1 id="auth-title" className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </header>
          {children}
        </div>
      </section>
    </main>
  )
}

export default AuthLayout
