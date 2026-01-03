'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import { Timer, Swords, Play, Pause } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Link } from '@/i18n/navigation'

interface DuelPreviewProps {
  duel?: {
    id: string
    song_a: { id: string; title: string; artist: string; track_id?: number | null; preview_url?: string | null; external_id?: string | null } | null
    song_b: { id: string; title: string; artist: string; track_id?: number | null; preview_url?: string | null; external_id?: string | null } | null
    prompt?: string | null
    option_a_text?: string | null
    option_b_text?: string | null
    votes_a: number
    votes_b: number
    started_at: string | null
    ended_at: string | null
    status: string
  } | null
  compact?: boolean
  layout?: 'stacked' | 'horizontal'
}

export function DuelPreview({ duel, compact = false, layout = 'stacked' }: DuelPreviewProps) {
  const t = useTranslations('duel')
  const [playingSongId, setPlayingSongId] = useState<string | null>(null)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null)

  if (!duel) {
    return (
      <div className="text-center py-6">
        <Timer className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Kein aktives Duell</p>
        <p className="text-xs text-muted-foreground mt-1">
          {t('nextDuel', { time: 'bald' })}
        </p>
      </div>
    )
  }

  const totalVotes = duel.votes_a + duel.votes_b
  const percentA = totalVotes > 0 ? (duel.votes_a / totalVotes) * 100 : 50
  const percentB = totalVotes > 0 ? (duel.votes_b / totalVotes) * 100 : 50
  const isClose = Math.abs(percentA - percentB) < 5
  const optionATitle = duel.option_a_text?.trim() || duel.song_a?.title || 'Option A'
  const optionBTitle = duel.option_b_text?.trim() || duel.song_b?.title || 'Option B'
  const optionASubtitle = duel.option_a_text ? null : (duel.song_a?.artist || 'Unbekannt')
  const optionBSubtitle = duel.option_b_text ? null : (duel.song_b?.artist || 'Unbekannt')
  const subtitle = duel.prompt?.trim() || t('subtitle')

  const getPreviewId = (song: { track_id?: number | null; preview_url?: string | null; external_id?: string | null } | null) => {
    if (!song) return null
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

  const previewIdA = getPreviewId(duel.song_a)
  const previewIdB = getPreviewId(duel.song_b)

  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause()
        previewAudioRef.current = null
      }
    }
  }, [])

  const togglePreview = async (song: { id: string } | null, previewId: number | null) => {
    if (!song?.id || !previewId) return

    if (!previewAudioRef.current) {
      previewAudioRef.current = new Audio()
      previewAudioRef.current.preload = 'none'
      previewAudioRef.current.addEventListener('ended', () => setPlayingSongId(null))
      previewAudioRef.current.addEventListener('pause', () => setPlayingSongId(null))
    }

    if (playingSongId === song.id) {
      previewAudioRef.current.pause()
      setPlayingSongId(null)
      return
    }

    try {
      previewAudioRef.current.pause()
      previewAudioRef.current.currentTime = 0
      previewAudioRef.current.src = `/api/preview/${previewId}`
      await previewAudioRef.current.play()
      setPlayingSongId(song.id)
      fetch('/api/songs/preview-play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song_id: song.id }),
      }).catch(() => {})
    } catch (error) {
      console.error('Preview playback error:', error)
      setPlayingSongId(null)
    }
  }

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Swords className={compact ? 'h-4 w-4 text-primary' : 'h-5 w-5 text-primary'} />
          <h3 className={compact ? 'text-sm font-semibold' : 'font-semibold'}>{t('title')}</h3>
        </div>
        {duel.status === 'active' && (
          <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider flex items-center gap-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
            </span>
            LIVE
          </span>
        )}
      </div>

      <p className={compact ? 'text-xs text-muted-foreground' : 'text-sm text-muted-foreground'}>
        {subtitle}
      </p>

      {layout === 'horizontal' ? (
        <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
          {/* Song A */}
          <div className="space-y-2">
            <div className="flex justify-between items-start gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                {previewIdA && duel.song_a && (
                  <button
                    type="button"
                    onClick={() => togglePreview(duel.song_a, previewIdA)}
                    className={[
                      'shrink-0 h-16 w-16 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-fuchsia-500 text-white shadow-lg shadow-primary/30 border border-white/10 hover:shadow-xl hover:shadow-primary/40 hover:scale-[1.03] transition-all',
                      playingSongId === duel.song_a.id ? 'ring-2 ring-primary/40 shadow-primary/50' : '',
                    ].join(' ')}
                    aria-label={playingSongId === duel.song_a.id ? 'Pause preview' : 'Play preview'}
                  >
                    {playingSongId === duel.song_a.id ? (
                      <Pause className="h-8 w-8 mx-auto" />
                    ) : (
                      <Play className="h-8 w-8 mx-auto translate-x-[1px]" />
                    )}
                  </button>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate text-sm">{optionATitle}</p>
                  {optionASubtitle && (
                    <p className="text-xs text-muted-foreground truncate">
                      {optionASubtitle}
                    </p>
                  )}
                </div>
              </div>
              <span className="text-lg font-bold tabular-nums shrink-0">
                {percentA.toFixed(0)}%
              </span>
            </div>
            <Progress value={percentA} className="h-2" />
          </div>

          <div className="hidden md:flex items-center justify-center">
            <span className="text-xs font-semibold text-muted-foreground">VS</span>
          </div>

          {/* Song B */}
          <div className="space-y-2">
            <div className="flex justify-between items-start gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                {previewIdB && duel.song_b && (
                  <button
                    type="button"
                    onClick={() => togglePreview(duel.song_b, previewIdB)}
                    className={[
                      'shrink-0 h-16 w-16 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-fuchsia-500 text-white shadow-lg shadow-primary/30 border border-white/10 hover:shadow-xl hover:shadow-primary/40 hover:scale-[1.03] transition-all',
                      playingSongId === duel.song_b.id ? 'ring-2 ring-primary/40 shadow-primary/50' : '',
                    ].join(' ')}
                    aria-label={playingSongId === duel.song_b.id ? 'Pause preview' : 'Play preview'}
                  >
                    {playingSongId === duel.song_b.id ? (
                      <Pause className="h-8 w-8 mx-auto" />
                    ) : (
                      <Play className="h-8 w-8 mx-auto translate-x-[1px]" />
                    )}
                  </button>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate text-sm">{optionBTitle}</p>
                  {optionBSubtitle && (
                    <p className="text-xs text-muted-foreground truncate">
                      {optionBSubtitle}
                    </p>
                  )}
                </div>
              </div>
              <span className="text-lg font-bold tabular-nums shrink-0">
                {percentB.toFixed(0)}%
              </span>
            </div>
            <Progress value={percentB} className="h-2" />
          </div>
        </div>
      ) : (
        <div className={compact ? 'space-y-3' : 'space-y-4'}>
          {/* Song A */}
          <div className="space-y-2">
            <div className="flex justify-between items-start gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                {previewIdA && duel.song_a && (
                  <button
                    type="button"
                    onClick={() => togglePreview(duel.song_a, previewIdA)}
                    className={compact
                      ? 'shrink-0 h-12 w-12 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-fuchsia-500 text-white shadow-lg shadow-primary/30 border border-white/10 hover:shadow-xl hover:shadow-primary/40 transition-all'
                      : 'shrink-0 h-14 w-14 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-fuchsia-500 text-white shadow-lg shadow-primary/30 border border-white/10 hover:shadow-xl hover:shadow-primary/40 transition-all'}
                    aria-label={playingSongId === duel.song_a.id ? 'Pause preview' : 'Play preview'}
                  >
                    {playingSongId === duel.song_a.id ? (
                      <Pause className={compact ? 'h-6 w-6 mx-auto' : 'h-7 w-7 mx-auto'} />
                    ) : (
                      <Play className={compact ? 'h-6 w-6 mx-auto translate-x-[1px]' : 'h-7 w-7 mx-auto translate-x-[1px]'} />
                    )}
                  </button>
                )}
                <div className="min-w-0 flex-1">
                  <p className={compact ? 'font-medium truncate text-xs' : 'font-medium truncate text-sm'}>
                    {optionATitle}
                  </p>
                  {optionASubtitle && (
                    <p className={compact ? 'text-[10px] text-muted-foreground truncate' : 'text-xs text-muted-foreground truncate'}>
                      {optionASubtitle}
                    </p>
                  )}
                </div>
              </div>
              <span className={compact ? 'text-base font-bold tabular-nums shrink-0' : 'text-lg font-bold tabular-nums shrink-0'}>
                {percentA.toFixed(0)}%
              </span>
            </div>
            <Progress value={percentA} className={compact ? 'h-1.5' : 'h-2'} />
          </div>

          {/* VS Divider */}
          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-2 text-xs font-semibold text-muted-foreground">VS</span>
            </div>
          </div>

          {/* Song B */}
          <div className="space-y-2">
            <div className="flex justify-between items-start gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                {previewIdB && duel.song_b && (
                  <button
                    type="button"
                    onClick={() => togglePreview(duel.song_b, previewIdB)}
                    className={compact
                      ? 'shrink-0 h-12 w-12 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-fuchsia-500 text-white shadow-lg shadow-primary/30 border border-white/10 hover:shadow-xl hover:shadow-primary/40 transition-all'
                      : 'shrink-0 h-14 w-14 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-fuchsia-500 text-white shadow-lg shadow-primary/30 border border-white/10 hover:shadow-xl hover:shadow-primary/40 transition-all'}
                    aria-label={playingSongId === duel.song_b.id ? 'Pause preview' : 'Play preview'}
                  >
                    {playingSongId === duel.song_b.id ? (
                      <Pause className={compact ? 'h-6 w-6 mx-auto' : 'h-7 w-7 mx-auto'} />
                    ) : (
                      <Play className={compact ? 'h-6 w-6 mx-auto translate-x-[1px]' : 'h-7 w-7 mx-auto translate-x-[1px]'} />
                    )}
                  </button>
                )}
                <div className="min-w-0 flex-1">
                  <p className={compact ? 'font-medium truncate text-xs' : 'font-medium truncate text-sm'}>
                    {optionBTitle}
                  </p>
                  {optionBSubtitle && (
                    <p className={compact ? 'text-[10px] text-muted-foreground truncate' : 'text-xs text-muted-foreground truncate'}>
                      {optionBSubtitle}
                    </p>
                  )}
                </div>
              </div>
              <span className={compact ? 'text-base font-bold tabular-nums shrink-0' : 'text-lg font-bold tabular-nums shrink-0'}>
                {percentB.toFixed(0)}%
              </span>
            </div>
            <Progress value={percentB} className={compact ? 'h-1.5' : 'h-2'} />
          </div>
        </div>
      )}

      {/* Status */}
      {isClose && totalVotes > 0 && (
        <p className="text-center text-sm text-orange-500 font-medium">
          {t('headToHead')}
        </p>
      )}

      {/* Stats & CTA */}
      <div className={compact ? 'space-y-2 pt-1' : 'space-y-3 pt-2'}>
        <div className={compact ? 'text-center text-[10px] text-muted-foreground' : 'text-center text-xs text-muted-foreground'}>
          {t('totalVotes', { count: totalVotes })}
        </div>

        <Button className="w-full" size={compact ? 'sm' : 'lg'} asChild>
          <Link href={`/duel/${duel.id}`}>
            Jetzt abstimmen
          </Link>
        </Button>
      </div>
    </div>
  )
}
