'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Play, Pause, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

type FunkbookStyle = {
  preset?: string
  gradient?: string
  accent?: string
  sticker?: string
  pattern?: string
  layout?: string
  show_song?: boolean
}

type FunkbookCard = {
  id: string
  date: string
  slot: number | null
  note: string
  visibility?: string | null
  energy_level?: number | null
  situation?: string | null
  mood_tags?: string[] | null
  activity_tags?: string[] | null
  style?: unknown
  songs?: {
    title: string
    artist: string | null
    preview_url: string | null
    track_id: number | null
  } | null
}

function toStyle(value: unknown): FunkbookStyle {
  if (!value || typeof value !== 'object') {
    return { preset: 'pulse', gradient: 'pulse', accent: '#7c3aed', sticker: '🎧', pattern: 'none', layout: 'classic', show_song: true }
  }
  const v = value as Record<string, unknown>
  return {
    preset: typeof v.preset === 'string' ? v.preset : 'pulse',
    gradient: typeof v.gradient === 'string' ? v.gradient : typeof v.preset === 'string' ? v.preset : 'pulse',
    accent: typeof v.accent === 'string' ? v.accent : '#7c3aed',
    sticker: typeof v.sticker === 'string' ? v.sticker : '🎧',
    pattern: typeof v.pattern === 'string' ? v.pattern : 'none',
    layout: typeof v.layout === 'string' ? v.layout : 'classic',
    show_song: typeof v.show_song === 'boolean' ? v.show_song : true,
  }
}

function getGradientClasses(style: FunkbookStyle) {
  const key = style.gradient || style.preset || 'pulse'
  switch (key) {
    case 'cosmic':
      return 'from-violet-600/25 via-indigo-500/10 to-sky-500/5'
    case 'peach':
      return 'from-orange-400/20 via-rose-400/10 to-amber-200/5'
    case 'ice':
      return 'from-cyan-500/20 via-sky-500/10 to-slate-500/5'
    case 'sand':
      return 'from-amber-500/20 via-yellow-500/10 to-stone-500/5'
    case 'orchid':
      return 'from-fuchsia-500/25 via-pink-500/10 to-violet-500/5'
    case 'mint':
      return 'from-emerald-400/20 via-teal-400/10 to-sky-500/5'
    case 'aurora':
      return 'from-emerald-500/25 via-teal-500/10 to-lime-500/5'
    case 'neon':
      return 'from-fuchsia-500/25 via-violet-500/10 to-sky-500/5'
    case 'synth':
      return 'from-cyan-500/25 via-fuchsia-500/10 to-purple-500/5'
    case 'lava':
      return 'from-red-500/25 via-rose-500/10 to-orange-500/5'
    case 'citrus':
      return 'from-lime-500/20 via-yellow-500/10 to-orange-500/5'
    case 'forest':
      return 'from-green-600/20 via-emerald-500/10 to-slate-500/5'
    case 'mono':
      return 'from-slate-500/25 via-zinc-500/10 to-stone-500/5'
    case 'ruby':
      return 'from-rose-500/25 via-pink-500/10 to-red-500/5'
    case 'sunset':
      return 'from-rose-500/25 via-orange-500/10 to-amber-500/5'
    case 'ocean':
      return 'from-emerald-500/20 via-cyan-500/10 to-sky-500/5'
    case 'midnight':
      return 'from-indigo-500/25 via-fuchsia-500/10 to-slate-500/5'
    case 'pulse':
    default:
      return 'from-violet-500/25 via-purple-500/10 to-primary/5'
  }
}

function getPatternOverlayClasses(pattern: string | null | undefined) {
  switch (pattern) {
    case 'dots':
      return "opacity-70 mix-blend-overlay bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.22)_1px,transparent_0)] bg-[length:18px_18px]"
    case 'grid':
      return "opacity-70 mix-blend-overlay bg-[linear-gradient(to_right,rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.18)_1px,transparent_1px)] bg-[size:42px_42px]"
    case 'diagonal':
      return "opacity-60 mix-blend-overlay bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.16)_0,rgba(255,255,255,0.16)_2px,transparent_2px,transparent_12px)]"
    case 'halo':
      return "opacity-100 mix-blend-soft-light bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.55)_0,transparent_52%),radial-gradient(circle_at_78%_58%,rgba(255,255,255,0.42)_0,transparent_62%),radial-gradient(circle_at_30%_70%,rgba(255,255,255,0.24)_0,transparent_58%)]"
    case 'waves':
      return "opacity-70 mix-blend-overlay bg-[repeating-radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.18)_0,rgba(255,255,255,0.18)_2px,transparent_2px,transparent_18px)]"
    case 'stars':
      return "opacity-100 mix-blend-soft-light bg-[radial-gradient(circle,rgba(255,255,255,0.38)_1.2px,transparent_1.2px),radial-gradient(circle,rgba(255,255,255,0.24)_1px,transparent_1px)] bg-[size:120px_120px] bg-[position:0_0,60px_60px]"
    default:
      return ''
  }
}

function getPreviewId(card: FunkbookCard) {
  const trackId = card.songs?.track_id
  if (typeof trackId === 'number' && Number.isFinite(trackId) && trackId > 0) return trackId
  const previewUrl = card.songs?.preview_url
  const match = typeof previewUrl === 'string' ? previewUrl.match(/\/api\/preview\/(\d+)/) : null
  if (match) {
    const parsed = Number(match[1])
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return null
}

export function FunkbookCards({
  locale,
  cards,
  title,
  subtitle,
  showVisibilityBadges = false,
}: {
  locale: string
  cards: FunkbookCard[]
  title: string
  subtitle?: string
  showVisibilityBadges?: boolean
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playingCardId, setPlayingCardId] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const normalized = useMemo(() => cards.slice(0, 10), [cards])

  const togglePreview = async (card: FunkbookCard) => {
    const previewId = getPreviewId(card)
    if (!previewId) return

    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.preload = 'none'
      audioRef.current.addEventListener('ended', () => setPlayingCardId(null))
      audioRef.current.addEventListener('pause', () => setPlayingCardId(null))
    }

    if (playingCardId === card.id) {
      audioRef.current.pause()
      setPlayingCardId(null)
      return
    }

    audioRef.current.pause()
    audioRef.current.currentTime = 0
    audioRef.current.src = `/api/preview/${previewId}`

    try {
      await audioRef.current.play()
      setPlayingCardId(card.id)

      if (card.songs?.track_id) {
        fetch('/api/songs/preview-play', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ track_id: card.songs.track_id }),
        }).catch(() => {})
      }
    } catch {
      setPlayingCardId(null)
    }
  }

  return (
    <div className="glass-card rounded-3xl p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {normalized.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {locale === 'de' ? 'Noch keine öffentlichen Funkbuch-Karten.' : 'No public Funkbook cards yet.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {normalized.map((card) => {
            const style = toStyle(card.style)
            const previewId = getPreviewId(card)
            const isPlaying = playingCardId === card.id
            return (
              <div
                key={card.id}
                className={cn('relative rounded-3xl border border-border/50 overflow-hidden bg-gradient-to-br', getGradientClasses(style))}
              >
                <div className="absolute inset-y-0 left-0 w-2" style={{ backgroundColor: style.accent || '#7c3aed' }} />
                {style.pattern && style.pattern !== 'none' && (
                  <div className={cn('absolute inset-0', getPatternOverlayClasses(style.pattern))} />
                )}

                <div className={cn('relative p-4', style.layout === 'polaroid' && 'bg-white/90 text-slate-900')}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={cn('text-xs', style.layout === 'polaroid' ? 'text-slate-700' : 'text-muted-foreground')}>
                        {new Date(card.date).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', { day: '2-digit', month: 'short' })}{' '}
                        {card.slot ? `• ${locale === 'de' ? 'Karte' : 'Card'} ${card.slot}` : ''}
                      </p>
                      <p className="text-sm font-semibold truncate">
                        {card.songs?.artist ? `${card.songs.artist} — ` : ''}{card.songs?.title || (locale === 'de' ? 'Funkbuch' : 'Funkbook')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-lg">{style.sticker || '🎧'}</span>
                      {previewId && (
                        <button
                          type="button"
                          onClick={() => togglePreview(card)}
                          className={cn(
                            'h-10 w-10 rounded-2xl inline-flex items-center justify-center',
                            'bg-background/70 backdrop-blur border border-border/60 shadow-md',
                            'hover:bg-background transition-colors',
                            isPlaying && 'ring-2 ring-primary/40'
                          )}
                          aria-label={isPlaying ? 'Pause preview' : 'Play preview'}
                        >
                          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-[1px]" />}
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="mt-3 text-sm whitespace-pre-wrap">
                    {card.note}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {typeof card.energy_level === 'number' && (
                      <Badge variant="secondary" className="rounded-full">
                        {locale === 'de' ? 'Energy' : 'Energy'} {card.energy_level}/10
                      </Badge>
                    )}
                    {card.situation && (
                      <Badge variant="secondary" className="rounded-full">
                        {card.situation}
                      </Badge>
                    )}
                    {(card.mood_tags || []).map((t) => (
                      <Badge key={`${card.id}-m-${t}`} variant="secondary" className="rounded-full">
                        {t}
                      </Badge>
                    ))}
                    {(card.activity_tags || []).map((t) => (
                      <Badge key={`${card.id}-a-${t}`} variant="secondary" className="rounded-full">
                        {t}
                      </Badge>
                    ))}
                    {showVisibilityBadges && card.visibility === 'private' && (
                      <Badge variant="secondary" className="rounded-full">
                        {locale === 'de' ? 'Privat' : 'Private'}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
