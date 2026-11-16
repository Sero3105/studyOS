import {
  BarChart3,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  History,
  Layers,
  LayoutDashboard,
  Settings,
  Target,
  Timer,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { TranslationKey } from '../i18n/translations'

export interface NavEntry {
  to: string
  labelKey: TranslationKey
  icon: LucideIcon
  /** Tasto dopo `g` per arrivarci da tastiera (es. g p → Planner). */
  key: string
}

/** Pagine nella sidebar, a gruppi: fare oggi, studiare, guardare indietro. */
export const navGroups: { titleKey?: TranslationKey; items: NavEntry[] }[] = [
  {
    items: [
      { to: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, key: 'd' },
      { to: '/timer', labelKey: 'nav.timer', icon: Timer, key: 't' },
      { to: '/planner', labelKey: 'nav.planner', icon: CalendarCheck, key: 'p' },
      { to: '/calendar', labelKey: 'nav.calendar', icon: CalendarDays, key: 'c' },
    ],
  },
  {
    titleKey: 'nav.study',
    items: [
      { to: '/subjects', labelKey: 'nav.subjects', icon: BookOpen, key: 'm' },
      { to: '/cards', labelKey: 'nav.cards', icon: Layers, key: 'f' },
      { to: '/goals', labelKey: 'nav.goals', icon: Target, key: 'o' },
    ],
  },
  {
    titleKey: 'nav.analysis',
    items: [
      { to: '/statistics', labelKey: 'nav.statistics', icon: BarChart3, key: 's' },
      { to: '/history', labelKey: 'nav.history', icon: History, key: 'h' },
    ],
  },
]

/** Impostazioni stanno nel menu account, non tra le pagine di lavoro. */
export const settingsItem: NavEntry = { to: '/settings', labelKey: 'nav.settings', icon: Settings, key: 'i' }

/** Tab bar mobile: le quattro pagine di ogni giorno; il resto è in "Altro". */
export const mobileTabs = ['/dashboard', '/timer', '/planner', '/statistics']

export const navItems = [...navGroups.flatMap((group) => group.items), settingsItem]
