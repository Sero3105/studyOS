import PageHeader from '../components/ui/PageHeader'
import { useLanguage } from '../i18n/useLanguage'
import { LANGUAGES } from '../i18n/translations'
import type { Language } from '../i18n/translations'

const languageKeys: Record<Language, 'settings.italian' | 'settings.english'> = {
  it: 'settings.italian',
  en: 'settings.english',
}

function SettingsPage() {
  const { language, setLanguage, t, locale } = useLanguage()
  const example = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date())

  return (
    <div className="page settings-page">
      <PageHeader title={t('settings.title')} description={t('settings.description')} />
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
    </div>
  )
}

export default SettingsPage
