import { setRequestLocale } from 'next-intl/server'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { MapPin, Calendar, Sparkles, Flame, TrendingUp } from 'lucide-react'
import type { Tables } from '@/types/database'

interface UserProfilePageProps {
  params: Promise<{ locale: string; username: string }>
}

type Profile = Tables<'profiles'>

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const { locale, username } = await params
  setRequestLocale(locale)
  const t = await getTranslations('profile')

  const supabase = await createClient()

  // Fetch user profile by username
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (!profile) {
    notFound()
  }

  // Check visibility
  const { data: { user: currentUser } } = await supabase.auth.getUser()

  if (profile.profile_visibility === 'private' && currentUser?.id !== profile.id) {
    notFound()
  }

  if (profile.profile_visibility === 'followers' && currentUser?.id !== profile.id) {
    if (!currentUser) {
      notFound()
    }

    const { data: followData } = await supabase
      .from('followers')
      .select('follower_id')
      .eq('follower_id', currentUser.id)
      .eq('following_id', profile.id)
      .single()

    if (!followData) {
      notFound()
    }
  }

  // Get avatar URL
  let avatarUrl = '/avatars/default.png'
  if (profile.avatar_id) {
    const { data: avatar } = await supabase
      .from('avatars')
      .select('file_path')
      .eq('id', profile.avatar_id)
      .single()

    if (avatar) {
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(avatar.file_path)
      avatarUrl = data.publicUrl
    }
  }

  const stats = [
    {
      label: locale === 'de' ? 'Vibes Gesamt' : 'Total Vibes',
      value: profile.vibes_total.toLocaleString(),
      icon: Sparkles,
      color: 'text-primary',
    },
    {
      label: locale === 'de' ? 'Aktueller Streak' : 'Current Streak',
      value: `${profile.streak_current} ${locale === 'de' ? 'Tage' : 'days'}`,
      icon: Flame,
      color: 'text-orange-500',
    },
    {
      label: locale === 'de' ? 'Längster Streak' : 'Longest Streak',
      value: `${profile.streak_longest} ${locale === 'de' ? 'Tage' : 'days'}`,
      icon: TrendingUp,
      color: 'text-blue-500',
    },
  ]

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
        <div className="max-w-3xl mx-auto w-full space-y-6">
          {/* Profile Header */}
          <div className="glass-card rounded-3xl p-8">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <Avatar className="h-32 w-32 border-4 border-primary/20">
                <AvatarImage src={avatarUrl} alt={profile.display_name || profile.username || 'User'} />
                <AvatarFallback className="text-4xl">
                  {profile.display_name?.[0]?.toUpperCase() || profile.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 text-center sm:text-left">
                <h1 className="text-3xl font-bold">
                  {profile.display_name || profile.username || 'Anonymous'}
                </h1>
                {profile.username && (
                  <p className="text-muted-foreground mt-1">
                    @{profile.username}
                  </p>
                )}

                {profile.location && (
                  <div className="flex items-center gap-2 mt-3 justify-center sm:justify-start">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{profile.location}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {locale === 'de' ? 'Dabei seit' : 'Joined'}{' '}
                    {new Date(profile.created_at).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                {profile.is_admin && (
                  <Badge variant="secondary" className="mt-3">
                    {locale === 'de' ? 'Admin' : 'Admin'}
                  </Badge>
                )}
              </div>
            </div>

            {profile.bio && (
              <div className="mt-6 pt-6 border-t border-border/50">
                <p className="text-muted-foreground whitespace-pre-wrap">{profile.bio}</p>
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.map((stat) => (
              <div key={stat.label} className="glass-card rounded-3xl p-6">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl bg-muted`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Activity */}
          <div className="glass-card rounded-3xl p-6">
            <h2 className="text-xl font-semibold mb-4">
              {locale === 'de' ? 'Aktivität' : 'Recent Activity'}
            </h2>
            <div className="text-center py-8 text-muted-foreground">
              {locale === 'de' ? 'Keine aktuellen Aktivitäten' : 'No recent activity'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
