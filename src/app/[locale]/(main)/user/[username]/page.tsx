import { setRequestLocale } from 'next-intl/server'
import { getTranslations } from 'next-intl/server'
import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { MapPin, Calendar, Sparkles, Flame, TrendingUp, MessageSquare } from 'lucide-react'
import type { Tables } from '@/types/database'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { FunkbookCards } from '@/components/profile/funkbook-cards'

interface UserProfilePageProps {
  params: Promise<{ locale: string; username: string }>
}

type Profile = Tables<'profiles'>
type AvatarRow = Tables<'avatars'>

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const { locale, username } = await params
  setRequestLocale(locale)
  const t = await getTranslations('profile')

  const supabase = await createClient()

  // Fetch user profile by username
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  const profile = (profileData as Profile | null)

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
  let avatarUrl = '/avatars/default.svg'
  if (profile.avatar_id) {
    const { data: avatarData } = await supabase
      .from('avatars')
      .select('file_path')
      .eq('id', profile.avatar_id)
      .single()

    const avatar = (avatarData as Pick<AvatarRow, 'file_path'> | null)

    if (avatar?.file_path) {
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(avatar.file_path)
      avatarUrl = data.publicUrl
    }
  }

  const [{ data: activityFeedData }, { data: chatMessagesData }] = await Promise.all([
    supabase
      .from('activity_feed')
      .select('id, event_type, event_data, created_at')
      .eq('user_id', profile.id)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('chat_messages')
      .select('id, content, created_at, channel')
      .eq('user_id', profile.id)
      .eq('status', 'active')
      .in('channel', ['theme', 'main'])
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const { data: funkbookCardsData } = await supabase
    .from('vibe_postcards')
    .select('id, date, slot, note, energy_level, situation, mood_tags, activity_tags, style, songs(title, artist, preview_url, track_id)')
    .eq('user_id', profile.id)
    .eq('status', 'active')
    .eq('visibility', 'public')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(10)

  const funkbookCards = (funkbookCardsData || []) as unknown as Array<{
    id: string
    date: string
    slot: number | null
    note: string
    energy_level: number | null
    situation: string | null
    mood_tags: string[] | null
    activity_tags: string[] | null
    style: unknown
    songs: { title: string; artist: string | null; preview_url: string | null; track_id: number | null } | null
  }>

  type ActivityItem = {
    id: string
    created_at: string
    icon: ReactNode
    title: string
    description?: string
  }

  const activityItems: ActivityItem[] = []

  for (const row of activityFeedData || []) {
    const ev = row as unknown as { id: string; event_type: string; event_data: any; created_at: string }
    if (ev.event_type === 'badge_unlocked') {
      activityItems.push({
        id: `badge:${ev.id}`,
        created_at: ev.created_at,
        icon: <span className="text-base leading-none">{ev.event_data?.badge_icon ?? '🏅'}</span>,
        title: locale === 'de' ? 'Badge freigeschaltet' : 'Badge unlocked',
        description: ev.event_data?.badge_name,
      })
    }
  }

  for (const row of chatMessagesData || []) {
    const msg = row as unknown as { id: string; content: string; created_at: string; channel: string }
    activityItems.push({
      id: `chat:${msg.id}`,
      created_at: msg.created_at,
      icon: <MessageSquare className="h-4 w-4 text-muted-foreground" />,
      title: locale === 'de'
        ? (msg.channel === 'theme' ? 'Beitrag im Tagesthema' : 'Beitrag in der Community')
        : (msg.channel === 'theme' ? 'Post in theme discussion' : 'Post in community'),
      description: msg.content,
    })
  }

  const recentActivity = activityItems
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 12)

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

  const canMessage = Boolean(currentUser?.id) && currentUser?.id !== profile.id && Boolean(profile.username)

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

                {canMessage && (
                  <div className="mt-4 flex justify-center sm:justify-start">
                    <Button asChild className="rounded-full">
                      <Link href={`/community?tab=messages&to=${encodeURIComponent(profile.username!)}`}>
                        Nachricht senden
                      </Link>
                    </Button>
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

          <FunkbookCards
            locale={locale}
            cards={funkbookCards}
            title={locale === 'de' ? 'Funkbuch' : 'Funkbook'}
            subtitle={locale === 'de' ? 'Oeffentliche Karten' : 'Public cards'}
          />

          {/* Recent Activity */}
          <div className="glass-card rounded-3xl p-6">
            <h2 className="text-xl font-semibold mb-4">
              {locale === 'de' ? 'Aktivität' : 'Recent Activity'}
            </h2>
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {locale === 'de' ? 'Keine aktuellen Aktivitäten' : 'No recent activity'}
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 rounded-xl border border-border/50 px-3 py-2">
                    <div className="mt-0.5">{item.icon}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{item.title}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(item.created_at).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
