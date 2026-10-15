import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { LanguageContext } from './languageContext'
import { LANGUAGE_STORAGE_KEY, LOCALES, resolveInitialLanguage, translate } from './translations'
import type { Language, TranslateParams, TranslationKey } from './translations'

function storedLanguage(): string | null {
  try { return localStorage.getItem(LANGUAGE_STORAGE_KEY) } catch { return null }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() =>
    resolveInitialLanguage(storedLanguage(), typeof navigator === 'undefined' ? null : navigator.language),
  )
  const locale = LOCALES[language]

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next)
    try { localStorage.setItem(LANGUAGE_STORAGE_KEY, next) } catch { /* private mode: keep in-memory choice */ }
  }, [])

  useEffect(() => { document.documentElement.lang = language }, [language])

  const value = useMemo(() => ({
    language,
    locale,
    setLanguage,
    t: (key: TranslationKey, params?: TranslateParams) => translate(language, key, params),
    formatNumber: (v: number) => new Intl.NumberFormat(locale).format(v),
    formatDate: (date: Date, options?: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, options).format(date),
  }), [language, locale, setLanguage])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
