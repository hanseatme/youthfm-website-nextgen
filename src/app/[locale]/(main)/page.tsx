import { setRequestLocale } from 'next-intl/server'
import { ThemeOfDay } from '@/components/theme/theme-of-day'
import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/types/database'

interface HomePageProps {
  params: Promise<{ locale: string }>
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  // Fetch today's theme
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [{ data: themeData }, { data: duelsData }] = await Promise.all([
    supabase
      .from('daily_themes')
      .select('title, title_en, teaser, teaser_en, image_url')
      .eq('date', today)
      .single(),
    supabase
      .from('duels')
      .select(`
        id,
        votes_a,
        votes_b,
        started_at,
        ended_at,
        status,
        prompt,
        option_a_text,
        option_b_text,
        song_a:songs!duels_song_a_id_fkey(title, artist),
        song_b:songs!duels_song_b_id_fkey(title, artist)
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1),
  ])

  const theme = themeData as Tables<'daily_themes'> | null
  const activeDuel = duelsData?.[0] || null

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
        <div className="max-w-7xl mx-auto w-full">
          {/* Theme of the Day - Full Width Hero */}
          <div className="mb-8">
            <ThemeOfDay
              theme={theme ? {
                title: locale === 'en' && theme.title_en ? theme.title_en : theme.title,
                teaser: locale === 'en' && theme.teaser_en ? theme.teaser_en : theme.teaser || '',
                image_url: theme.image_url,
              } : undefined}
              activeDuel={activeDuel}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
