import {
  BarChart3,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  GraduationCap,
  History,
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

/** Pagine dell'app: le usano sidebar, palette dei comandi e scorciatoie. */
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
      { to: '/exams', labelKey: 'nav.exams', icon: GraduationCap, key: 'e' },
      { to: '/goals', labelKey: 'nav.goals', icon: Target, key: 'o' },
    ],
  },
  {
    titleKey: 'nav.analysis',
    items: [
      { to: '/statistics', labelKey: 'nav.statistics', icon: BarChart3, key: 's' },
      { to: '/history', labelKey: 'nav.history', icon: History, key: 'h' },
      { to: '/settings', labelKey: 'nav.settings', icon: Settings, key: 'i' },
    ],
  },
]

export const navItems = navGroups.flatMap((group) => group.items)
