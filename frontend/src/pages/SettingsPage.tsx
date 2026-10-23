import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { ExternalLink } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
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
import { reviewsEnabled, setReviewsEnabled } from '../utils/preferences'
import { validatePassword } from '../utils/password'
import { todayIso } from '../utils/dates'
import { errorMessage } from '../utils/errors'
import { saveBlob } from '../utils/download'

const SYNAPSE_URL = 'https://github.com/Sero3105/Synapse/releases/latest'

const languageKeys: Record<Language, 'settings.italian' | 'settings.english'> = {
  it: 'settings.italian',
  en: 'settings.english',
}

type Run = (action: () => Promise<string>, fallback: string) => Promise<void>

function Section({ id, title, description, children }: { id: string; title: string; description: string; children: ReactNode }) {
  return (
    <section className="panel" aria-labelledby={id}>
      <h2 id={id} className="panel-title">{title}</h2>
      <p className="settings-description">{description}</p>
      {children}
    </section>
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
        <div className="settings-actions">
          <input className="input settings-link" readOnly value={link} aria-label={t(key('LinkLabel'))} onFocus={(e) => e.target.select()} />
          <button className="btn btn-secondary" type="button" onClick={() => void navigator.clipboard?.writeText(link)}>{t('settings.copy')}</button>
          {kind === 'calendar-feed' && <a className="btn btn-secondary" href={link.replace(/^https?:/, 'webcal:')}>{t('settings.feedSubscribe')}</a>}
        </div>
      )}
      {active && !link && <p className="panel-meta">{t('settings.linkActive')}</p>}
      <div className="settings-actions">
        <button className="btn btn-primary" type="button" disabled={busy} onClick={() => void create()}>{active ? t('settings.linkRotate') : t(key('Create'))}</button>
        {active && <button className="btn btn-ghost" type="button" disabled={busy} onClick={() => void revoke()}>{t('settings.linkRevoke')}</button>}
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
    <Section id="settings-account-title" title={t('settings.accountTitle')} description={t('settings.accountDescription')}>
      <form className="settings-form" onSubmit={submitPassword}>
        <h3 className="settings-subtitle">{t('settings.passwordTitle')}</h3>
        <div className="form-grid">
          <label className="field">
            <span className="field-label">{t('settings.currentPassword')}</span>
            <input type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} maxLength={128} />
          </label>
          <label className="field">
            <span className="field-label">{t('settings.newPassword')}</span>
            <input type="password" autoComplete="new-password" required value={next} onChange={(e) => setNext(e.target.value)} maxLength={128} />
          </label>
        </div>
        <div className="settings-actions">
          <button className="btn btn-primary" type="submit" disabled={busy || !current || !next}>{t('settings.passwordSubmit')}</button>
        </div>
      </form>

      <form className="settings-form settings-danger" onSubmit={submitDelete}>
        <h3 className="settings-subtitle">{t('settings.deleteTitle')}</h3>
        <p className="settings-description">{t('settings.deleteDescription')}</p>
        <label className="field form-narrow">
          <span className="field-label">{t('settings.confirmWithPassword')}</span>
          <input type="password" autoComplete="current-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} maxLength={128} />
        </label>
        <div className="settings-actions">
          <button className="btn btn-danger" type="submit" disabled={busy || !confirmPassword}>{t('settings.deleteSubmit')}</button>
        </div>
      </form>
    </Section>
  )
}

function SettingsPage() {
  const { language, setLanguage, t, locale } = useLanguage()
  const example = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date())
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [reminders, setReminders] = useState(remindersEnabled)
  const [reviews, setReviews] = useState(reviewsEnabled)

  const run: Run = async (action, fallback) => {
    setBusy(true); setError(''); setNotice('')
    try { setNotice(await action()) } catch (e) { setError(errorMessage(e, fallback)) }
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

  const uploadBackup = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    void run(async () => {
      let data: unknown
      try { data = JSON.parse(await file.text()) } catch { throw new Error(t('settings.importInvalid')) }
      const r = await importData(data)
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

  return (
    <div className="page settings-page">
      <PageHeader title={t('settings.title')} description={t('settings.description')} />
      {error && <ErrorNotice message={error} onDismiss={() => setError('')} />}
      {notice && <div className="notice notice-success" role="status">{notice}</div>}

      <section className="panel" aria-labelledby="settings-language-title">
        <h2 id="settings-language-title" className="panel-title">{t('settings.languageTitle')}</h2>
        <p className="settings-description">{t('settings.languageDescription')}</p>
        <fieldset className="settings-language">
          <legend className="field-label">{t('settings.languageLabel')}</legend>
          <div className="settings-language-options" role="radiogroup" aria-label={t('settings.languageLabel')}>
            {LANGUAGES.map((option) => (
              <label key={option} className={`settings-language-option${language === option ? ' is-selected' : ''}`}>
                <input
                  type="radio"
                  name="language"
                  value={option}
                  lang={option}
                  checked={language === option}
                  onChange={() => setLanguage(option)}
                />
                <span>{t(languageKeys[option])}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <p className="panel-meta">{t('settings.currentDateExample', { date: example.charAt(0).toUpperCase() + example.slice(1) })}</p>
      </section>

      <Section id="settings-reminders-title" title={t('settings.remindersTitle')} description={t('settings.remindersDescription')}>
        {notificationsSupported() ? (
          <label className="settings-toggle">
            <input type="checkbox" className="check" checked={reminders} disabled={busy} onChange={(e) => void toggleReminders(e.target.checked)} />
            <span>{t('settings.remindersToggle')}</span>
          </label>
        ) : <p className="panel-meta">{t('settings.remindersUnsupported')}</p>}
        <label className="settings-toggle">
          <input type="checkbox" className="check" checked={reviews} onChange={(e) => toggleReviews(e.target.checked)} />
          <span>{t('settings.reviewsToggle')}</span>
        </label>
      </Section>

      <Section id="settings-feed-title" title={t('settings.feedTitle')} description={t('settings.feedDescription')}>
        <SecretLink kind="calendar-feed" prefix="settings.feed" busy={busy} run={run} />
      </Section>

      <Section id="settings-data-title" title={t('settings.dataTitle')} description={t('settings.dataDescription')}>
        <div className="settings-actions">
          <button className="btn btn-primary" type="button" disabled={busy} onClick={() => void downloadBackup()}>{t('settings.exportButton')}</button>
          <label className={`btn btn-secondary${busy ? ' is-disabled' : ''}`}>
            {t('settings.importButton')}
            <input className="visually-hidden" type="file" accept="application/json,.json" disabled={busy} onChange={uploadBackup} />
          </label>
        </div>
      </Section>

      <Section id="settings-synapse-title" title={t('settings.synapseTitle')} description={t('settings.synapseDescription')}>
        <div className="settings-actions">
          <button className="btn btn-primary" type="button" disabled={busy} onClick={() => void downloadVault()}>{t('subjects.vaultButton')}</button>
          <a className="btn btn-secondary" href={SYNAPSE_URL} target="_blank" rel="noopener noreferrer">
            {t('settings.synapseDownload')} <ExternalLink aria-hidden="true" />
          </a>
        </div>
        <p className="panel-meta">{t('settings.synapseSteps')}</p>
      </Section>

      <Section id="settings-share-title" title={t('settings.shareTitle')} description={t('settings.shareDescription')}>
        <SecretLink kind="share" prefix="settings.share" busy={busy} run={run} />
      </Section>

      <AccountSection busy={busy} run={run} />
    </div>
  )
}

export default SettingsPage
