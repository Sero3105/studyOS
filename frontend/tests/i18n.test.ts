import { test } from 'node:test'
import assert from 'node:assert/strict'

import { resolveInitialLanguage, translate, translations } from '../src/i18n/translations.ts'

import { formatDay, formatNumber, relativeDay } from '../src/utils/dates.ts'

test('italian and english differ and are complete', () => {
  const itKeys = Object.keys(translations.it).sort()
  const enKeys = Object.keys(translations.en).sort()
  assert.deepEqual(enKeys, itKeys)
  for (const key of itKeys as (keyof typeof translations.it)[]) {
    assert.ok(translations.it[key].length > 0, key)
    assert.ok(translations.en[key].length > 0, key)
  }
  assert.equal(translate('it', 'nav.settings'), 'Impostazioni')
  assert.equal(translate('en', 'nav.settings'), 'Settings')
  assert.notEqual(translate('it', 'settings.title'), translate('en', 'settings.title'))
})

test('interpolation works in both languages', () => {
  assert.equal(translate('it', 'dashboard.total', { value: '45 min' }), 'Totale 45 min')
  assert.equal(translate('en', 'dashboard.total', { value: '45 min' }), 'Total 45 min')
})

test('initial language: stored wins, then browser, then Italian', () => {
  assert.equal(resolveInitialLanguage('en', 'it-IT'), 'en')
  assert.equal(resolveInitialLanguage('it', 'en-US'), 'it')
  assert.equal(resolveInitialLanguage(null, 'en-US'), 'en')
  assert.equal(resolveInitialLanguage(null, 'it-IT'), 'it')
  assert.equal(resolveInitialLanguage(null, null), 'it')
  assert.equal(resolveInitialLanguage('fr', 'en-GB'), 'en')
})

test('dates and numbers follow locale', () => {
  assert.notEqual(formatDay('2026-01-15', 'long', 'it-IT'), formatDay('2026-01-15', 'long', 'en-US'))
  assert.match(formatDay('2026-01-15', 'long', 'en-US'), /January/)
  assert.match(formatDay('2026-01-15', 'long', 'it-IT'), /gennaio/)
  assert.equal(formatNumber(1234567, 'it-IT'), '1.234.567')
  assert.equal(formatNumber(1234567, 'en-US'), '1,234,567')
  const today = new Date()
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  assert.equal(relativeDay(iso, 'it-IT'), 'Oggi')
  assert.equal(relativeDay(iso, 'en-US'), 'Today')
})
