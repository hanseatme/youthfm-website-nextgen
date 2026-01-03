import { setRequestLocale } from 'next-intl/server'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { Trophy } from 'lucide-react'
import { TopSongsList, type TopSongRow } from '@/components/top-songs/top-songs-list'

interface TopSongsPageProps {
  params: Promise<{ locale: string }>
}

export default async function TopSongsPage({ params }: TopSongsPageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('topSongs')
  const supabase = await createClient()

  const { data, error } = await supabase
    .rpc('get_top_songs')

  const songs = (data as TopSongRow[] | null) ?? []

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
        <div className="max-w-5xl mx-auto w-full space-y-6">
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">{t('title')}</h1>
              <p className="text-muted-foreground">{t('subtitle')}</p>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6">
            {error || songs.length === 0 ? (
              <div className="text-center text-muted-foreground py-10">
                {t('empty')}
              </div>
            ) : (
              <TopSongsList
                songs={songs}
                locale={locale}
                labels={{
                  unknownArtist: t('unknownArtist'),
                  avg: t('avg'),
                  topReaction: t('topReaction'),
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
