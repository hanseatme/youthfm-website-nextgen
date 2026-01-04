'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Play, Pause, History, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type RecentTrack = {
  title: string
  artist: string
  played_at: string
  preview_url: string
  track_id: number
}

function formatTime(locale: string, iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString(locale === 'de' ? 'de-DE' : 'en-US', { hour: '2-digit', minute: '2-digit' })
}

function getPreviewId(track: RecentTrack) {
  if (typeof track.track_id === 'number' && Number.isFinite(track.track_id) && track.track_id > 0) return track.track_id
  const match = typeof track.preview_url === 'string' ? track.preview_url.match(/\/api\/preview\/(\d+)/) : null
  if (match) {
    const parsed = Number(match[1])
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return null
}

export function RecentTracksRail({
  locale,
  limit = 10,
  className,
}: {
  locale: string
  limit?: number
  className?: string
}) {
  const [tracks, setTracks] = useState<RecentTrack[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [playingTrackId, setPlayingTrackId] = useState<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const endpoint = useMemo(() => `/api/history/recent?limit=${limit}`, [limit])

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const fetchTracks = async (isBackground = false) => {
    if (!isBackground) setLoading(true)
    if (isBackground) setRefreshing(true)
    try {
      const res = await fetch(endpoint, { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data)) {
        setTracks(data as RecentTrack[])
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchTracks(false)
    const interval = setInterval(() => fetchTracks(true), 20_000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint])

  const updateScrollButtons = () => {
    const el = scrollerRef.current
    if (!el) return
    const maxScrollLeft = el.scrollWidth - el.clientWidth
    setCanScrollLeft(el.scrollLeft > 8)
    setCanScrollRight(el.scrollLeft < maxScrollLeft - 8)
  }

  useEffect(() => {
    updateScrollButtons()
    const el = scrollerRef.current
    if (!el) return
    const onScroll = () => updateScrollButtons()
    el.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      el.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [tracks.length, loading])

  const scrollByCards = (direction: 'left' | 'right') => {
    const el = scrollerRef.current
    if (!el) return
    const delta = direction === 'left' ? -260 : 260
    el.scrollBy({ left: delta, behavior: 'smooth' })
  }

  const togglePreview = async (track: RecentTrack) => {
    const previewId = getPreviewId(track)
    if (!previewId) return

    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.preload = 'none'
      audioRef.current.addEventListener('ended', () => setPlayingTrackId(null))
      audioRef.current.addEventListener('pause', () => setPlayingTrackId(null))
    }

    if (playingTrackId === track.track_id) {
      audioRef.current.pause()
      setPlayingTrackId(null)
      return
    }

    audioRef.current.pause()
    audioRef.current.currentTime = 0
    audioRef.current.src = `/api/preview/${previewId}`

    try {
      await audioRef.current.play()
      setPlayingTrackId(track.track_id)
      fetch('/api/songs/preview-play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ track_id: track.track_id }),
      }).catch(() => {})
    } catch {
      setPlayingTrackId(null)
    }
  }

  return (
    <div className={cn('relative', className)}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-semibold">
            {locale === 'de' ? 'Zuletzt gespielt' : 'Recently played'}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => fetchTracks(true)}
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Refresh history"
        >
          <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          {locale === 'de' ? 'Aktualisieren' : 'Refresh'}
        </button>
      </div>

      <div className="relative">
        <div
          ref={scrollerRef}
          className={cn(
            'flex gap-4 overflow-x-auto pb-2 px-2',
            'snap-x snap-mandatory scroll-smooth',
            'touch-pan-x hide-scrollbar'
          )}
        >
          {loading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="snap-start shrink-0 w-[240px] h-[120px] rounded-2xl border border-border/50 bg-background/40 animate-pulse"
              />
            ))
          ) : tracks.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6">
              {locale === 'de' ? 'Noch keine History.' : 'No history yet.'}
            </div>
          ) : (
            tracks.map((track) => {
              const previewId = getPreviewId(track)
              const isPlaying = playingTrackId === track.track_id
              return (
                <div
                  key={`${track.track_id}-${track.played_at}`}
                  className={cn(
                    'snap-start shrink-0 w-[240px] rounded-2xl border border-border/50 bg-background/40 p-4',
                    'backdrop-blur',
                    'hover:bg-background/55 transition-colors'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">
                        {formatTime(locale, track.played_at)}
                      </div>
                      <div className="mt-1 font-semibold text-sm truncate">
                        {track.title}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {track.artist}
                      </div>
                    </div>

                    {previewId && (
                      <button
                        type="button"
                        onClick={() => togglePreview(track)}
                        className={cn(
                          'shrink-0 h-12 w-12 rounded-2xl',
                          'bg-gradient-to-br from-primary via-primary/80 to-fuchsia-500 text-white',
                          'shadow-lg shadow-primary/25 border border-white/10',
                          'hover:shadow-xl hover:shadow-primary/35 hover:scale-[1.03] transition-all',
                          isPlaying && 'ring-2 ring-primary/40'
                        )}
                        aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
                      >
                        {isPlaying ? (
                          <Pause className="h-6 w-6 mx-auto" />
                        ) : (
                          <Play className="h-6 w-6 mx-auto translate-x-[1px]" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {(canScrollLeft || canScrollRight) && (
          <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => scrollByCards('left')}
              disabled={!canScrollLeft}
              className={cn(
                'pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full',
                'bg-background/80 backdrop-blur border border-border/60 shadow-md',
                'text-foreground hover:bg-background transition-colors',
                !canScrollLeft && 'opacity-0'
              )}
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollByCards('right')}
              disabled={!canScrollRight}
              className={cn(
                'pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full',
                'bg-background/80 backdrop-blur border border-border/60 shadow-md',
                'text-foreground hover:bg-background transition-colors',
                !canScrollRight && 'opacity-0'
              )}
              aria-label="Scroll right"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
