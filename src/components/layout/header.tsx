'use client'

import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { Menu, User, LogOut, Settings, Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AvatarDisplay } from '@/components/profile/avatar-display'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ThemeToggle } from './theme-toggle'
import { LanguageSwitcher } from './language-switcher'
import { VibesDisplay } from '@/components/gamification/vibes-display'
import { useAuth } from '@/lib/hooks/use-auth'

export function Header() {
  const t = useTranslations('nav')
  const { user, profile, signOut, isLoading } = useAuth()
  const avatarFallback =
    profile?.display_name?.[0]?.toUpperCase() ||
    profile?.username?.[0]?.toUpperCase() ||
    'U'

  const navItems = [
    { href: '/', label: t('home') },
    { href: '/top-songs', label: t('topSongs') },
    { href: '/community', label: t('community') },
    { href: '/leaderboard', label: t('leaderboard') },
    { href: '/shop', label: t('shop') },
  ]

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
            <VibesDisplay
              available={profile.vibes_available}
              streak={profile.streak_current}
              multiplier={profile.streak_multiplier}
            />
          )}

          <LanguageSwitcher />
          <ThemeToggle />

          {isLoading ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
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
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild className="hidden sm:inline-flex">
                <Link href="/login">{t('login')}</Link>
              </Button>
              <Button asChild>
                <Link href="/register">{t('register')}</Link>
              </Button>
            </div>
          )}

          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <nav className="flex flex-col gap-4 mt-8">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-lg font-medium"
                  >
                    {item.label}
                  </Link>
                ))}
                {!user && (
                  <>
                    <Link href="/login" className="text-lg font-medium">
                      {t('login')}
                    </Link>
                    <Link href="/register" className="text-lg font-medium">
                      {t('register')}
                    </Link>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
        </div>
      </div>
    </header>
  )
}
