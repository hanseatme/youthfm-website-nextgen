import { setRequestLocale } from 'next-intl/server'
import { getTranslations } from 'next-intl/server'
import { Trophy, Flame, Sparkles } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/server'
import { LeaderboardClient } from '@/components/leaderboard/leaderboard-client'

interface LeaderboardPageProps {
  params: Promise<{ locale: string }>
}

interface LeaderboardUser {
  id: string
  username: string | null
  display_name: string | null
  location: string | null
  avatar_id: number | null
  vibes_total: number
  streak_current: number
}

export default async function LeaderboardPage({ params }: LeaderboardPageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('leaderboard')

  const supabase = await createClient()

  const [{ data: vibesLeaders }, { data: streakLeaders }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, username, display_name, location, avatar_id, vibes_total, streak_current')
      .order('vibes_total', { ascending: false })
      .limit(50),
    supabase
      .from('profiles')
      .select('id, username, display_name, location, avatar_id, vibes_total, streak_current')
      .order('streak_current', { ascending: false })
      .limit(50),
  ])

  // Get current user for highlighting
  const { data: { user } } = await supabase.auth.getUser()

  const vibesUsers = (vibesLeaders || []) as LeaderboardUser[]
  const streakUsers = (streakLeaders || []) as LeaderboardUser[]

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
          <div>
            <h1 className="text-3xl font-bold">{t('title')}</h1>
            <p className="text-muted-foreground">
              {locale === 'de'
                ? 'Wer hat die meisten Vibes gesammelt?'
                : 'Who has collected the most vibes?'}
            </p>
          </div>

          <Tabs defaultValue="weekly">
        <TabsList>
          <TabsTrigger value="weekly">{t('weekly')}</TabsTrigger>
          <TabsTrigger value="allTime">{t('allTime')}</TabsTrigger>
          <TabsTrigger value="streaks">{t('streaks')}</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="mt-6">
          <div className="glass-card rounded-3xl p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Top Vibes - {t('weekly')}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {locale === 'de'
                  ? 'Die aktivsten Nutzer dieser Woche'
                  : 'The most active users this week'}
              </p>
            </div>
            <LeaderboardClient
              users={vibesUsers}
              currentUserId={user?.id || null}
              locale={locale}
              showVibes={true}
            />
          </div>
        </TabsContent>

        <TabsContent value="allTime" className="mt-6">
          <div className="glass-card rounded-3xl p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Top Vibes - {t('allTime')}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {locale === 'de'
                  ? 'Die erfolgreichsten Nutzer aller Zeiten'
                  : 'The most successful users of all time'}
              </p>
            </div>
            <LeaderboardClient
              users={vibesUsers}
              currentUserId={user?.id || null}
              locale={locale}
              showVibes={true}
            />
          </div>
        </TabsContent>

        <TabsContent value="streaks" className="mt-6">
          <div className="glass-card rounded-3xl p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                {t('streaks')}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {locale === 'de'
                  ? 'Die längsten aktiven Streaks'
                  : 'The longest active streaks'}
              </p>
            </div>
            <LeaderboardClient
              users={streakUsers.filter(u => u.streak_current > 0)}
              currentUserId={user?.id || null}
              locale={locale}
              showVibes={false}
            />
          </div>
        </TabsContent>
      </Tabs>
        </div>
      </div>
    </div>
  )
}
