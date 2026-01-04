'use client'

import { useMemo, useState } from 'react'
import { Link } from '@/i18n/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Menu, User, LogOut, Settings, Crown, MessagesSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AvatarDisplay } from '@/components/profile/avatar-display'
import { Sheet, SheetClose, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ThemeToggle } from './theme-toggle'
import { LanguageSwitcher } from './language-switcher'
import { VibesDisplay } from '@/components/gamification/vibes-display'
import { useAuth } from '@/lib/hooks/use-auth'
import { cn } from '@/lib/utils'

export function Header() {
  const locale = useLocale()
  const t = useTranslations('nav')
  const { user, profile, signOut, isLoading } = useAuth()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [mobileOpen, setMobileOpen] = useState(false)
  const avatarFallback =
    profile?.display_name?.[0]?.toUpperCase() ||
    profile?.username?.[0]?.toUpperCase() ||
    'U'

  const navItems = [
    { href: '/', label: t('home') },
    { href: '/top-songs', label: t('topSongs') },
    { href: '/community', label: t('community') },
    { href: '/community?tab=messages', label: t('messages') },
    { href: '/community?tab=leaderboard', label: t('leaderboard') },
    { href: '/shop', label: t('shop') },
  ]

  const normalizedPath = useMemo(() => {
    const raw = pathname || '/'
    const withoutLocale = raw.replace(/^\/[a-z]{2}(?=\/|$)/, '')
    return withoutLocale || '/'
  }, [pathname])

  const isActive = useMemo(() => {
    return (href: string) => {
      const [path, query] = href.split('?')
      if (!path) return false
      if (path === '/') return normalizedPath === '/'
      if (normalizedPath !== path) return false
      if (!query) return true
      const expected = new URLSearchParams(query)
      for (const [k, v] of expected.entries()) {
        if (searchParams.get(k) !== v) return false
      }
      return true
    }
  }, [normalizedPath, searchParams])

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/yfm-logo-neu.png"
            alt="Youth FM"
            width={56}
            height={56}
            className="h-12 w-12 sm:h-14 sm:w-14 object-contain"
            priority
          />
          <div className="hidden sm:block leading-tight">
            <div className="text-xl font-bold">Youth FM</div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Genau Dein Ding
            </div>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {user && profile && (
            <div className="hidden lg:block">
              <VibesDisplay
                available={profile.vibes_available}
                streak={profile.streak_current}
                multiplier={profile.streak_multiplier}
              />
            </div>
          )}

          <div className="hidden md:flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>

          {isLoading ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full hidden md:inline-flex">
                  <AvatarDisplay
                    avatarId={profile?.avatar_id ?? null}
                    fallback={avatarFallback}
                    className="h-9 w-9"
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center gap-2 p-2">
                  <AvatarDisplay
                    avatarId={profile?.avatar_id ?? null}
                    fallback={avatarFallback}
                    className="h-8 w-8"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {profile?.display_name || 'User'}
                    </span>
                    {profile?.username && (
                      <span className="text-xs text-muted-foreground">
                        @{profile.username}
                      </span>
                    )}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    {t('profile')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    {t('settings')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/community?tab=messages" className="cursor-pointer">
                    <MessagesSquare className="mr-2 h-4 w-4" />
                    {t('messages')}
                  </Link>
                </DropdownMenuItem>
                {profile?.is_admin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/admin/dashboard" className="cursor-pointer">
                        <Crown className="mr-2 h-4 w-4" />
                        {t('admin')}
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Button variant="ghost" asChild className="hidden sm:inline-flex">
                <Link href="/login">{t('login')}</Link>
              </Button>
              <Button asChild>
                <Link href="/register">{t('register')}</Link>
              </Button>
            </div>
          )}

          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-0">
              <div className="flex h-full flex-col">
                <div className="p-4 pt-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <AvatarDisplay
                      avatarId={profile?.avatar_id ?? null}
                      fallback={avatarFallback}
                      className="h-10 w-10"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate">
                        {user ? (profile?.display_name || profile?.username || 'User') : (locale === 'de' ? 'Gast' : 'Guest')}
                      </div>
                      {user && profile?.username && (
                        <div className="text-xs text-muted-foreground truncate">@{profile.username}</div>
                      )}
                    </div>
                  </div>

                  {user && profile && (
                    <div className="rounded-2xl border border-border/60 bg-muted/10 p-3">
                      <VibesDisplay
                        available={profile.vibes_available}
                        streak={profile.streak_current}
                        multiplier={profile.streak_multiplier}
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-2xl border border-border/60 bg-muted/10 p-2 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {locale === 'de' ? 'Sprache' : 'Language'}
                      </span>
                      <LanguageSwitcher />
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-muted/10 p-2 flex items-center justify-between">
                      <ThemeToggle />
                    </div>
                  </div>
                </div>

                <div className="px-4 pb-4 space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
                    {locale === 'de' ? 'Navigation' : 'Navigation'}
                  </div>
                  <nav className="space-y-1">
                    {navItems.map((item) => (
                      <SheetClose asChild key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            'flex items-center justify-between rounded-2xl px-3 py-2 text-sm font-medium transition-colors',
                            isActive(item.href) ? 'bg-primary/10 text-foreground' : 'hover:bg-muted/30 text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <span className="truncate">{item.label}</span>
                        </Link>
                      </SheetClose>
                    ))}
                  </nav>
                </div>

                <div className="mt-auto p-4 border-t border-border/60 space-y-2">
                  {user ? (
                    <>
                      <SheetClose asChild>
                        <Link
                          href="/profile"
                          className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium hover:bg-muted/30"
                        >
                          <User className="h-4 w-4" />
                          {t('profile')}
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link
                          href="/settings"
                          className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium hover:bg-muted/30"
                        >
                          <Settings className="h-4 w-4" />
                          {t('settings')}
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link
                          href="/community?tab=messages"
                          className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium hover:bg-muted/30"
                        >
                          <MessagesSquare className="h-4 w-4" />
                          {t('messages')}
                        </Link>
                      </SheetClose>
                      {profile?.is_admin && (
                        <SheetClose asChild>
                          <Link
                            href="/admin/dashboard"
                            className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium hover:bg-muted/30"
                          >
                            <Crown className="h-4 w-4" />
                            {t('admin')}
                          </Link>
                        </SheetClose>
                      )}
                      <Button
                        variant="secondary"
                        className="w-full rounded-2xl justify-start"
                        onClick={() => {
                          signOut()
                          setMobileOpen(false)
                        }}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        {t('logout')}
                      </Button>
                    </>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <SheetClose asChild>
                        <Button variant="secondary" className="rounded-2xl" asChild>
                          <Link href="/login">{t('login')}</Link>
                        </Button>
                      </SheetClose>
                      <SheetClose asChild>
                        <Button className="rounded-2xl" asChild>
                          <Link href="/register">{t('register')}</Link>
                        </Button>
                      </SheetClose>
                    </div>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
        </div>
      </div>
    </header>
  )
}
