/** Tema dell'interfaccia: scuro (default, com'era), chiaro o quello del sistema. */
export type Theme = 'dark' | 'light' | 'system'

const KEY = 'studyos.theme'

function stored(): Theme {
  try {
    const value = localStorage.getItem(KEY)
    return value === 'light' || value === 'system' ? value : 'dark'
  } catch { return 'dark' }
}

let current: Theme = stored()
const systemLight = () => window.matchMedia('(prefers-color-scheme: light)')

function apply(): void {
  const light = current === 'light' || (current === 'system' && systemLight().matches)
  document.documentElement.dataset.theme = light ? 'light' : 'dark'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#f4f4f1' : '#0e0f11')
}

export const getTheme = (): Theme => current

export function setTheme(theme: Theme): void {
  current = theme
  try { localStorage.setItem(KEY, theme) } catch { /* storage bloccato: vale fino alla chiusura */ }
  apply()
}

/** Da chiamare prima del primo render, così non si vede il tema sbagliato. */
export function initTheme(): void {
  apply()
  systemLight().addEventListener('change', apply)
}
