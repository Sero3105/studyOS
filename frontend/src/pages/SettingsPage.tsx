import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { Copy, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import PageHeader from '../components/ui/PageHeader'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '../components/ui/field'
import { Input } from '../components/ui/input'
import { NativeSelect, NativeSelectOption } from '../components/ui/native-select'
import { Switch } from '../components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '../components/ui/toggle-group'
import { ErrorNotice } from '../components/ui/Feedback'
import { useLanguage } from '../i18n/useLanguage'
import { LANGUAGES } from '../i18n/translations'
import type { Language, TranslationKey } from '../i18n/translations'
import { useAuth } from '../context/useAuth'
import { exportData, exportNotesVault, importData } from '../services/dataService'
import { createLink, getLinkStatus, linkUrl, revokeLink } from '../services/shareService'
import type { LinkKind } from '../services/shareService'
import { changePassword, deleteAccount } from '../services/accountService'
import { ApiError } from '../services/apiClient'
import { notificationsSupported, remindersEnabled, runDeadlineReminders, setRemindersEnabled } from '../utils/reminders'
import { chooseTheme as saveTheme, DEGREE_CFU_OPTIONS, degreeCfu, restDays, reviewsEnabled, setDegreeCfu, setRestDays, setReviewsEnabled, setTimerAlertsEnabled, timerAlertsEnabled } from '../utils/preferences'
import { getTheme } from '../utils/theme'
import type { Theme } from '../utils/theme'
import { validatePassword } from '../utils/password'
import { todayIso } from '../utils/dates'
import { errorMessage } from '../utils/errors'
import { saveBlob } from '../utils/download'

const SYNAPSE_URL = 'https://github.com/Sero3105/Synapse/releases/latest'

const themeKeys: Record<Theme, TranslationKey> = { dark: 'settings.themeDark', light: 'settings.themeLight', system: 'settings.themeSystem' }

const languageKeys: Record<Language, 'settings.italian' | 'settings.english'> = {
  it: 'settings.italian',
  en: 'settings.english',
}

type Run = (action: () => Promise<string>, fallback: string) => Promise<void>

/** Sezione impostazioni: titolo e spiegazione a sinistra, controlli a destra (sotto, su mobile). */
function Section({ id, title, description, children, danger = false }: { id: string; title: string; description: string; children: ReactNode; danger?: boolean }) {
  return (
    <section className={cn('grid gap-4 py-6 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] md:gap-10')} aria-labelledby={id}>
      <div className="flex flex-col gap-1">
        <h2 id={id} className={cn('text-sm font-medium', danger && 'text-destructive')}>{title}</h2>
        <p className="text-sm text-pretty text-muted-foreground">{description}</p>
      </div>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </section>
  )
}

function Toggle({ id, label, checked, disabled, onChange }: { id: string; label: string; checked: boolean; disabled?: boolean; onChange: (value: boolean) => void }) {
  return (
    <Field orientation="horizontal" className="justify-between rounded-lg border p-3">
      <FieldLabel htmlFor={id} className="font-normal">{label}</FieldLabel>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </Field>
  )
}

const choiceItem = 'data-[state=on]:bg-primary/10 data-[state=on]:text-primary'

function FileButton({ label, variant, disabled, onChange }: { label: string; variant: 'outline' | 'ghost'; disabled: boolean; onChange: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <Button variant={variant} asChild>
      <label aria-disabled={disabled} className="aria-disabled:pointer-events-none aria-disabled:opacity-50">
        {label}
        <input className="sr-only" type="file" accept="application/json,.json" disabled={disabled} onChange={onChange} />
      </label>
    </Button>
  )
}

/** Link segreto (condivisione o feed iCal): il token si vede solo alla creazione, poi si può rigenerare o revocare. */
function SecretLink({ kind, busy, run, prefix }: { kind: LinkKind; busy: boolean; run: Run; prefix: 'settings.share' | 'settings.feed' }) {
  const { t } = useLanguage()
  const [active, setActive] = useState(false)
  const [link, setLink] = useState('')
  const key = (suffix: string) => `${prefix}${suffix}` as TranslationKey

  useEffect(() => { getLinkStatus(kind).then((s) => setActive(s.active)).catch(() => {}) }, [kind])

  const create = () => run(async () => {
    setLink(linkUrl(kind, (await createLink(kind)).token)); setActive(true)
    return t('settings.linkCreated')
  }, t('settings.linkError'))

  const revoke = () => run(async () => {
    await revokeLink(kind); setLink(''); setActive(false)
    return t('settings.linkRevoked')
  }, t('settings.linkError'))

  return (
    <>
      {link && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input className="font-mono text-xs" readOnly value={link} aria-label={t(key('LinkLabel'))} onFocus={(e) => e.target.select()} />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void navigator.clipboard?.writeText(link)}><Copy data-icon="inline-start" aria-hidden="true" />{t('settings.copy')}</Button>
            {kind === 'calendar-feed' && <Button variant="outline" asChild><a href={link.replace(/^https?:/, 'webcal:')}>{t('settings.feedSubscribe')}</a></Button>}
          </div>
        </div>
      )}
      {active && !link && <p className="flex items-center gap-2 text-sm text-success"><span className="size-1.5 rounded-full bg-success" aria-hidden="true" />{t('settings.linkActive')}</p>}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={busy} onClick={() => void create()}>{active ? t('settings.linkRotate') : t(key('Create'))}</Button>
        {active && <Button variant="ghost" className="text-destructive hover:text-destructive" disabled={busy} onClick={() => void revoke()}>{t('settings.linkRevoke')}</Button>}
      </div>
    </>
  )
}

function AccountSection({ busy, run }: { busy: boolean; run: Run }) {
  const { t } = useLanguage()
  const { logout } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Codici di errore del backend (400) → messaggi tradotti.
  const wrongPassword = (e: unknown) => {
    if (e instanceof ApiError && e.message === 'wrong_password') throw new Error(t('settings.wrongPassword'))
    throw e
  }

  const submitPassword = (event: FormEvent) => {
    event.preventDefault()
    void run(async () => {
      const invalid = validatePassword(next, t)
      if (invalid) throw new Error(invalid)
      await changePassword(current, next).catch(wrongPassword)
      setCurrent(''); setNext('')
      return t('settings.passwordChanged')
    }, t('settings.passwordError'))
  }

  const submitDelete = (event: FormEvent) => {
    event.preventDefault()
    if (!window.confirm(t('settings.deleteConfirm'))) return
    void run(async () => {
      await deleteAccount(confirmPassword).catch(wrongPassword)
      await logout().catch(() => {})
      window.location.assign('/login')
      return ''
    }, t('settings.deleteError'))
  }

  return (
    <>
      <Section id="settings-account-title" title={t('settings.passwordTitle')} description={t('settings.accountDescription')}>
        <form onSubmit={submitPassword}>
          <FieldGroup className="gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="current-password">{t('settings.currentPassword')}</FieldLabel>
                <Input id="current-password" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} maxLength={128} />
              </Field>
              <Field>
                <FieldLabel htmlFor="new-password">{t('settings.newPassword')}</FieldLabel>
                <Input id="new-password" type="password" autoComplete="new-password" required value={next} onChange={(e) => setNext(e.target.value)} maxLength={128} />
              </Field>
            </div>
            <Button type="submit" variant="outline" className="self-start" disabled={busy || !current || !next}>{t('settings.passwordSubmit')}</Button>
          </FieldGroup>
        </form>
      </Section>

      <Section id="settings-delete-title" danger title={t('settings.deleteTitle')} description={t('settings.deleteDescription')}>
        <form onSubmit={submitDelete} className="flex flex-col gap-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <Field className="max-w-sm">
            <FieldLabel htmlFor="delete-password">{t('settings.confirmWithPassword')}</FieldLabel>
            <Input id="delete-password" type="password" autoComplete="current-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} maxLength={128} />
          </Field>
          <Button type="submit" variant="destructive" className="self-start" disabled={busy || !confirmPassword}>{t('settings.deleteSubmit')}</Button>
        </form>
      </Section>
    </>
  )
}

function SettingsPage() {
  const { language, setLanguage, t, locale } = useLanguage()
  const example = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date())
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [reminders, setReminders] = useState(remindersEnabled)
  const [reviews, setReviews] = useState(reviewsEnabled)
  const [timerAlerts, setTimerAlerts] = useState(timerAlertsEnabled)
  const [cfu, setCfu] = useState(degreeCfu)
  const [rest, setRest] = useState(restDays)
  // 1-7 gennaio 2024 = lunedì-domenica: nomi dei giorni nella lingua scelta.
  const weekdayName = (day: number) => new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(new Date(2024, 0, day))
  const [theme, setThemeState] = useState(getTheme)

  const run: Run = async (action, fallback) => {
    setBusy(true); setError('')
    try { const message = await action(); if (message) toast.success(message) } catch (e) { setError(errorMessage(e, fallback)) }
    finally { setBusy(false) }
  }

  const downloadBackup = () => run(async () => {
    saveBlob(new Blob([JSON.stringify(await exportData(), null, 2)], { type: 'application/json' }), `studyos-backup-${todayIso()}.json`)
    return t('settings.exportDone')
  }, t('settings.exportError'))

  const downloadVault = () => run(async () => {
    saveBlob(await exportNotesVault(language), 'studyos-notes.zip')
    return t('settings.vaultDone')
  }, t('subjects.vaultError'))

  const uploadBackup = (event: ChangeEvent<HTMLInputElement>, replace: boolean) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    void run(async () => {
      let data: unknown
      try { data = JSON.parse(await file.text()) } catch { throw new Error(t('settings.importInvalid')) }
      // Aggiungi duplica con un doppio import, sostituisci cancella i dati attuali: in entrambi i casi si conferma.
      const count = (key: string) => { const v = (data as Record<string, unknown> | null)?.[key]; return Array.isArray(v) ? v.length : 0 }
      const counts = { tasks: count('tasks'), exams: count('exams'), sessions: count('sessions'), subjects: count('subjects') }
      if (!window.confirm(t(replace ? 'settings.restoreConfirm' : 'settings.importConfirm', counts))) return ''
      const r = await importData(data, replace)
      return t('settings.importDone', { tasks: r.tasks, exams: r.exams, sessions: r.sessions, subjects: r.subjects })
    }, t('settings.importError'))
  }

  const toggleReminders = (enabled: boolean) => run(async () => {
    if (enabled && (await Notification.requestPermission()) !== 'granted') throw new Error(t('settings.remindersDenied'))
    setRemindersEnabled(enabled)
    setReminders(enabled)
    if (enabled) await runDeadlineReminders(t, locale)
    return enabled ? t('settings.remindersOn') : t('settings.remindersOff')
  }, t('settings.remindersDenied'))

  const toggleReviews = (enabled: boolean) => { setReviewsEnabled(enabled); setReviews(enabled) }
  const toggleTimerAlerts = (enabled: boolean) => {
    // La notifica è un extra: senza permesso resta il suono.
    if (enabled && notificationsSupported() && Notification.permission === 'default') void Notification.requestPermission()
    setTimerAlertsEnabled(enabled); setTimerAlerts(enabled)
  }
  const chooseCfu = (value: number) => { setDegreeCfu(value); setCfu(value) }
  const chooseTheme = (value: Theme) => { saveTheme(value); setThemeState(value) }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={t('settings.title')} description={t('settings.description')} />
      {error && <ErrorNotice message={error} onDismiss={() => setError('')} />}

      <Tabs defaultValue="general" className="gap-6">
        <TabsList className="w-full sm:w-fit">
          <TabsTrigger value="general">{t('settings.tabGeneral')}</TabsTrigger>
          <TabsTrigger value="data">{t('settings.tabData')}</TabsTrigger>
          <TabsTrigger value="account">{t('settings.accountTitle')}</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card><CardContent className="flex flex-col divide-y">
            <Section id="settings-language-title" title={t('settings.languageTitle')} description={t('settings.languageDescription')}>
              <ToggleGroup type="single" variant="outline" spacing={0} value={language} onValueChange={(value) => { if (value) setLanguage(value as Language) }} aria-label={t('settings.languageLabel')}>
                {LANGUAGES.map((option) => <ToggleGroupItem key={option} value={option} lang={option} className={choiceItem}>{t(languageKeys[option])}</ToggleGroupItem>)}
              </ToggleGroup>
              <p className="text-xs text-muted-foreground">{t('settings.currentDateExample', { date: example.charAt(0).toUpperCase() + example.slice(1) })}</p>
            </Section>

            <Section id="settings-theme-title" title={t('settings.themeTitle')} description={t('settings.themeDescription')}>
              <ToggleGroup type="single" variant="outline" spacing={0} value={theme} onValueChange={(value) => { if (value) chooseTheme(value as Theme) }} aria-label={t('settings.themeTitle')}>
                {(Object.keys(themeKeys) as Theme[]).map((option) => <ToggleGroupItem key={option} value={option} className={choiceItem}>{t(themeKeys[option])}</ToggleGroupItem>)}
              </ToggleGroup>
            </Section>

            <Section id="settings-reminders-title" title={t('settings.remindersTitle')} description={t('settings.remindersDescription')}>
              {notificationsSupported()
                ? <Toggle id="toggle-reminders" label={t('settings.remindersToggle')} checked={reminders} disabled={busy} onChange={(value) => void toggleReminders(value)} />
                : <p className="text-sm text-muted-foreground">{t('settings.remindersUnsupported')}</p>}
              <Toggle id="toggle-reviews" label={t('settings.reviewsToggle')} checked={reviews} onChange={toggleReviews} />
              <Toggle id="toggle-timer-alerts" label={t('settings.timerAlertsToggle')} checked={timerAlerts} onChange={toggleTimerAlerts} />
            </Section>

            <Section id="settings-degree-title" title={t('settings.degreeTitle')} description={t('settings.degreeDescription')}>
              <Field className="max-w-xs">
                <FieldLabel htmlFor="degree-cfu">{t('settings.degreeCfu')}</FieldLabel>
                <NativeSelect id="degree-cfu" className="w-full" value={cfu} onChange={(e) => chooseCfu(Number(e.target.value))}>
                  {DEGREE_CFU_OPTIONS.map((option) => <NativeSelectOption key={option} value={option}>{t(`settings.degreeCfu${option}`)}</NativeSelectOption>)}
                </NativeSelect>
              </Field>
            </Section>

            <Section id="settings-plan-title" title={t('settings.planTitle')} description={t('settings.planDescription')}>
              <FieldSet className="gap-2">
                <FieldLegend variant="label">{t('settings.restDays')}</FieldLegend>
                <ToggleGroup type="multiple" variant="outline" spacing={0} value={rest.map(String)} onValueChange={(values) => { const next = values.map(Number).sort(); setRestDays(next); setRest(next) }} className="w-full max-w-md [&>*]:flex-1 [&>*]:px-0">
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => <ToggleGroupItem key={day} value={String(day)} className={choiceItem}>{weekdayName(day)}</ToggleGroupItem>)}
                </ToggleGroup>
              </FieldSet>
              {rest.length > 0 && <p className="text-xs text-muted-foreground">{t('settings.restDaysSummary', { days: rest.map(weekdayName).join(', ') })}</p>}
            </Section>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="data">
          <Card><CardContent className="flex flex-col divide-y">
            <Section id="settings-data-title" title={t('settings.dataTitle')} description={t('settings.dataDescription')}>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" disabled={busy} onClick={() => void downloadBackup()}>{t('settings.exportButton')}</Button>
                <FileButton variant="outline" label={t('settings.importButton')} disabled={busy} onChange={(e) => uploadBackup(e, false)} />
                <FileButton variant="ghost" label={t('settings.restoreButton')} disabled={busy} onChange={(e) => uploadBackup(e, true)} />
              </div>
            </Section>

            <Section id="settings-feed-title" title={t('settings.feedTitle')} description={t('settings.feedDescription')}>
              <SecretLink kind="calendar-feed" prefix="settings.feed" busy={busy} run={run} />
            </Section>

            <Section id="settings-share-title" title={t('settings.shareTitle')} description={t('settings.shareDescription')}>
              <SecretLink kind="share" prefix="settings.share" busy={busy} run={run} />
            </Section>

            <Section id="settings-synapse-title" title={t('settings.synapseTitle')} description={t('settings.synapseDescription')}>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" disabled={busy} onClick={() => void downloadVault()}>{t('subjects.vaultButton')}</Button>
                <Button variant="outline" asChild>
                  <a href={SYNAPSE_URL} target="_blank" rel="noopener noreferrer">
                    {t('settings.synapseDownload')} <ExternalLink data-icon="inline-end" aria-hidden="true" />
                  </a>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{t('settings.synapseSteps')}</p>
            </Section>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="account">
          <Card><CardContent className="flex flex-col divide-y">
            <AccountSection busy={busy} run={run} />
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default SettingsPage
