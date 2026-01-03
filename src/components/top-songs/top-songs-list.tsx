'use client'

import { useEffect, useRef, useState } from 'react'
import { Music2, Flame, ThumbsUp, Meh, ThumbsDown, SkipForward, Star, Play, Pause } from 'lucide-react'
import { toast } from 'sonner'

export interface TopSongRow {
  song_id: string
  title: string
  artist: string | null
  artwork_url: string | null
  track_id?: number | null
  preview_url?: string | null
  external_id?: string | null
  total_feedback: number
  avg_reaction: number | null
  top_reaction: number | null
}

export function TopSongsList({
  songs,
  locale,
  labels,
}: {
  songs: TopSongRow[]
  locale: string
  labels: { unknownArtist: string; avg: string; topReaction: string }
}) {
  const [playingSongId, setPlayingSongId] = useState<string | null>(null)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause()
        previewAudioRef.current = null
      }
    }
  }, [])

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

  const getPreviewId = (song: { track_id?: number | null; preview_url?: string | null; external_id?: string | null }) => {
    if (typeof song.track_id === 'number' && Number.isFinite(song.track_id) && song.track_id > 0) return song.track_id
    if (typeof song.preview_url === 'string') {
      const match = song.preview_url.match(/\/api\/preview\/(\d+)/)
      if (match) {
        const parsed = Number(match[1])
        if (Number.isFinite(parsed) && parsed > 0) return parsed
      }
    }
    if (typeof song.external_id === 'string') {
      const parsed = Number(song.external_id)
      if (Number.isFinite(parsed) && parsed > 0) return parsed
    }
    return null
  }

  const togglePreview = async (song: TopSongRow) => {
    const previewId = getPreviewId(song)
    if (!previewId) return

    if (!previewAudioRef.current) {
      previewAudioRef.current = new Audio()
      previewAudioRef.current.preload = 'none'
      previewAudioRef.current.addEventListener('ended', () => setPlayingSongId(null))
      previewAudioRef.current.addEventListener('pause', () => setPlayingSongId(null))
    }

    if (playingSongId === song.song_id) {
      previewAudioRef.current.pause()
      setPlayingSongId(null)
      return
    }

    try {
      previewAudioRef.current.pause()
      previewAudioRef.current.currentTime = 0
      previewAudioRef.current.src = `/api/preview/${previewId}`
      await previewAudioRef.current.play()
      setPlayingSongId(song.song_id)
      fetch('/api/songs/preview-play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song_id: song.song_id }),
      }).catch(() => {})
    } catch (error) {
      console.error('Preview playback error:', error)
      toast.error(locale === 'de' ? 'Hörprobe konnte nicht abgespielt werden' : 'Failed to play preview')
      setPlayingSongId(null)
    }
  }

  return (
    <div className="space-y-4">
      {songs.map((song, index) => {
        const hasPreview = Boolean(getPreviewId(song))
        const isPlaying = playingSongId === song.song_id

        return (
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
                {song.artist || labels.unknownArtist}
              </p>
            </div>

            {hasPreview && (
              <button
                type="button"
                onClick={() => togglePreview(song)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/70 text-foreground hover:bg-background transition-colors"
                aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </button>
            )}

            <div className="text-right">
              <div className="text-sm font-semibold">
                {labels.avg}: {song.avg_reaction?.toFixed(2) ?? '-'}
              </div>
              <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                {getReactionIcon(song.top_reaction)}
                <span>{labels.topReaction}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

