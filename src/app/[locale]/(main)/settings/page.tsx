'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Settings, Shield, Eye, User } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'
import { toast } from 'sonner'
import { Link } from '@/i18n/navigation'

export default function SettingsPage() {
  const t = useTranslations('nav')
  const { user, profile, isLoading, refreshProfile } = useAuth()
  const [saving, setSaving] = useState(false)
  const [onlineStatusVisible, setOnlineStatusVisible] = useState(true)
  const [listeningMinutesVisible, setListeningMinutesVisible] = useState(true)
  const [profileVisibility, setProfileVisibility] = useState<'public' | 'followers' | 'private'>('public')
  const supabase = createClient()

  useEffect(() => {
    if (profile) {
      setOnlineStatusVisible(profile.online_status_visible ?? true)
      setListeningMinutesVisible(profile.listening_minutes_visible ?? true)
      setProfileVisibility((profile.profile_visibility as typeof profileVisibility) || 'public')
    }
  }, [profile])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)

    const { error } = await supabase
      .from('profiles')
      .update({
        online_status_visible: onlineStatusVisible,
        listening_minutes_visible: listeningMinutesVisible,
        profile_visibility: profileVisibility,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', user.id)

    if (error) {
      console.error('Settings update error:', error)
      toast.error('Einstellungen konnten nicht gespeichert werden.')
    } else {
      toast.success('Einstellungen gespeichert.')
      await refreshProfile()
    }

    setSaving(false)
  }

  if (isLoading) {
    return (
      <div className="relative min-h-[50vh] flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Lade Einstellungen...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="relative min-h-[50vh] flex items-center justify-center">
        <div className="glass-card rounded-2xl p-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Bitte melde dich an, um Einstellungen zu verwalten.
          </p>
          <Button asChild>
            <Link href="/login">{t('login')}</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto w-full space-y-8">
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6" />
            <h1 className="text-3xl font-bold">Einstellungen</h1>
          </div>

          <div className="glass-card rounded-3xl p-6 space-y-6">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <h2 className="text-lg font-semibold">Profil</h2>
                <p className="text-sm text-muted-foreground">
                  Sichtbarkeit und Status-Einstellungen
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 px-4 py-3">
              <div className="flex items-center gap-3">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Online-Status anzeigen</p>
                  <p className="text-xs text-muted-foreground">
                    Andere sehen, ob du online bist
                  </p>
                </div>
              </div>
              <Switch
                checked={onlineStatusVisible}
                onCheckedChange={setOnlineStatusVisible}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 px-4 py-3">
              <div className="flex items-center gap-3">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Hörminuten anzeigen</p>
                  <p className="text-xs text-muted-foreground">
                    Zeige deine gehörten Minuten im Profil
                  </p>
                </div>
              </div>
              <Switch
                checked={listeningMinutesVisible}
                onCheckedChange={setListeningMinutesVisible}
              />
            </div>

            <div className="rounded-xl border border-border/60 bg-background/60 px-4 py-3 space-y-3">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Profil-Sichtbarkeit</p>
                  <p className="text-xs text-muted-foreground">
                    Wer dein Profil sehen kann
                  </p>
                </div>
              </div>
              <RadioGroup
                value={profileVisibility}
                onValueChange={(value) => setProfileVisibility(value as typeof profileVisibility)}
                className="grid gap-2"
              >
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="public" />
                  Oeffentlich
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="followers" />
                  Nur Follower
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="private" />
                  Privat
                </label>
              </RadioGroup>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Speichere...' : 'Speichern'}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/profile/edit">Profil bearbeiten</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
