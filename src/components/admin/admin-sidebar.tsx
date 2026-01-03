'use client'

import { Link } from '@/i18n/navigation'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  LayoutDashboard,
  Users,
  Swords,
  Palette,
  Shield,
  Settings,
  Radio,
  ChevronLeft,
  ImageIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/admin/dashboard', icon: LayoutDashboard, labelKey: 'dashboard' },
  { href: '/admin/users', icon: Users, labelKey: 'users' },
  { href: '/admin/duels', icon: Swords, labelKey: 'duels' },
  { href: '/admin/themes', icon: Palette, labelKey: 'themes' },
  { href: '/admin/avatars', icon: ImageIcon, labelKey: 'avatars' },
  { href: '/admin/moderation', icon: Shield, labelKey: 'moderation' },
  { href: '/admin/settings', icon: Settings, labelKey: 'settings' },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const t = useTranslations('admin')

  return (
    <aside className="w-64 border-r bg-card flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <Link href="/admin/dashboard" className="flex items-center gap-2">
          <Radio className="h-6 w-6 text-primary" />
          <span className="font-bold">Admin Panel</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.includes(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {t(item.labelKey)}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        <Button variant="ghost" className="w-full justify-start" asChild>
          <Link href="/">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Zurück zur Seite
          </Link>
        </Button>
      </div>
    </aside>
  )
}
