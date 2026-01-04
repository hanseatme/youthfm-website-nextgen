'use client'

import { useState } from 'react'
import { Play, Pause, Volume2, VolumeX, Loader2, Users, MessageCircle, SlidersVertical, ChevronDown } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useAudioPlayer } from '@/lib/hooks/use-audio-player'
import { cn } from '@/lib/utils'
import { MoodFeedback } from './mood-feedback'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'
import { toast } from 'sonner'

interface HeroPlayerProps {
  showMoodFeedback?: boolean
}

export function HeroPlayer({ showMoodFeedback = true }: HeroPlayerProps) {
  const { user, profile, refreshProfile } = useAuth()
  const supabase = createClient()
  const {
    isPlaying,
    isLoading,
    volume,
    isMuted,
    toggle,
    setVolume,
    toggleMute,
    nowPlaying,
  } = useAudioPlayer()
  const [studioMessage, setStudioMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [songTitle, setSongTitle] = useState('')
  const [songArtist, setSongArtist] = useState('')
  const [dedicationMessage, setDedicationMessage] = useState('')
  const [isRequesting, setIsRequesting] = useState(false)
  const [showVolume, setShowVolume] = useState(false)
  const [studioSpecialsOpen, setStudioSpecialsOpen] = useState(false)

  const moderatorName = 'Jan'
  const moderatorImage = '/mod_jan.png'

  const formatTime = (seconds: number) => {
    const safe = Math.max(0, Math.floor(seconds))
    const minutes = Math.floor(safe / 60)
    const remainder = safe % 60
    return `${minutes}:${remainder.toString().padStart(2, '0')}`
  }

  const progress = nowPlaying?.elapsed !== undefined && nowPlaying?.duration
    ? Math.min(100, Math.max(0, (nowPlaying.elapsed / nowPlaying.duration) * 100))
    : 0

  const sendStudioMessage = async () => {
    const trimmed = studioMessage.trim()
    if (!trimmed) return
    if (!user) {
      toast.error('Bitte zuerst anmelden.')
      return
    }

    setIsSending(true)
    const { error } = await supabase.from('chat_messages').insert({
      user_id: user.id,
      channel: 'studio',
      content: trimmed,
    })

    if (error) {
      console.error('Studio message error:', error)
      toast.error('Nachricht konnte nicht gesendet werden.')
    } else {
      toast.success('Nachricht ans Studio gesendet.')
      setStudioMessage('')
    }
    setIsSending(false)
  }

  const sendStudioRequest = async (type: 'song_skip' | 'song_request_pool' | 'daily_dedication') => {
    if (!user) {
      toast.error('Bitte zuerst anmelden.')
      return
    }

    setIsRequesting(true)
    try {
      const response = await fetch('/api/studio/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          title: songTitle.trim(),
          artist: songArtist.trim(),
          message: dedicationMessage.trim(),
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Request failed')
      }

      toast.success('Anfrage ans Studio gesendet.')
      setSongTitle('')
      setSongArtist('')
      setDedicationMessage('')
      await refreshProfile()
    } catch (err) {
      console.error('Studio request error:', err)
      toast.error('Anfrage konnte nicht gesendet werden.')
    } finally {
      setIsRequesting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Main Player Card */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 relative overflow-visible space-y-6">
                {/* Player Header */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="flex flex-col items-center gap-6 w-full md:flex-row md:items-start md:justify-between md:text-left">
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={toggle}
                disabled={isLoading}
                className={cn(
                  "w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center transition-all duration-300",
                  "bg-gradient-to-br from-primary to-primary/80",
                  "shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40",
                  "hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {isLoading ? (
                  <Loader2 className="w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 text-white animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 text-white" fill="white" />
                ) : (
                  <Play className="w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 text-white ml-1" fill="white" />
                )}
              </button>

              <div className="flex items-end justify-center gap-1 h-8 sm:h-10">
                {[1, 2, 3, 4, 5].map((bar) => (
                  <div
                    key={bar}
                    className={cn(
                      "w-1 sm:w-1.5 rounded-full transition-all duration-300",
                      isPlaying ? "bg-primary animate-equalizer" : "bg-muted-foreground/30 h-2"
                    )}
                    style={{
                      animationDelay: isPlaying ? `${bar * 0.1}s` : '0s',
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="flex-1 space-y-3">
              <div className="space-y-2">
                {nowPlaying ? (
                  <>
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold truncate">
                      {nowPlaying.title}
                    </h2>
                    <p className="text-base sm:text-lg text-muted-foreground truncate">
                      {nowPlaying.artist}
                    </p>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Skeleton className="h-7 sm:h-8 w-full max-w-xs mx-auto md:mx-0" />
                    <Skeleton className="h-5 sm:h-6 w-48 mx-auto md:mx-0" />
                  </div>
                )}
              </div>

              {nowPlaying?.listeners !== undefined && (
                <div className="flex items-center justify-center md:justify-start gap-1.5 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{nowPlaying.listeners} Hörer</span>
                </div>
              )}

              {nowPlaying?.elapsed !== undefined && nowPlaying?.duration !== undefined && (
                <div className="flex items-center gap-3 w-full">
                  <div className="flex-1">
                    <Progress value={progress} className="h-1" />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{formatTime(nowPlaying.elapsed)}</span>
                      <span>{formatTime(nowPlaying.duration)}</span>
                    </div>
                  </div>
                  <div className="relative flex items-center gap-2">
                    <button
                      onClick={toggleMute}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1"
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-5 h-5" />
                      ) : (
                        <Volume2 className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={() => setShowVolume((prev) => !prev)}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1"
                      aria-label="Lautstaerke"
                    >
                      <SlidersVertical className="w-5 h-5" />
                    </button>
                    {showVolume && (
                      <div className="absolute right-0 top-9 z-20 rounded-xl border border-border bg-background/95 p-3 shadow-lg">
                        <Slider
                          orientation="vertical"
                          value={[isMuted ? 0 : volume * 100]}
                          onValueChange={([val]) => setVolume(val / 100)}
                          max={100}
                          step={1}
                          className="h-28"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4 md:pr-6 md:border-r md:border-border/40">
            {showMoodFeedback && nowPlaying?.category === 'music' ? (
              <MoodFeedback
                compact
                embedded
                songTrackId={nowPlaying.track_id ?? null}
                songPreviewUrl={nowPlaying.preview_url ?? null}
                songTitle={nowPlaying.title}
                songArtist={nowPlaying.artist}
                songArtwork={nowPlaying.artwork ?? null}
              />
            ) : (
              <div className="text-sm text-muted-foreground">
                Song-Bewertung ist verfuegbar, sobald Musik laeuft.
              </div>
            )}
          </div>

          <div className="space-y-4 md:pl-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-full bg-white p-1 shadow-md">
                  <img
                    src={moderatorImage}
                    alt={moderatorName}
                    className="h-full w-full object-cover object-top rounded-full"
                  />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Moderator</p>
                  <p className="text-lg sm:text-xl font-semibold leading-tight">{moderatorName}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-500">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                    </span>
                    Live On Air
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2 rounded-full" disabled={!user}>
                      <MessageCircle className="h-4 w-4" />
                      Nachricht ins Studio
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Nachricht ins Studio</DialogTitle>
                      <DialogDescription>
                        Teile deinen Wunsch oder ein Gruß. Maximal 500 Zeichen.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                      <textarea
                        value={studioMessage}
                        onChange={(e) => setStudioMessage(e.target.value)}
                        maxLength={500}
                        placeholder="Nachricht ans Studio..."
                        className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                        rows={4}
                        disabled={!user || isSending}
                      />
                      <div className="text-xs text-muted-foreground text-right">
                        {studioMessage.length}/500
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={sendStudioMessage}
                        disabled={!user || isSending || studioMessage.trim().length === 0}
                      >
                        {isSending ? 'Sende...' : 'Senden'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                {!user && (
                  <p className="text-xs text-muted-foreground">
                    Melde dich an, um eine Nachricht ans Studio zu senden.
                  </p>
                )}
              </div>
            </div>

            {(profile?.skip_credits || profile?.song_request_pool_credits || profile?.dedication_credits) ? (
              <div className="border-t border-border/60 pt-4">
                <button
                  type="button"
                  onClick={() => setStudioSpecialsOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left transition-colors hover:bg-muted/30"
                  aria-expanded={studioSpecialsOpen}
                  aria-controls="studio-specials"
                >
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Studio Specials
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      studioSpecialsOpen && "rotate-180"
                    )}
                  />
                </button>

                {studioSpecialsOpen && (
                  <div id="studio-specials" className="mt-3 space-y-4">
                {profile.skip_credits > 0 && (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/60 px-3 py-2">
                    <div className="text-xs">
                      Song-Skip verfuegbar: <span className="font-semibold">{profile.skip_credits}</span>
                    </div>
                    <button
                      onClick={() => sendStudioRequest('song_skip')}
                      disabled={isRequesting}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        "bg-primary text-primary-foreground hover:bg-primary/90",
                        "disabled:cursor-not-allowed disabled:opacity-60"
                      )}
                    >
                      Skip anfragen
                    </button>
                  </div>
                )}

                {profile.song_request_pool_credits > 0 && (
                  <div className="space-y-2 rounded-xl border border-border/60 bg-background/60 px-3 py-2">
                    <div className="text-xs">
                      Song-Wunsch Pool verfuegbar: <span className="font-semibold">{profile.song_request_pool_credits}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <input
                        value={songTitle}
                        onChange={(e) => setSongTitle(e.target.value)}
                        placeholder="Songtitel"
                        className="w-full rounded-lg border border-border bg-background/80 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                      <input
                        value={songArtist}
                        onChange={(e) => setSongArtist(e.target.value)}
                        placeholder="Artist (optional)"
                        className="w-full rounded-lg border border-border bg-background/80 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => sendStudioRequest('song_request_pool')}
                        disabled={isRequesting || !songTitle.trim()}
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-semibold",
                          "bg-primary text-primary-foreground hover:bg-primary/90",
                          "disabled:cursor-not-allowed disabled:opacity-60"
                        )}
                      >
                        Song anfragen
                      </button>
                    </div>
                  </div>
                )}

                {profile.dedication_credits > 0 && (
                  <div className="space-y-2 rounded-xl border border-border/60 bg-background/60 px-3 py-2">
                    <div className="text-xs">
                      Tages-Widmung verfuegbar: <span className="font-semibold">{profile.dedication_credits}</span>
                    </div>
                    <textarea
                      value={dedicationMessage}
                      onChange={(e) => setDedicationMessage(e.target.value)}
                      maxLength={280}
                      placeholder="Deine Widmung..."
                      className="w-full resize-none rounded-lg border border-border bg-background/80 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                      rows={2}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {dedicationMessage.length}/280
                      </span>
                      <button
                        onClick={() => sendStudioRequest('daily_dedication')}
                        disabled={isRequesting || !dedicationMessage.trim()}
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-semibold",
                          "bg-primary text-primary-foreground hover:bg-primary/90",
                          "disabled:cursor-not-allowed disabled:opacity-60"
                        )}
                      >
                        Widmung senden
                      </button>
                    </div>
                  </div>
                )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}


