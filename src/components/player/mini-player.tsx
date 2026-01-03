'use client'

import { Play, Pause, Volume2, VolumeX, Loader2, Radio } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAudioPlayer } from '@/lib/hooks/use-audio-player'
import { cn } from '@/lib/utils'

interface MiniPlayerProps {
  className?: string
}

export function MiniPlayer({ className }: MiniPlayerProps) {
  const { nowPlaying, moderator, isPlaying, isLoading, toggle, isMuted, toggleMute } = useAudioPlayer()

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 glass-card border-t',
        className
      )}
    >
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex h-16 items-center gap-4">
        {/* Play/Pause */}
        <Button
          size="icon"
          onClick={toggle}
          disabled={isLoading}
          className="h-10 w-10 shrink-0 rounded-full bg-primary hover:bg-primary/90"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          ) : isPlaying ? (
            <Pause className="h-5 w-5 text-white" fill="white" />
          ) : (
            <Play className="h-5 w-5 ml-0.5 text-white" fill="white" />
          )}
        </Button>

        {/* Equalizer when playing */}
        {isPlaying && (
          <div className="flex items-end gap-0.5 h-4">
            {[1, 2, 3].map((bar) => (
              <div
                key={bar}
                className="w-1 bg-primary rounded-full animate-equalizer"
                style={{ animationDelay: `${bar * 0.15}s` }}
              />
            ))}
          </div>
        )}

        {/* Track Info */}
        <div className="flex-1 min-w-0">
          {nowPlaying ? (
            <>
              <p className="text-sm font-medium truncate">{nowPlaying.title}</p>
              <p className="text-xs text-muted-foreground truncate">
                {nowPlaying.artist}
              </p>
            </>
          ) : (
            <div className="space-y-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          )}
        </div>

        {/* Moderator indicator */}
        {moderator && (
          <div className="hidden sm:flex items-center gap-2 text-sm">
            {moderator.isLive ? (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
            ) : (
              <Radio className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-muted-foreground">{moderator.name}</span>
          </div>
        )}

        {/* Volume Toggle */}
        <Button size="icon" variant="ghost" onClick={toggleMute}>
          {isMuted ? (
            <VolumeX className="h-5 w-5" />
          ) : (
            <Volume2 className="h-5 w-5" />
          )}
        </Button>
        </div>
      </div>
    </div>
  )
}
