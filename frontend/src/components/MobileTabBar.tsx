import { NavLink } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebar } from './ui/sidebar'
import { useLanguage } from '../i18n/useLanguage'
import { mobileTabs, navItems } from './navigation'

/** Tab bar in basso su mobile: le pagine di ogni giorno a un pollice, il resto in "Altro". */
function MobileTabBar() {
  const { t } = useLanguage()
  const { setOpenMobile } = useSidebar()
  const tabs = mobileTabs.map((to) => navItems.find((item) => item.to === to)!)
  const tabClass = 'flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium text-muted-foreground transition-colors outline-none focus-visible:text-foreground [&_svg]:size-5'

  return (
    <nav aria-label={t('nav.main')} className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden">
      {tabs.map(({ to, labelKey, icon: Icon }) => (
        <NavLink key={to} to={to} className={({ isActive }) => cn(tabClass, isActive && 'text-foreground [&_svg]:text-primary')}>
          <Icon aria-hidden="true" />
          {t(labelKey)}
        </NavLink>
      ))}
      <button type="button" className={tabClass} onClick={() => setOpenMobile(true)}>
        <Menu aria-hidden="true" />
        {t('nav.more')}
      </button>
    </nav>
  )
}

export default MobileTabBar
