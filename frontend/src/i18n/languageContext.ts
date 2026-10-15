import { createContext } from 'react'
import type { Language, Translate } from './translations'

export interface LanguageContextValue {
  language: Language
  locale: string
  setLanguage: (language: Language) => void
  t: Translate
  formatNumber: (value: number) => string
  formatDate: (date: Date, options?: Intl.DateTimeFormatOptions) => string
}

export const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)
