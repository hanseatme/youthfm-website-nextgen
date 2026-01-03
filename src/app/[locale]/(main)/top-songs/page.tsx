import { setRequestLocale } from 'next-intl/server'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { Music2, Trophy, Flame, ThumbsUp, Meh, ThumbsDown, SkipForward, Star } from 'lucide-react'

interface TopSongsPageProps {
  params: Promise<{ locale: string }>
}

interface TopSong {
  song_id: string
  title: string
  artist: string | null
  artwork_url: string | null
  total_feedback: number
  avg_reaction: number | null
  top_reaction: number | null
}

export default async function TopSongsPage({ params }: TopSongsPageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('topSongs')
  const supabase = await createClient()

  const { data, error } = await supabase
    .rpc('get_top_songs', { p_limit: 10 })

  const songs = (data as TopSong[] | null) ?? []

  const getReactionIcon = (reaction: number | null) => {
    switch (reaction) {
      case 1:
        return <Flame className="h-4 w-4 text-orange-500" />
      case 2:
        return <ThumbsUp className="h-4 w-4 text-green-500" />
      case 3:
        return <Meh className="h-4 w-4 text-gray-500" />
      case 4:
        return <ThumbsDown className="h-4 w-4 text-red-400" />
      case 5:
        return <SkipForward className="h-4 w-4 text-purple-500" />
      default:
        return <Star className="h-4 w-4 text-muted-foreground" />
    }
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
              <div className="space-y-4">
                {songs.map((song, index) => (
                  <div
                    key={song.song_id}
                    className="flex items-center gap-4 rounded-2xl border border-border/50 bg-background/40 px-4 py-3"
                  >
                    <div className="w-8 text-center text-sm font-bold text-muted-foreground">
                      {index + 1}
                    </div>
                    <div className="h-12 w-12 overflow-hidden rounded-xl bg-muted flex items-center justify-center">
                      {song.artwork_url ? (
                        <img
                          src={song.artwork_url}
                          alt={song.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Music2 className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{song.title}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {song.artist || t('unknownArtist')}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">
                        {t('avg')}: {song.avg_reaction?.toFixed(2) ?? '-'}
                      </div>
                      <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        {getReactionIcon(song.top_reaction)}
                        <span>{t('topReaction')}</span>
                      </div>
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
