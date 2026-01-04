'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Save, ArrowLeft, User, MapPin, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

interface Profile {
  id: string
  username: string | null
  display_name: string | null
  location: string | null
  avatar_id: number | null
  banner_url: string | null
  bio: string | null
  profile_visibility: string
  online_status_visible: boolean
  banner_unlocked: boolean
  badge_showcase_slots: number
  badges_showcase: string[]
  avatar_tier: string
}

interface AvatarOption {
  id: number
  file_path: string
  file_name: string
  tier: string
}

interface BadgeOption {
  id: string
  name: string
  name_en: string | null
  icon: string
  description: string
  description_en: string | null
}

export default function EditProfilePage() {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations('profile')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [avatars, setAvatars] = useState<AvatarOption[]>([])
  const [username, setUsername] = useState('')
  const [firstName, setFirstName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [location, setLocation] = useState('')
  const [bio, setBio] = useState('')
  const [avatarId, setAvatarId] = useState<number | null>(null)
  const [visibility, setVisibility] = useState('public')
  const [bannerUrl, setBannerUrl] = useState('')
  const [badgeShowcaseSlots, setBadgeShowcaseSlots] = useState(0)
  const [badgeShowcase, setBadgeShowcase] = useState<string[]>([])
  const [badges, setBadges] = useState<BadgeOption[]>([])

  const supabase = createClient()

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push(`/${locale}/login`)
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, location, avatar_id, banner_url, bio, profile_visibility, online_status_visible, banner_unlocked, badge_showcase_slots, badges_showcase, avatar_tier')
      .eq('id', user.id)
      .single()

    if (error) {
      toast.error('Fehler beim Laden des Profils')
      console.error(error)
      return
    }

    const profileData = data as Profile
    setProfile(profileData)
    setUsername(profileData.username || '')
    setDisplayName(profileData.display_name || '')
    setLocation(profileData.location || '')
    setBio(profileData.bio || '')
    setAvatarId(profileData.avatar_id)
    setVisibility(profileData.profile_visibility || 'public')
    setBannerUrl(profileData.banner_url || '')
    setBadgeShowcaseSlots(profileData.badge_showcase_slots || 0)
    setBadgeShowcase(profileData.badges_showcase || [])
    setLoading(false)

    const { data: privateData } = await supabase
      .from('profile_private')
      .select('first_name')
      .eq('user_id', user.id)
      .maybeSingle()

    setFirstName((privateData as { first_name?: string | null } | null)?.first_name || '')

    await fetchAvatars(profileData.avatar_tier || 'standard')
    if ((profileData.badge_showcase_slots || 0) > 0) {
      await fetchBadges(user.id)
    }
  }

  const fetchAvatars = async (tier: string) => {
    const { data, error } = await supabase
      .from('avatars')
      .select('id, file_path, file_name, tier')
      .in('tier', tier === 'premium' ? ['standard', 'premium'] : ['standard'])
      .order('id', { ascending: true })

    if (error) {
      console.error('Error fetching avatars:', error)
      return
    }

    setAvatars(data || [])
  }

  const fetchBadges = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_badges')
      .select('badges:badge_id(id, name, name_en, icon, description, description_en)')
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching badges:', error)
      return
    }

    const badgeRows = (data || []) as unknown as Array<{ badges: BadgeOption | null }>
    setBadges(badgeRows.map((row) => row.badges).filter(Boolean) as BadgeOption[])
  }

  const getAvatarUrl = (filePath: string) => {
    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
    return data.publicUrl
  }

  const toggleBadge = (badgeId: string) => {
    setBadgeShowcase((current) => {
      if (current.includes(badgeId)) {
        return current.filter((id) => id !== badgeId)
      }
      if (current.length >= badgeShowcaseSlots) {
        return current
      }
      return [...current, badgeId]
    })
  }

  const handleSave = async () => {
    if (!profile) return

    setSaving(true)
    const profileUpdate: Record<string, unknown> = {
      display_name: displayName || null,
      location: location || null,
      bio: bio || null,
      avatar_id: avatarId,
      profile_visibility: visibility,
      banner_url: profile.banner_unlocked ? (bannerUrl || null) : profile.banner_url,
      badges_showcase: badgeShowcase.slice(0, badgeShowcaseSlots),
      updated_at: new Date().toISOString(),
    }

    if (!profile.username && username.trim()) {
      profileUpdate.username = username.trim()
    }

    const { error } = await supabase
      .from('profiles')
      .update(profileUpdate as never)
      .eq('id', profile.id)

    if (error) {
      toast.error('Fehler beim Speichern')
      console.error(error)
    } else {
      const { error: privateError } = await supabase
        .from('profile_private')
        .upsert({
          user_id: profile.id,
          first_name: firstName || null,
          updated_at: new Date().toISOString(),
        } as never, { onConflict: 'user_id' })

      if (privateError) {
        console.error(privateError)
      }

      toast.success('Profil gespeichert!')
      fetch('/api/badges/check', { method: 'POST' }).catch(() => {})
      router.push(`/${locale}/profile`)
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="relative min-h-screen">
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="bg-orb bg-orb-1" />
          <div className="bg-orb bg-orb-2" />
          <div className="bg-orb bg-orb-3" />
        </div>
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-3xl mx-auto w-full space-y-8">
          {/* Header */}
          <div className="glass-card rounded-3xl p-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/profile">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-3xl font-bold">{t('editProfile')}</h1>
                <p className="text-muted-foreground">
                  Passe dein Profil an und wähle einen Avatar
                </p>
              </div>
            </div>
          </div>

          {/* Avatar Selection */}
          <div className="glass-card rounded-3xl p-6">
            <h2 className="text-xl font-semibold mb-4">{t('avatar')}</h2>
            <p className="text-sm text-muted-foreground mb-6">
              {t('chooseAvatar')}
            </p>

            {avatars.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                Keine Avatare verfügbar. Der Admin muss zuerst Avatare hochladen.
              </p>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
                {avatars.map((avatar) => (
                  <button
                    key={avatar.id}
                    onClick={() => setAvatarId(avatar.id)}
                    className={cn(
                      "aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-105",
                      avatarId === avatar.id
                        ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-background"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <img
                      src={getAvatarUrl(avatar.file_path)}
                      alt={avatar.file_name}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Profile Form */}
          <div className="glass-card rounded-3xl p-6">
            <h2 className="text-xl font-semibold mb-6">Profil-Informationen</h2>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">
                    @{t('username')}
                  </Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="benutzername"
                    disabled={Boolean(profile?.username)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {profile?.username
                      ? 'Der Benutzername kann nicht geändert werden.'
                      : 'Der Benutzername kann nur einmal gesetzt werden.'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName">
                    <User className="h-4 w-4 inline mr-2" />
                    {t('displayName')}
                  </Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Dein Anzeigename"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="firstName">
                  Vorname (nicht öffentlich)
                </Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Vorname"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">
                  <MapPin className="h-4 w-4 inline mr-2" />
                  {t('location')}
                </Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Deine Stadt"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">
                  <FileText className="h-4 w-4 inline mr-2" />
                  {t('bio')}
                </Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Erzähl etwas über dich..."
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  {bio.length}/500 Zeichen
                </p>
              </div>

              {profile?.banner_unlocked && (
                <div className="space-y-2">
                  <Label htmlFor="bannerUrl">
                    Profil-Banner URL
                  </Label>
                  <Input
                    id="bannerUrl"
                    value={bannerUrl}
                    onChange={(e) => setBannerUrl(e.target.value)}
                    placeholder="https://..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Tipp: Nutze ein breites Bild (mindestens 1200px).
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Visibility */}
          <div className="glass-card rounded-3xl p-6">
            <h2 className="text-xl font-semibold mb-2">{t('visibility.title')}</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Wer kann dein Profil sehen?
            </p>

            <RadioGroup value={visibility} onValueChange={setVisibility}>
              <div className="space-y-4">
                <div className="flex items-start space-x-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="public" id="public" className="mt-1" />
                  <Label htmlFor="public" className="flex-1 cursor-pointer">
                    <span className="font-medium block mb-1">{t('visibility.public')}</span>
                    <p className="text-sm text-muted-foreground">
                      Jeder kann dein Profil sehen
                    </p>
                  </Label>
                </div>

                <div className="flex items-start space-x-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="followers" id="followers" className="mt-1" />
                  <Label htmlFor="followers" className="flex-1 cursor-pointer">
                    <span className="font-medium block mb-1">{t('visibility.followers')}</span>
                    <p className="text-sm text-muted-foreground">
                      Nur deine Follower können dein Profil sehen
                    </p>
                  </Label>
                </div>

                <div className="flex items-start space-x-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="private" id="private" className="mt-1" />
                  <Label htmlFor="private" className="flex-1 cursor-pointer">
                    <span className="font-medium block mb-1">{t('visibility.private')}</span>
                    <p className="text-sm text-muted-foreground">
                      Nur du kannst dein Profil sehen
                    </p>
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {badgeShowcaseSlots > 0 && (
            <div className="glass-card rounded-3xl p-6">
              <h2 className="text-xl font-semibold mb-2">Badge-Showcase</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Waehle bis zu {badgeShowcaseSlots} Badges fuer die prominente Anzeige.
              </p>

              {badges.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Du hast noch keine Badges freigeschaltet.
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {badges.map((badge) => {
                    const selected = badgeShowcase.includes(badge.id)
                    return (
                      <button
                        key={badge.id}
                        onClick={() => toggleBadge(badge.id)}
                        className={cn(
                          "rounded-xl border px-2 py-3 text-center transition-colors",
                          selected
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className="text-2xl">{badge.icon}</div>
                        <div className="text-[10px] font-medium truncate">
                          {locale === 'en' && badge.name_en ? badge.name_en : badge.name}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 justify-end">
            <Button variant="outline" asChild disabled={saving}>
              <Link href="/profile">Abbrechen</Link>
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird gespeichert...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Speichern
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
