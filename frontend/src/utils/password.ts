import type { Translate } from '../i18n/translations'

/** Regole della password (registrazione e cambio password): primo errore o null. */
export function validatePassword(password: string, t: Translate): string | null {
  const rules = [
    {
      isInvalid: password.length < 8,
      message: t('auth.pwMin'),
    },
    {
      isInvalid: !/[A-Z]/.test(password),
      message: t('auth.pwUpper'),
    },
    {
      isInvalid: !/[a-z]/.test(password),
      message: t('auth.pwLower'),
    },
    {
      isInvalid: !/\d/.test(password),
      message: t('auth.pwDigit'),
    },
    {
      isInvalid: !/[^A-Za-z0-9]/.test(password),
      message: t('auth.pwSpecial'),
    },
  ]

  return rules.find((rule) => rule.isInvalid)?.message ?? null
}
