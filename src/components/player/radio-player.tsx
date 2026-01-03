'use client'

import { useTranslations } from 'next-intl'
import { Play, Pause, Volume2, VolumeX, Radio, Loader2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useAudioPlayer } from '@/lib/hooks/use-audio-player'
import { useNowPlaying } from '@/lib/hooks/use-now-playing'
import { cn } from '@/lib/utils'

interface RadioPlayerProps {
  className?: string
  compact?: boolean
}

export function RadioPlayer({ className, compact = false }: RadioPlayerProps) {
  const t = useTranslations('player')
  const { data: nowPlaying, isLoading: isLoadingInfo, error: infoError } = useNowPlaying()
  const {
    isPlaying,
    isLoading: isLoadingAudio,
    volume,
    isMuted,
    toggle,
    setVolume,
    toggleMute,
  } = useAudioPlayer()

  const progress = nowPlaying?.elapsed && nowPlaying?.duration
    ? (nowPlaying.elapsed / nowPlaying.duration) * 100
    : 0

  if (compact) {
    return (
      <div className={cn('flex items-center gap-3 p-2 bg-card rounded-lg border', className)}>
        <Button
          size="icon"
          variant="ghost"
          onClick={toggle}
          disabled={isLoadingAudio}
          className="h-10 w-10 shrink-0"
        >
          {isLoadingAudio ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5" />
          )}
        </Button>

        <div className="flex-1 min-w-0">
          {isLoadingInfo ? (
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          ) : nowPlaying ? (
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{nowPlaying.title}</p>
              <p className="text-xs text-muted-foreground truncate">
                {nowPlaying.artist}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {infoError ? 'Verbindungsfehler' : 'Lade...'}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" onClick={toggleMute} className="h-8 w-8">
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Album Art / Visual */}
          <div className="relative aspect-square w-full lg:w-64 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className={cn(
                  'w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center transition-all duration-300',
                  isPlaying && 'animate-pulse scale-110'
                )}
              >
                <Radio className="h-12 w-12 text-primary" />
              </div>
            </div>

            {/* Animated rings when playing */}
            {isPlaying && (
              <>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full border-2 border-primary/30 animate-ping" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-40 h-40 rounded-full border border-primary/20 animate-pulse" />
                </div>
              </>
            )}

            {/* Live indicator */}
            <Badge className="absolute top-3 left-3 gap-1" variant="destructive">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
              </span>
              LIVE
            </Badge>
          </div>

          {/* Info and Controls */}
          <div className="flex-1 flex flex-col justify-between gap-4">
            {/* Track Info */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t('nowPlaying')}</p>
              {isLoadingInfo ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-5 w-1/2" />
                </div>
              ) : nowPlaying ? (
                <>
                  <h2 className="text-2xl font-bold tracking-tight line-clamp-2">
                    {nowPlaying.title}
                  </h2>
                  <p className="text-lg text-muted-foreground">
                    {nowPlaying.artist}
                  </p>
                  {nowPlaying.show && (
                    <p className="text-sm text-muted-foreground">
                      {t('show')}: {nowPlaying.show}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-lg text-muted-foreground">
                  {infoError ? 'Keine Verbindung zum Stream' : 'Lade Informationen...'}
                </p>
              )}
            </div>

            {/* Progress */}
            {nowPlaying?.elapsed !== undefined && nowPlaying?.duration !== undefined && (
              <div className="space-y-1">
                <Progress value={progress} className="h-1" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatTime(nowPlaying.elapsed)}</span>
                  <span>{formatTime(nowPlaying.duration)}</span>
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center gap-4">
              {/* Play/Pause */}
              <Button
                size="lg"
                onClick={toggle}
                disabled={isLoadingAudio}
                className="h-14 w-14 rounded-full"
              >
                {isLoadingAudio ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6 ml-1" />
                )}
              </Button>

              {/* Volume */}
              <div className="flex items-center gap-2 flex-1 max-w-xs">
                <Button size="icon" variant="ghost" onClick={toggleMute}>
                  {isMuted || volume === 0 ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </Button>
                <Slider
                  value={[isMuted ? 0 : volume * 100]}
                  onValueChange={([v]) => setVolume(v / 100)}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Listeners count (placeholder) */}
              <div className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>--</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
