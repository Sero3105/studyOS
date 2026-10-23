import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
import PageHeader from '../components/ui/PageHeader'
import { ErrorNotice } from '../components/ui/Feedback'
import { useLanguage } from '../i18n/useLanguage'
import { LANGUAGES } from '../i18n/translations'
import type { Language } from '../i18n/translations'
import { exportData, importData } from '../services/dataService'
import { createShareLink, getShareStatus, revokeShareLink, shareUrl } from '../services/shareService'
import { notificationsSupported, remindersEnabled, runDeadlineReminders, setRemindersEnabled } from '../utils/reminders'
import { todayIso } from '../utils/dates'
import { errorMessage } from '../utils/errors'

const languageKeys: Record<Language, 'settings.italian' | 'settings.english'> = {
  it: 'settings.italian',
  en: 'settings.english',
}

function SettingsPage() {
  const { language, setLanguage, t, locale } = useLanguage()
  const example = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date())
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [reminders, setReminders] = useState(remindersEnabled)
  const [shareActive, setShareActive] = useState(false)
  const [link, setLink] = useState('')

  useEffect(() => { getShareStatus().then((s) => setShareActive(s.active)).catch(() => {}) }, [])

  const run = async (action: () => Promise<string>, fallback: string) => {
    setBusy(true); setError(''); setNotice('')
    try { setNotice(await action()) } catch (e) { setError(errorMessage(e, fallback)) }
    finally { setBusy(false) }
  }

  const downloadBackup = () => run(async () => {
    const blob = new Blob([JSON.stringify(await exportData(), null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `studyos-backup-${todayIso()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    return t('settings.exportDone')
  }, t('settings.exportError'))

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

  const newLink = () => run(async () => {
    const { token } = await createShareLink()
    setLink(shareUrl(token)); setShareActive(true)
    return t('settings.shareCreated')
  }, t('settings.shareError'))

  const revokeLink = () => run(async () => {
    await revokeShareLink()
    setLink(''); setShareActive(false)
    return t('settings.shareRevoked')
  }, t('settings.shareError'))

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

      <section className="panel" aria-labelledby="settings-reminders-title">
        <h2 id="settings-reminders-title" className="panel-title">{t('settings.remindersTitle')}</h2>
        <p className="settings-description">{t('settings.remindersDescription')}</p>
        {notificationsSupported() ? (
          <label className="settings-toggle">
            <input type="checkbox" className="check" checked={reminders} disabled={busy} onChange={(e) => void toggleReminders(e.target.checked)} />
            <span>{t('settings.remindersToggle')}</span>
          </label>
        ) : <p className="panel-meta">{t('settings.remindersUnsupported')}</p>}
      </section>

      <section className="panel" aria-labelledby="settings-data-title">
        <h2 id="settings-data-title" className="panel-title">{t('settings.dataTitle')}</h2>
        <p className="settings-description">{t('settings.dataDescription')}</p>
        <div className="settings-actions">
          <button className="btn btn-primary" type="button" disabled={busy} onClick={() => void downloadBackup()}>{t('settings.exportButton')}</button>
          <label className={`btn btn-secondary${busy ? ' is-disabled' : ''}`}>
            {t('settings.importButton')}
            <input className="visually-hidden" type="file" accept="application/json,.json" disabled={busy} onChange={uploadBackup} />
          </label>
        </div>
      </section>

      <section className="panel" aria-labelledby="settings-share-title">
        <h2 id="settings-share-title" className="panel-title">{t('settings.shareTitle')}</h2>
        <p className="settings-description">{t('settings.shareDescription')}</p>
        {link && (
          <div className="settings-actions">
            <input className="input settings-link" readOnly value={link} aria-label={t('settings.shareLinkLabel')} onFocus={(e) => e.target.select()} />
            <button className="btn btn-secondary" type="button" onClick={() => void navigator.clipboard?.writeText(link).then(() => setNotice(t('settings.shareCopied')))}>{t('settings.shareCopy')}</button>
          </div>
        )}
        {shareActive && !link && <p className="panel-meta">{t('settings.shareActive')}</p>}
        <div className="settings-actions">
          <button className="btn btn-primary" type="button" disabled={busy} onClick={() => void newLink()}>{shareActive ? t('settings.shareRotate') : t('settings.shareCreate')}</button>
          {shareActive && <button className="btn btn-ghost" type="button" disabled={busy} onClick={() => void revokeLink()}>{t('settings.shareRevoke')}</button>}
        </div>
      </section>
    </div>
  )
}

export default SettingsPage
