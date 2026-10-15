import { useContext } from 'react'
import { LanguageContext } from './languageContext'

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) throw new Error('useLanguage must be used within LanguageProvider')
  return context
}
