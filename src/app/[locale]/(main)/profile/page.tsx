import { redirect } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { getTranslations } from 'next-intl/server'
import { Sparkles, Flame, Calendar, MapPin, Edit, Award, MessageSquare, Swords, ThumbsUp, Flame as FlameIcon, Meh, ThumbsDown, SkipForward } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database'
import { Link } from '@/i18n/navigation'
import { AvatarDisplay } from '@/components/profile/avatar-display'

interface ProfilePageProps {
  params: Promise<{ locale: string }>
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('profile')

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user profile
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = profileData as Tables<'profiles'> | null

  if (!profile) {
    redirect('/login')
  }

  const [
    { data: userBadgesData },
    { count: feedbackCount },
    { count: duelVotesCount },
    { data: listeningSessions },
    { data: feedbackHistory },
  ] = await Promise.all([
    supabase
      .from('user_badges')
      .select(`
        unlocked_at,
        badges:badge_id(id, name, name_en, icon, description, description_en, category)
      `)
      .eq('user_id', user.id),
    supabase
      .from('song_feedback')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('duel_votes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('listening_sessions')
      .select('duration_minutes')
      .eq('user_id', user.id),
    supabase
      .from('song_feedback')
      .select('id, reaction, created_at, songs(title, artist)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  type BadgeJoin = {
    unlocked_at: string
    badges: {
      id: string
      name: string
      name_en: string | null
      icon: string
      description: string
      description_en: string | null
      category: string
    } | null
  }

  const userBadges = (userBadgesData || []) as unknown as BadgeJoin[]

  const badges = userBadges
    .filter(ub => ub.badges !== null)
    .map(ub => ({
      ...ub.badges!,
      unlocked_at: ub.unlocked_at
    }))

  const showcaseIds = profile.badges_showcase || []
  const showcaseBadges = badges.filter((badge) => showcaseIds.includes(badge.id))

  const totalMinutes = (listeningSessions || [])
    .map((row) => (row as { duration_minutes: number | null }).duration_minutes || 0)
    .reduce((sum, minutes) => sum + minutes, 0)

  const reactionIcon = (reaction: number) => {
    switch (reaction) {
      case 1:
        return <FlameIcon className="h-4 w-4 text-orange-500" />
      case 2:
        return <ThumbsUp className="h-4 w-4 text-green-500" />
      case 3:
        return <Meh className="h-4 w-4 text-gray-500" />
      case 4:
        return <ThumbsDown className="h-4 w-4 text-red-400" />
      case 5:
        return <SkipForward className="h-4 w-4 text-purple-500" />
      default:
        return <ThumbsUp className="h-4 w-4 text-muted-foreground" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', {
      month: 'long',
      year: 'numeric',
    })
  }

  const stats = [
    ...(profile.listening_minutes_visible ? [{
      label: locale === 'de' ? 'Hörminuten' : 'Minutes listened',
      value: totalMinutes.toLocaleString(),
      icon: Flame,
    }] : []),
    {
      label: locale === 'de' ? 'Feedbacks' : 'Feedbacks',
      value: feedbackCount || 0,
      icon: MessageSquare,
    },
    {
      label: locale === 'de' ? 'Duell-Votes' : 'Duel Votes',
      value: duelVotesCount || 0,
      icon: Swords,
    },
    {
      label: 'Badges',
      value: badges.length,
      icon: Award,
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
        <div className="max-w-7xl mx-auto w-full space-y-8">
          {/* Profile Header */}
          <div className="glass-card rounded-3xl p-6">
          {profile.banner_url && (
            <div className="mb-4 h-40 w-full overflow-hidden rounded-2xl border border-border">
              <img
                src={profile.banner_url}
                alt="Profil-Banner"
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <AvatarDisplay
              avatarId={profile.avatar_id}
              fallback={profile.display_name?.[0] || profile.username?.[0] || '?'}
              className="h-24 w-24"
            />

            <div className="flex-1 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold">{profile.display_name || profile.username}</h1>
                  {profile.username && (
                    <p className="text-muted-foreground">@{profile.username}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    {profile.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {profile.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {t('memberSince', { date: formatDate(profile.created_at) })}
                    </span>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/profile/edit">
                    <Edit className="h-4 w-4 mr-2" />
                    {t('editProfile')}
                  </Link>
                </Button>
              </div>

              {profile.bio && (
                <p className="text-muted-foreground">{profile.bio}</p>
              )}

              {/* Vibes and Streak */}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 bg-primary/10 rounded-lg px-4 py-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{profile.vibes_total.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Vibes</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-orange-500/10 rounded-lg px-4 py-2">
                  <Flame className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold">{profile.streak_current}</p>
                    <p className="text-xs text-muted-foreground">
                      {locale === 'de' ? 'Tage Streak' : 'Day Streak'}
                    </p>
                  </div>
                </div>

                {profile.streak_multiplier > 1 && (
                  <Badge variant="secondary" className="h-fit">
                    {profile.streak_multiplier}x Multiplier
                  </Badge>
                )}
              </div>
            </div>
          </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Stats */}
            <div className="glass-card rounded-3xl p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold">{t('stats.hoursListened')}</h2>
                <p className="text-sm text-muted-foreground">
                  {locale === 'de' ? 'Deine Aktivität auf der Plattform' : 'Your activity on the platform'}
                </p>
              </div>
            <div className="grid grid-cols-3 gap-4">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <stat.icon className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
            </div>

          {/* Badges */}
          <div className="glass-card rounded-3xl p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Badges
                </h2>
                <p className="text-sm text-muted-foreground">
                  {badges.length} {locale === 'de' ? 'freigeschaltet' : 'unlocked'}
                </p>
              </div>
            {badges.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">
                {locale === 'de'
                  ? 'Noch keine Badges freigeschaltet'
                  : 'No badges unlocked yet'}
              </p>
            ) : (
              <div className="space-y-4">
                {showcaseBadges.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                      Showcase
                    </p>
                    <div className="grid grid-cols-3 gap-4">
                      {showcaseBadges.map((badge) => (
                        <div
                          key={badge.id}
                          className="text-center p-2 rounded-lg bg-primary/10 border border-primary/20"
                          title={locale === 'en' && badge.description_en ? badge.description_en : badge.description}
                        >
                          <div className="text-3xl mb-1">{badge.icon}</div>
                          <p className="text-xs font-medium truncate">
                            {locale === 'en' && badge.name_en ? badge.name_en : badge.name}
                          </p>
                        </div>
                      ))}
          </div>

          <div className="glass-card rounded-3xl p-6 md:col-span-2">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">
                {locale === 'de' ? 'Meine Bewertungen' : 'My ratings'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {locale === 'de'
                  ? 'Nur für dich sichtbar'
                  : 'Visible only to you'}
              </p>
            </div>
            {(feedbackHistory || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {locale === 'de'
                  ? 'Noch keine Bewertungen abgegeben.'
                  : 'No ratings yet.'}
              </p>
            ) : (
              <div className="space-y-3">
                {(feedbackHistory || []).map((entry) => {
                  const row = entry as {
                    id: string
                    reaction: number
                    created_at: string
                    songs: { title: string; artist: string | null } | null
                  }
                  return (
                    <div key={row.id} className="flex items-center gap-3 rounded-xl border border-border/50 px-3 py-2">
                      {reactionIcon(row.reaction)}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {row.songs?.title || (locale === 'de' ? 'Unbekannter Song' : 'Unknown song')}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {row.songs?.artist || (locale === 'de' ? 'Unbekannt' : 'Unknown')}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(row.created_at).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US')}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
                )}
                <div className="grid grid-cols-3 gap-4">
                  {badges.map((badge) => (
                    <div
                      key={badge.id}
                      className="text-center p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      title={locale === 'en' && badge.description_en ? badge.description_en : badge.description}
                    >
                      <div className="text-3xl mb-1">{badge.icon}</div>
                      <p className="text-xs font-medium truncate">
                        {locale === 'en' && badge.name_en ? badge.name_en : badge.name}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>
          </div>

          {/* Streak Progress */}
          {profile.streak_current > 0 && (
            <div className="glass-card rounded-3xl p-6">
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                <Flame className="h-5 w-5 text-orange-500" />
                Streak Progress
              </h2>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>{profile.streak_current} {locale === 'de' ? 'Tage' : 'days'}</span>
                <span className="text-muted-foreground">
                  {locale === 'de' ? 'Längster: ' : 'Longest: '}
                  {profile.streak_longest} {locale === 'de' ? 'Tage' : 'days'}
                </span>
              </div>
              <Progress value={(profile.streak_current / Math.max(profile.streak_longest, 30)) * 100} />
              {profile.streak_freezes > 0 && (
                <p className="text-sm text-muted-foreground">
                  ❄️ {profile.streak_freezes} {locale === 'de' ? 'Freezes verfügbar' : 'freezes available'}
                </p>
              )}
            </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
