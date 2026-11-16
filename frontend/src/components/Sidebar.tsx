import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ChevronsUpDown, LogOut, Play, Search } from 'lucide-react'
import { Avatar, AvatarFallback } from './ui/avatar'
import { Button } from './ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Kbd } from './ui/kbd'
import {
  Sidebar as SidebarRoot, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarRail, useSidebar,
} from './ui/sidebar'
import BrandMark from './BrandMark'
import { useAuth } from '../context/useAuth'
import { useTimer } from '../context/useTimer'
import { useLanguage } from '../i18n/useLanguage'
import { navGroups, settingsItem } from './navigation'

/**
 * Sidebar principale (shadcn Sidebar): su desktop si riduce a sole icone con
 * tooltip, su mobile è un pannello laterale. In alto l'azione primaria e la
 * ricerca, in fondo l'account con impostazioni e uscita.
 */
function Sidebar() {
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const timer = useTimer()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { isMobile, setOpenMobile } = useSidebar()
  const timerBadge =
    timer.config && !timer.sitting?.ended && (timer.isRunning || timer.hasStarted)
      ? `${Math.floor(timer.remainingSeconds / 60)}:${String(timer.remainingSeconds % 60).padStart(2, '0')}`
      : null
  const displayName = user?.full_name || user?.username || t('nav.studentFallback')
  const initials = displayName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  const close = () => { if (isMobile) setOpenMobile(false) }

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <SidebarRoot collapsible="icon" aria-label={t('nav.main')}>
      <SidebarHeader className="gap-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="StudyOS">
              <Link to="/dashboard" onClick={close} aria-label={t('nav.goToDashboard')}>
                <BrandMark className="size-8 shrink-0" />
                <span className="text-base font-semibold tracking-tight group-data-[collapsible=icon]:hidden">StudyOS</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={t('nav.newSession')} className="bg-primary font-medium text-primary-foreground hover:bg-primary/85 hover:text-primary-foreground active:bg-primary/85 active:text-primary-foreground">
              <Link to="/timer" onClick={close}>
                <Play aria-hidden="true" />
                <span>{t('nav.newSession')}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group, index) => (
          <SidebarGroup key={group.titleKey ?? index}>
            {group.titleKey && <SidebarGroupLabel className="font-mono text-[0.6875rem] tracking-wider uppercase">{t(group.titleKey)}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map(({ to, labelKey, icon: Icon }) => (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === to}
                      tooltip={t(labelKey)}
                      className="data-[active=true]:bg-sidebar-accent data-[active=true]:[&>svg]:text-primary"
                    >
                      <NavLink to={to} onClick={close}>
                        <Icon aria-hidden="true" />
                        <span>{t(labelKey)}</span>
                      </NavLink>
                    </SidebarMenuButton>
                    {to === '/timer' && timerBadge && (
                      <SidebarMenuBadge className={timer.mode === 'Break' ? 'font-mono text-info' : 'font-mono text-primary'}>
                        <span className="sr-only">{timer.isRunning ? t('nav.timerRunning') : t('nav.timerPaused')}: </span>
                        {timerBadge}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" tooltip={displayName} className="data-[state=open]:bg-sidebar-accent">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-sidebar-accent font-mono text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{displayName}</span>
                    {user?.email && <span className="truncate text-xs text-muted-foreground">{user.email}</span>}
                  </span>
                  <ChevronsUpDown className="ml-auto" aria-hidden="true" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side={isMobile ? 'top' : 'right'} align="end" className="min-w-56">
                <DropdownMenuLabel className="text-xs text-muted-foreground">{t('nav.account')}</DropdownMenuLabel>
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link to={settingsItem.to} onClick={close}>
                      <settingsItem.icon aria-hidden="true" />
                      {t(settingsItem.labelKey)}
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem variant="destructive" onSelect={() => void handleLogout()}>
                    <LogOut aria-hidden="true" />
                    {t('nav.logout')}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </SidebarRoot>
  )
}

/** Pulsante compatto della barra in alto che apre la ricerca. */
export function SearchButton({ onClick }: { onClick: () => void }) {
  const { t } = useLanguage()
  return (
    <Button variant="outline" className="text-muted-foreground md:w-56 md:justify-start" onClick={onClick} aria-label={t('palette.title')}>
      <Search data-icon="inline-start" aria-hidden="true" />
      <span className="hidden md:inline">{t('palette.search')}</span>
      <Kbd className="ml-auto hidden md:inline-flex">⌘K</Kbd>
    </Button>
  )
}

export default Sidebar
