'use client'

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useLocale } from 'next-intl'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Loader2,
  Pause,
  Play,
  Share2,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'
import { cn } from '@/lib/utils'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'

type ThemeRow = {
  date: string
  title: string
  title_en: string | null
  community_question: string | null
  community_question_en: string | null
  mood_tags: string[] | null
  activity_tags: string[] | null
}

type PostcardRow = {
  id: string
  user_id: string
  date: string
  slot: number
  song_id: string | null
  reaction: number | null
  mood_tags: string[] | null
  activity_tags: string[] | null
  energy_level: number | null
  situation: string | null
  style: unknown
  note: string
  visibility: string
  status: string
  reactions_count: number
  created_at: string
  profiles: { display_name: string; username: string | null; avatar_id: number } | null
  songs: { id: string; title: string; artist: string | null; preview_url: string | null; track_id: number | null; artwork_url: string | null } | null
}

type SongRow = {
  id: string
  title: string
  artist: string | null
  preview_url: string | null
  track_id: number | null
  artwork_url: string | null
}

type AvatarMap = Record<number, string>

type NowPlaying = {
  track_id?: number
  title?: string
  artist?: string
  preview_url?: string
}

type FunkbookStyle = {
  preset?: string
  gradient?: string
  accent?: string
  sticker?: string
  pattern?: string
  layout?: string
  show_song?: boolean
}

const DEFAULT_STYLE: Required<Pick<FunkbookStyle, 'preset' | 'gradient' | 'accent' | 'sticker' | 'pattern' | 'layout' | 'show_song'>> = {
  preset: 'pulse',
  gradient: 'pulse',
  accent: '#7c3aed',
  sticker: '🎧',
  pattern: 'none',
  layout: 'classic',
  show_song: true,
}

const stylePresets: Array<
  Required<Pick<FunkbookStyle, 'preset' | 'gradient' | 'accent' | 'sticker' | 'pattern' | 'layout'>> & { labelDe: string; labelEn: string }
> = [
  { preset: 'pulse', gradient: 'pulse', accent: '#7c3aed', sticker: '🎧', pattern: 'halo', layout: 'poster', labelDe: 'Pulse', labelEn: 'Pulse' },
  { preset: 'sunset', gradient: 'sunset', accent: '#fb7185', sticker: '🔥', pattern: 'diagonal', layout: 'classic', labelDe: 'Sunset', labelEn: 'Sunset' },
  { preset: 'ocean', gradient: 'ocean', accent: '#22c55e', sticker: '🌊', pattern: 'waves', layout: 'classic', labelDe: 'Ocean', labelEn: 'Ocean' },
  { preset: 'midnight', gradient: 'midnight', accent: '#38bdf8', sticker: '✨', pattern: 'grid', layout: 'ticket', labelDe: 'Midnight', labelEn: 'Midnight' },
  { preset: 'aurora', gradient: 'aurora', accent: '#22c55e', sticker: '🟢', pattern: 'halo', layout: 'poster', labelDe: 'Aurora', labelEn: 'Aurora' },
  { preset: 'neon', gradient: 'neon', accent: '#a855f7', sticker: '💿', pattern: 'diagonal', layout: 'ticket', labelDe: 'Neon', labelEn: 'Neon' },
  { preset: 'synth', gradient: 'synth', accent: '#06b6d4', sticker: '🔊', pattern: 'grid', layout: 'poster', labelDe: 'Synth', labelEn: 'Synth' },
  { preset: 'lava', gradient: 'lava', accent: '#f97316', sticker: '🌋', pattern: 'dots', layout: 'classic', labelDe: 'Lava', labelEn: 'Lava' },
  { preset: 'citrus', gradient: 'citrus', accent: '#f59e0b', sticker: '🍋', pattern: 'dots', layout: 'polaroid', labelDe: 'Citrus', labelEn: 'Citrus' },
  { preset: 'forest', gradient: 'forest', accent: '#16a34a', sticker: '🌲', pattern: 'grid', layout: 'classic', labelDe: 'Forest', labelEn: 'Forest' },
  { preset: 'mono', gradient: 'mono', accent: '#e2e8f0', sticker: '⬛', pattern: 'diagonal', layout: 'ticket', labelDe: 'Mono', labelEn: 'Mono' },
  { preset: 'ruby', gradient: 'ruby', accent: '#fb7185', sticker: '💎', pattern: 'halo', layout: 'polaroid', labelDe: 'Ruby', labelEn: 'Ruby' },
  { preset: 'cosmic', gradient: 'cosmic', accent: '#a855f7', sticker: '🚀', pattern: 'stars', layout: 'poster', labelDe: 'Cosmic', labelEn: 'Cosmic' },
  { preset: 'peach', gradient: 'peach', accent: '#fb7185', sticker: '🧡', pattern: 'dots', layout: 'polaroid', labelDe: 'Peach', labelEn: 'Peach' },
  { preset: 'ice', gradient: 'ice', accent: '#38bdf8', sticker: '🫧', pattern: 'grid', layout: 'classic', labelDe: 'Ice', labelEn: 'Ice' },
  { preset: 'sand', gradient: 'sand', accent: '#f59e0b', sticker: '🎯', pattern: 'diagonal', layout: 'ticket', labelDe: 'Sand', labelEn: 'Sand' },
  { preset: 'orchid', gradient: 'orchid', accent: '#ec4899', sticker: '💫', pattern: 'halo', layout: 'poster', labelDe: 'Orchid', labelEn: 'Orchid' },
  { preset: 'mint', gradient: 'mint', accent: '#22c55e', sticker: '🎶', pattern: 'dots', layout: 'classic', labelDe: 'Mint', labelEn: 'Mint' },
]

const accentPalette = [
  '#7c3aed', '#a855f7', '#ec4899', '#fb7185', '#f97316', '#f59e0b',
  '#22c55e', '#16a34a', '#06b6d4', '#38bdf8', '#e2e8f0', '#0f172a',
]

const stickerPalette = [
  '🎧', '✨', '🔥', '🌊', '💿', '🔊', '🎙️', '📻', '💫', '🧡', '🖤', '💎',
  '🌙', '☀️', '⚡', '🟣', '🟦', '🟩', '🟠', '🎵', '🎶', '🫧', '🚀', '🎯',
]

const patternPalette: Array<{ id: string; labelDe: string; labelEn: string }> = [
  { id: 'none', labelDe: 'Clean', labelEn: 'Clean' },
  { id: 'dots', labelDe: 'Dots', labelEn: 'Dots' },
  { id: 'grid', labelDe: 'Grid', labelEn: 'Grid' },
  { id: 'diagonal', labelDe: 'Diagonal', labelEn: 'Diagonal' },
  { id: 'halo', labelDe: 'Halo', labelEn: 'Halo' },
  { id: 'waves', labelDe: 'Waves', labelEn: 'Waves' },
  { id: 'stars', labelDe: 'Stars', labelEn: 'Stars' },
]

const layoutPalette: Array<{ id: string; labelDe: string; labelEn: string }> = [
  { id: 'classic', labelDe: 'Classic', labelEn: 'Classic' },
  { id: 'poster', labelDe: 'Poster', labelEn: 'Poster' },
  { id: 'ticket', labelDe: 'Ticket', labelEn: 'Ticket' },
  { id: 'polaroid', labelDe: 'Polaroid', labelEn: 'Polaroid' },
]

const moodOptions = [
  { value: 'happy', emoji: '😄', labelDe: 'Happy', labelEn: 'Happy' },
  { value: 'melancholic', emoji: '🌧️', labelDe: 'Melancholisch', labelEn: 'Melancholic' },
  { value: 'motivating', emoji: '🚀', labelDe: 'Motivierend', labelEn: 'Motivating' },
  { value: 'meditative', emoji: '🧘', labelDe: 'Meditativ', labelEn: 'Meditative' },
  { value: 'intense', emoji: '⚡', labelDe: 'Intens', labelEn: 'Intense' },
] as const

const activityOptions = [
  { value: 'work', emoji: '💻', labelDe: 'Arbeit', labelEn: 'Work' },
  { value: 'sport', emoji: '🏃', labelDe: 'Sport', labelEn: 'Sport' },
  { value: 'evening', emoji: '🌙', labelDe: 'Abend', labelEn: 'Evening' },
  { value: 'morning', emoji: '☀️', labelDe: 'Morgen', labelEn: 'Morning' },
  { value: 'party', emoji: '🎉', labelDe: 'Party', labelEn: 'Party' },
  { value: 'sleep', emoji: '😴', labelDe: 'Schlaf', labelEn: 'Sleep' },
] as const

const situationOptions = [
  { value: 'alone', emoji: '🫧', labelDe: 'Für mich', labelEn: 'For me' },
  { value: 'with_friends', emoji: '🫂', labelDe: 'Mit Leuten', labelEn: 'With friends' },
  { value: 'commute', emoji: '🚆', labelDe: 'Unterwegs', labelEn: 'On the go' },
  { value: 'focus', emoji: '🎯', labelDe: 'Fokus', labelEn: 'Focus' },
  { value: 'chill', emoji: '🛋️', labelDe: 'Chill', labelEn: 'Chill' },
] as const

function localizeTag(locale: string, value: string) {
  const mood = moodOptions.find((m) => m.value === value)
  if (mood) return locale === 'de' ? mood.labelDe : mood.labelEn
  const activity = activityOptions.find((a) => a.value === value)
  if (activity) return locale === 'de' ? activity.labelDe : activity.labelEn
  const situation = situationOptions.find((s) => s.value === value)
  if (situation) return locale === 'de' ? situation.labelDe : situation.labelEn
  return value
}

function formatDayLabel(locale: string, date: string) {
  const d = new Date(date)
  return d.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
  })
}

function getGradientClasses(style: FunkbookStyle | null | undefined) {
  const key = style?.gradient || style?.preset || 'pulse'
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
    case 'none':
    default:
      return ''
  }
}

function toStyle(value: unknown): FunkbookStyle {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_STYLE }
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

function buildPreviewUrl(previewUrl: string | null | undefined, trackId: number | null | undefined) {
  if (previewUrl && previewUrl.trim().length > 0) return previewUrl
  if (typeof trackId === 'number') return `/api/preview/${trackId}`
  return null
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2))
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (ctx.measureText(next).width <= maxWidth) {
      current = next
      continue
    }
    if (current) lines.push(current)
    current = word
  }
  if (current) lines.push(current)
  return lines
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const t = text.trim()
  if (!t) return ''
  if (ctx.measureText(t).width <= maxWidth) return t
  const ellipsis = '…'
  let out = t
  while (out.length > 1 && ctx.measureText(out + ellipsis).width > maxWidth) {
    out = out.slice(0, -1)
  }
  return out + ellipsis
}

async function loadCanvasImage(url: string) {
  const res = await fetch(url)
  if (!res.ok) return null
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = objectUrl
    if ('decode' in img) {
      try {
        await img.decode()
        return img
      } catch {
        // fall through
      }
    }
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Failed to load image'))
    })
    return img
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function drawCanvasPatternOverlay(
  ctx: CanvasRenderingContext2D,
  args: { pattern: string | null | undefined; width: number; height: number }
) {
  const pattern = args.pattern || 'none'
  const { width, height } = args
  if (pattern === 'none') return

  ctx.save()
  ctx.globalAlpha = 0.14
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = 'rgba(255,255,255,0.20)'
  ctx.lineWidth = 2

  if (pattern === 'dots') {
    const step = 34
    for (let y = 0; y <= height; y += step) {
      for (let x = 0; x <= width; x += step) {
        ctx.beginPath()
        ctx.arc(x + 8, y + 8, 1.6, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.restore()
    return
  }

  if (pattern === 'grid') {
    const step = 90
    for (let x = 0; x <= width; x += step) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    for (let y = 0; y <= height; y += step) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }
    ctx.restore()
    return
  }

  if (pattern === 'diagonal') {
    ctx.globalAlpha = 0.10
    ctx.save()
    ctx.translate(width / 2, height / 2)
    ctx.rotate(-Math.PI / 6)
    ctx.translate(-width / 2, -height / 2)
    const step = 52
    for (let x = -width; x <= width * 2; x += step) {
      ctx.beginPath()
      ctx.moveTo(x, -height)
      ctx.lineTo(x + height * 2, height * 2)
      ctx.stroke()
    }
    ctx.restore()
    ctx.restore()
    return
  }

  if (pattern === 'halo') {
    const r1 = ctx.createRadialGradient(width * 0.18, height * 0.18, 0, width * 0.18, height * 0.18, width * 0.85)
    r1.addColorStop(0, 'rgba(255,255,255,0.42)')
    r1.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = r1
    ctx.fillRect(0, 0, width, height)
    const r2 = ctx.createRadialGradient(width * 0.78, height * 0.58, 0, width * 0.78, height * 0.58, width * 0.75)
    r2.addColorStop(0, 'rgba(255,255,255,0.32)')
    r2.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = r2
    ctx.fillRect(0, 0, width, height)
    ctx.restore()
    return
  }

  if (pattern === 'waves') {
    ctx.globalAlpha = 0.12
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'
    ctx.lineWidth = 2
    const amp = 10
    const stepY = 64
    for (let y = 36; y <= height; y += stepY) {
      ctx.beginPath()
      for (let x = 0; x <= width; x += 18) {
        const t = x / width
        const yy = y + Math.sin(t * Math.PI * 2 * 2) * amp
        if (x === 0) ctx.moveTo(x, yy)
        else ctx.lineTo(x, yy)
      }
      ctx.stroke()
    }
    ctx.restore()
    return
  }

  if (pattern === 'stars') {
    ctx.globalAlpha = 0.26
    const count = 220
    for (let i = 0; i < count; i++) {
      const x = (i * 97) % width
      const y = (i * 193) % height
      const r = 0.9 + ((i * 7) % 3) * 0.8
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
    // a few bigger "glow" stars
    ctx.globalAlpha = 0.18
    const glows = [
      [width * 0.18, height * 0.28, 20],
      [width * 0.72, height * 0.22, 16],
      [width * 0.84, height * 0.62, 22],
      [width * 0.42, height * 0.78, 18],
    ] as const
    for (const [x, y, r] of glows) {
      const gr = ctx.createRadialGradient(x, y, 0, x, y, r)
      gr.addColorStop(0, 'rgba(255,255,255,0.35)')
      gr.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = gr
      ctx.fillRect(x - r, y - r, r * 2, r * 2)
    }
    ctx.restore()
    return
  }

  ctx.restore()
}

async function renderStoryPng(args: {
  locale: string
  date: string
  themeTitle?: string | null
  note: string
  songTitle?: string | null
  songArtist?: string | null
  energyLevel?: number | null
  moodTags?: string[] | null
  activityTags?: string[] | null
  situation?: string | null
  style: FunkbookStyle
  authorName?: string | null
  authorAvatarUrl?: string | null
}) {
  const width = 1080
  const height = 1920
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')

  const bg = args.style.gradient || args.style.preset || 'pulse'
  const gradients: Record<string, [string, string]> = {
    pulse: ['#2e1065', '#0b1220'],
    sunset: ['#9f1239', '#0b1220'],
    ocean: ['#064e3b', '#0b1220'],
    midnight: ['#1e1b4b', '#0b1220'],
    aurora: ['#064e3b', '#0b1220'],
    neon: ['#701a75', '#0b1220'],
    synth: ['#0e7490', '#0b1220'],
    lava: ['#7f1d1d', '#0b1220'],
    citrus: ['#365314', '#0b1220'],
    forest: ['#14532d', '#0b1220'],
    mono: ['#334155', '#0b1220'],
    ruby: ['#881337', '#0b1220'],
    cosmic: ['#1e1b4b', '#0b1220'],
    peach: ['#9a3412', '#0b1220'],
    ice: ['#0c4a6e', '#0b1220'],
    sand: ['#78350f', '#0b1220'],
    orchid: ['#701a75', '#0b1220'],
    mint: ['#064e3b', '#0b1220'],
  }
  const [a, b] = gradients[bg] || gradients.pulse
  const g = ctx.createLinearGradient(0, 0, width, height)
  g.addColorStop(0, a)
  g.addColorStop(1, b)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, width, height)

  drawCanvasPatternOverlay(ctx, { pattern: args.style.pattern, width, height })

  // Header: profile + title
  const headerY = 84
  const padX = 84
  const avatarSize = 76
  const avatarX = padX
  const avatarY = headerY + 18

  ctx.save()
  ctx.fillStyle = 'rgba(0,0,0,0.22)'
  drawRoundedRect(ctx, padX - 28, headerY - 20, width - (padX - 28) * 2, 146, 44)
  ctx.fill()
  ctx.restore()

  const headerInk = 'rgba(255,255,255,0.92)'
  const headerMuted = 'rgba(255,255,255,0.72)'

  // Avatar circle
  ctx.save()
  ctx.beginPath()
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()
  try {
    if (args.authorAvatarUrl) {
      const img = await loadCanvasImage(args.authorAvatarUrl)
      if (img) {
        ctx.drawImage(img, avatarX, avatarY, avatarSize, avatarSize)
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.18)'
        ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize)
      }
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.18)'
      ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize)
    }
  } catch {
    ctx.fillStyle = 'rgba(255,255,255,0.18)'
    ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize)
  }
  ctx.restore()

  const name = args.authorName?.trim() || (args.locale === 'de' ? 'Du' : 'You')
  ctx.fillStyle = headerInk
  ctx.font = '800 34px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto'
  ctx.fillText(truncateText(ctx, name, 420), avatarX + avatarSize + 18, headerY + 68)
  ctx.fillStyle = headerMuted
  ctx.font = '500 24px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto'
  ctx.fillText(formatDayLabel(args.locale, args.date), avatarX + avatarSize + 18, headerY + 100)

  ctx.fillStyle = headerInk
  ctx.font = '900 58px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto'
  ctx.textAlign = 'right'
  ctx.fillText('Funkbuch', width - padX, headerY + 78)
  ctx.textAlign = 'left'

  const cardX = 72
  const cardY = 260
  const cardW = width - 144
  const cardH = height - 540
  const layout = args.style.layout || 'classic'

  if (layout === 'polaroid') {
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.28)'
    ctx.shadowBlur = 46
    ctx.shadowOffsetY = 18
    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 56)
    ctx.fill()
    ctx.restore()

    ctx.fillStyle = 'rgba(15,23,42,0.16)'
    drawRoundedRect(ctx, cardX + 32, cardY + 92, cardW - 64, cardH - 260, 44)
    ctx.fill()
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 56)
    ctx.fill()
  }

  ctx.fillStyle = args.style.accent || '#7c3aed'
  drawRoundedRect(ctx, cardX, cardY, 12, cardH, 999)
  ctx.fill()

  const ink = layout === 'polaroid' ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.9)'
  const muted = layout === 'polaroid' ? 'rgba(15,23,42,0.62)' : 'rgba(255,255,255,0.75)'
  const sticker = args.style.sticker || DEFAULT_STYLE.sticker
  const isPoster = layout === 'poster'

  const contentX = 108
  const contentW = width - 216

  // Title + date (inside card)
  const titleY = cardY + 130
  const themeLine = (args.themeTitle || '').trim()
  const themeLabel = themeLine.length ? themeLine : (args.locale === 'de' ? 'Dein Hörmoment' : 'Your listening moment')

  ctx.fillStyle = ink
  ctx.font = `800 ${isPoster ? 52 : 48}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto`
  ctx.fillText(truncateText(ctx, themeLabel, contentW - 160), contentX, titleY)

  ctx.fillStyle = muted
  ctx.font = '500 28px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto'
  ctx.fillText(formatDayLabel(args.locale, args.date), contentX, titleY + 44)

  // Sticker badge (top-right, not "stuck in the corner")
  const badgeR = 56
  const badgeCx = width - 108 - badgeR
  const badgeCy = cardY + 120
  ctx.save()
  ctx.beginPath()
  ctx.arc(badgeCx, badgeCy, badgeR, 0, Math.PI * 2)
  ctx.closePath()
  ctx.fillStyle = layout === 'polaroid' ? 'rgba(15,23,42,0.06)' : 'rgba(0,0,0,0.18)'
  ctx.fill()
  ctx.strokeStyle = args.style.accent || DEFAULT_STYLE.accent
  ctx.lineWidth = 4
  ctx.stroke()
  ctx.restore()

  ctx.fillStyle = ink
  ctx.font = `${isPoster ? 72 : 62}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(sticker, badgeCx, badgeCy + 2)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'

  if (layout === 'ticket') {
    const lineY = cardY + cardH - 320
    ctx.save()
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'
    ctx.lineWidth = 2
    ctx.setLineDash([14, 10])
    ctx.beginPath()
    ctx.moveTo(108, lineY)
    ctx.lineTo(width - 108, lineY)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()
  }

  // Message box (make the note the star of the story)
  const messageY = cardY + 250
  const messagePadX = 34
  const noteFontSize = isPoster ? 56 : 54
  ctx.font = `700 ${noteFontSize}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto`
  const noteLines = wrapLines(ctx, args.note, contentW - messagePadX * 2).slice(0, 6)
  const lineH = 66
  const messageH = Math.max(260, noteLines.length * lineH + 82)

  ctx.fillStyle = layout === 'polaroid' ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.10)'
  drawRoundedRect(ctx, contentX, messageY, contentW, messageH, 44)
  ctx.fill()

  ctx.fillStyle = args.style.accent || DEFAULT_STYLE.accent
  ctx.globalAlpha = layout === 'polaroid' ? 0.18 : 0.22
  ctx.font = '900 140px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto'
  ctx.fillText('“', contentX + 8, messageY + 110)
  ctx.globalAlpha = 1

  let y = messageY + 84
  ctx.fillStyle = ink
  ctx.font = `700 ${noteFontSize}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto`
  for (const line of noteLines) {
    ctx.fillText(line, contentX + messagePadX, y)
    y += lineH
  }

  const chips: string[] = []
  if (typeof args.energyLevel === 'number') chips.push(`${args.locale === 'de' ? 'Energy' : 'Energy'} ${args.energyLevel}/10`)
  if (args.situation) chips.push(localizeTag(args.locale, args.situation))
  for (const m of args.moodTags || []) chips.push(localizeTag(args.locale, m))
  for (const aTag of args.activityTags || []) chips.push(localizeTag(args.locale, aTag))

  if (chips.length) {
    y += 14
    ctx.fillStyle = muted
    ctx.font = '600 28px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto'
    const chipLine = chips.slice(0, 6).join(' • ')
    const chipLines = wrapLines(ctx, chipLine, contentW).slice(0, 2)
    for (const line of chipLines) {
      ctx.fillText(line, contentX, y)
      y += 38
    }
  }

  // Track block (more valuable, more "radio")
  if (args.style.show_song !== false && (args.songTitle || args.songArtist)) {
    const songY = cardY + cardH - 230
    const songH = 170

    ctx.fillStyle = layout === 'polaroid' ? 'rgba(15,23,42,0.06)' : 'rgba(0,0,0,0.18)'
    drawRoundedRect(ctx, contentX, songY, contentW, songH, 44)
    ctx.fill()

    const accent = args.style.accent || DEFAULT_STYLE.accent
    ctx.fillStyle = accent
    drawRoundedRect(ctx, contentX + 22, songY + 28, 64, 64, 22)
    ctx.fill()

    ctx.fillStyle = '#ffffff'
    ctx.font = '800 44px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('♪', contentX + 22 + 32, songY + 28 + 34)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'

    const label = args.songArtist ? `${args.songArtist} – ${args.songTitle || ''}` : `${args.songTitle || ''}`
    ctx.fillStyle = muted
    ctx.font = '700 24px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto'
    ctx.fillText(args.locale === 'de' ? 'Track' : 'Track', contentX + 100, songY + 56)

    ctx.fillStyle = ink
    ctx.font = '800 36px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto'
    const songLines = wrapLines(ctx, label, contentW - 120).slice(0, 2)
    if (songLines[0]) ctx.fillText(songLines[0], contentX + 100, songY + 104)
    if (songLines[1]) ctx.fillText(songLines[1], contentX + 100, songY + 146)
  }

  // Station logo (bottom-left)
  try {
    const logo = await loadCanvasImage('/yfm-logo-neu.png')
    if (logo) {
      const logoW = 220
      const ratio = logo.height / logo.width
      const logoH = Math.max(36, Math.round(logoW * ratio))
      const logoX = 84
      const logoY = height - 92 - 26 - logoH
      ctx.save()
      ctx.globalAlpha = 0.95
      ctx.drawImage(logo, logoX, logoY, logoW, logoH)
      ctx.restore()
    }
  } catch {
    // ignore
  }

  ctx.fillStyle = 'rgba(255,255,255,0.74)'
  ctx.font = '800 30px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto'
  ctx.textAlign = 'center'
  ctx.fillText('Youth FM - Genau Dein Ding', width / 2, height - 92)
  ctx.textAlign = 'left'

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) {
        resolve(b)
        return
      }

      try {
        const dataUrl = canvas.toDataURL('image/png')
        const base64 = dataUrl.split(',')[1]
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
        resolve(new Blob([bytes], { type: 'image/png' }))
      } catch (e) {
        reject(e)
      }
    }, 'image/png')
  })

  return blob
}

export function FunkbookPanel() {
  const locale = useLocale()
  const { user, profile, isLoading: authLoading, refreshProfile } = useAuth()
  const queryClient = useQueryClient()
  const supabase = useMemo(() => createClient(), [])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const today = useMemo(() => new Date().toISOString().split('T')[0], [])
  const [selectedDate, setSelectedDate] = useState<string>(today)

  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null)
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/nowplaying')
        const data = (await res.json()) as NowPlaying
        if (!cancelled) setNowPlaying(data)
      } catch {
        // ignore
      }
    }
    load()
    const interval = setInterval(load, 30_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    return () => {
      try {
        audioRef.current?.pause()
      } catch {
        // ignore
      }
    }
  }, [])

  const settingsQuery = useQuery({
    queryKey: ['public_settings'],
    queryFn: async () => {
      const res = await fetch('/api/settings')
      if (!res.ok) throw new Error('Failed to load settings')
      return (await res.json()) as { funkbook_max_cards_per_day?: number }
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  })

  const maxCardsPerDay = typeof settingsQuery.data?.funkbook_max_cards_per_day === 'number'
    ? settingsQuery.data.funkbook_max_cards_per_day
    : 2

  const avatarsQuery = useQuery({
    queryKey: ['avatars'],
    queryFn: async () => {
      const { data, error } = await supabase.from('avatars').select('id, file_path')
      if (error) throw error
      return (data || []) as Array<{ id: number; file_path: string }>
    },
    staleTime: 60 * 60 * 1000,
    retry: 3,
    refetchOnWindowFocus: false,
  })

  const avatarMap: AvatarMap = useMemo(() => {
    const map: AvatarMap = {}
    for (const a of avatarsQuery.data || []) map[a.id] = a.file_path
    return map
  }, [avatarsQuery.data])

  const getAvatarUrl = (avatarId: number | null | undefined) => {
    if (!avatarId || !avatarMap[avatarId]) return '/avatars/default.svg'
    const { data } = supabase.storage.from('avatars').getPublicUrl(avatarMap[avatarId])
    return data.publicUrl
  }

  const themeQuery = useQuery({
    queryKey: ['funkbook_theme', selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_themes')
        .select('date, title, title_en, community_question, community_question_en, mood_tags, activity_tags')
        .eq('date', selectedDate)
        .maybeSingle()
      if (error) throw error
      return (data || null) as ThemeRow | null
    },
    retry: 2,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const postcardsQuery = useQuery({
    queryKey: ['vibe_postcards', selectedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vibe_postcards')
        .select('id, user_id, date, slot, song_id, reaction, mood_tags, activity_tags, energy_level, situation, style, note, visibility, status, reactions_count, created_at, profiles:profiles!vibe_postcards_user_id_fkey(display_name, username, avatar_id), songs:songs!vibe_postcards_song_id_fkey(id, title, artist, preview_url, track_id, artwork_url)')
        .eq('date', selectedDate)
        .neq('status', 'deleted')
        .order('created_at', { ascending: false })
        .limit(60)
      if (error) throw error
      return (data || []) as unknown as PostcardRow[]
    },
    retry: 2,
    enabled: !authLoading,
    refetchOnWindowFocus: true,
    staleTime: 15 * 1000,
  })

  const myCards = useMemo(() => {
    if (!user) return []
    return (postcardsQuery.data || [])
      .filter((p) => p.user_id === user.id)
      .sort((a, b) => (a.slot ?? 1) - (b.slot ?? 1))
  }, [postcardsQuery.data, user])

  const [editingPostcardId, setEditingPostcardId] = useState<string | null>(null)
  const [selectedSong, setSelectedSong] = useState<SongRow | null>(null)
  const [note, setNote] = useState<string>('')
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [selectedMoodTags, setSelectedMoodTags] = useState<string[]>([])
  const [selectedActivityTags, setSelectedActivityTags] = useState<string[]>([])
  const [energyLevel, setEnergyLevel] = useState<number>(5)
  const [situation, setSituation] = useState<string>('')
  const [style, setStyle] = useState<FunkbookStyle>(() => toStyle(null))
  const [optionsExpanded, setOptionsExpanded] = useState(false)

  const [songPickerOpen, setSongPickerOpen] = useState(false)
  const [songSearch, setSongSearch] = useState('')
  const [playingSrc, setPlayingSrc] = useState<string | null>(null)

  const [storyOpen, setStoryOpen] = useState(false)
  const [storyUrl, setStoryUrl] = useState<string | null>(null)
  const [storyBlob, setStoryBlob] = useState<Blob | null>(null)
  const [storyBusy, setStoryBusy] = useState(false)
  const [storyError, setStoryError] = useState<string | null>(null)

  const themeTitle = themeQuery.data
    ? (locale === 'en' && themeQuery.data.title_en ? themeQuery.data.title_en : themeQuery.data.title)
    : null

  const loadFromCard = (card: PostcardRow | null) => {
    if (!card) {
      setEditingPostcardId(null)
      setSelectedSong(null)
      setNote('')
      setVisibility('public')
      setSelectedMoodTags([])
      setSelectedActivityTags([])
      setEnergyLevel(5)
      setSituation('')
      setStyle(toStyle(null))
      setOptionsExpanded(true)
      return
    }

    setEditingPostcardId(card.id)
    setSelectedSong(card.songs ? {
      id: card.songs.id,
      title: card.songs.title,
      artist: card.songs.artist,
      preview_url: card.songs.preview_url,
      track_id: card.songs.track_id,
      artwork_url: card.songs.artwork_url,
    } : null)
    setNote(card.note || '')
    setVisibility((card.visibility === 'private' ? 'private' : 'public') as 'public' | 'private')
    setSelectedMoodTags(card.mood_tags || [])
    setSelectedActivityTags(card.activity_tags || [])
    setEnergyLevel(typeof card.energy_level === 'number' ? card.energy_level : 5)
    setSituation(card.situation || '')
    setStyle(toStyle(card.style))
    setOptionsExpanded(false)
  }

  useEffect(() => {
    if (!user) {
      loadFromCard(null)
      return
    }
    if (editingPostcardId && myCards.some((c) => c.id === editingPostcardId)) {
      return
    }
    loadFromCard(myCards[0] || null)
  }, [selectedDate, user?.id, myCards.length])

  const promptTemplates = useMemo(() => {
    const q = themeQuery.data
      ? (locale === 'en' && themeQuery.data.community_question_en ? themeQuery.data.community_question_en : themeQuery.data.community_question)
      : null
    const base = [
      locale === 'de' ? 'Mein Hörmoment heute: ' : 'My listening moment today: ',
      locale === 'de' ? 'Hot take: ' : 'Hot take: ',
      locale === 'de' ? 'Ich wünsche mir im Programm: ' : 'I wish the station would: ',
    ]
    if (q) {
      base.unshift(locale === 'de' ? `Zur Tagesfrage („${q}“): ` : `On today’s question (“${q}”): `)
    }
    return base
  }, [themeQuery.data, locale])

  const toggleTag = (list: string[], tag: string, limit: number) => {
    if (list.includes(tag)) return list.filter((t) => t !== tag)
    if (list.length >= limit) return [...list.slice(0, limit - 1), tag]
    return [...list, tag]
  }

  const songSearchQuery = useQuery({
    queryKey: ['songs_search', songSearch],
    enabled: songPickerOpen,
    queryFn: async () => {
      const q = songSearch.trim()
      const query = supabase
        .from('songs')
        .select('id, title, artist, preview_url, track_id, artwork_url')
        .eq('is_active', true)
        .order('play_count', { ascending: false })
        .limit(25)

      if (q.length >= 2) {
        query.or(`title.ilike.%${q}%,artist.ilike.%${q}%`)
      }

      const { data, error } = await query
      if (error) throw error
      return (data || []) as SongRow[]
    },
    staleTime: 30 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  })

  const playPreview = async (src: string | null) => {
    try {
      if (!src) return
      if (!audioRef.current) audioRef.current = new Audio()
      const audio = audioRef.current
      if (playingSrc === src && !audio.paused) {
        audio.pause()
        return
      }
      setPlayingSrc(src)
      audio.src = src
      await audio.play()
      audio.onended = () => setPlayingSrc(null)
    } catch {
      setPlayingSrc(null)
    }
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const targetId = editingPostcardId
      const trimmed = note.trim()
      const { data, error } = await supabase.rpc('create_vibe_postcard', {
        p_postcard_id: targetId,
        p_date: selectedDate,
        p_note: trimmed,
        p_mood_tags: selectedMoodTags.length ? selectedMoodTags : null,
        p_activity_tags: selectedActivityTags.length ? selectedActivityTags : null,
        p_energy_level: energyLevel,
        p_situation: situation.trim().length ? situation.trim().slice(0, 60) : null,
        p_visibility: visibility,
        p_song_id: selectedSong?.id || null,
        p_track_id: selectedSong?.track_id ?? nowPlaying?.track_id ?? null,
        p_style: toStyle(style),
      })
      if (error) throw error
      return { row: data as unknown as PostcardRow, targetId }
    },
    onSuccess: async ({ row, targetId }) => {
      if (!targetId) {
        setEditingPostcardId(row.id)
      }
      await refreshProfile()
      queryClient.invalidateQueries({ queryKey: ['vibe_postcards', selectedDate] })
      toast.success(locale === 'de' ? 'Karte gespeichert' : 'Card saved')
    },
    onError: (err) => {
      console.error(err)
      const message = (err as { message?: string })?.message || ''
      if (message.includes('Daily postcard limit reached')) {
        toast.error(locale === 'de' ? `Tageslimit erreicht (${maxCardsPerDay})` : `Daily limit reached (${maxCardsPerDay})`)
        return
      }
      toast.error(locale === 'de' ? 'Karte konnte nicht gespeichert werden.' : 'Could not save card.')
    },
  })

  const visibilityMutation = useMutation({
    mutationFn: async (args: { postcardId: string; visibility: 'public' | 'private' }) => {
      const { error } = await supabase
        .from('vibe_postcards')
        .update({ visibility: args.visibility } as never)
        .eq('id', args.postcardId)
      if (error) throw error
      return args
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vibe_postcards', selectedDate] }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (postcardId: string) => {
      const { error } = await supabase
        .from('vibe_postcards')
        .update({ status: 'deleted' } as never)
        .eq('id', postcardId)
      if (error) throw error
      return postcardId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vibe_postcards', selectedDate] })
      toast.success(locale === 'de' ? 'Karte gelöscht' : 'Card deleted')
    },
  })

  const myReactionSetQuery = useQuery({
    queryKey: ['postcard_reactions_me', selectedDate, user?.id, (postcardsQuery.data || []).map((p) => p.id).join(',')],
    enabled: !!user && (postcardsQuery.data || []).length > 0,
    queryFn: async () => {
      const ids = (postcardsQuery.data || []).map((p) => p.id)
      const { data, error } = await supabase
        .from('postcard_reactions')
        .select('postcard_id')
        .eq('user_id', user!.id)
        .in('postcard_id', ids)
      if (error) throw error
      const set = new Set<string>()
      for (const r of data || []) set.add((r as { postcard_id: string }).postcard_id)
      return set
    },
    staleTime: 10 * 1000,
    refetchOnWindowFocus: true,
  })

  const toggleReactionMutation = useMutation({
    mutationFn: async (postcardId: string) => {
      const { data, error } = await supabase.rpc('toggle_postcard_reaction', { p_postcard_id: postcardId })
      if (error) throw error
      return { postcardId, count: data as number }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vibe_postcards', selectedDate] })
      queryClient.invalidateQueries({ queryKey: ['postcard_reactions_me', selectedDate] })
    },
  })

  useEffect(() => {
    const channel = supabase
      .channel(`vibe_postcards_${selectedDate}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vibe_postcards' },
        (payload) => {
          const row = (payload.new || payload.old) as { date?: string } | null
          if (row?.date === selectedDate) queryClient.invalidateQueries({ queryKey: ['vibe_postcards', selectedDate] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, selectedDate, queryClient])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    createMutation.mutate()
  }

  const title = themeQuery.data
    ? (locale === 'en' && themeQuery.data.title_en ? themeQuery.data.title_en : themeQuery.data.title)
    : (locale === 'de' ? 'Funkbuch' : 'Funkbook')

  const question = themeQuery.data
    ? (locale === 'en' && themeQuery.data.community_question_en ? themeQuery.data.community_question_en : themeQuery.data.community_question)
    : null

  const moodChoices = themeQuery.data?.mood_tags || []
  const activityChoices = themeQuery.data?.activity_tags || []

  const canCreate = !!user && selectedDate === today
  const canCreateAnother = canCreate && myCards.length < maxCardsPerDay
  const canEditContent = canCreate

  const onNewCard = () => {
    setEditingPostcardId(null)
    setSelectedSong(null)
    setNote('')
    setSelectedMoodTags([])
    setSelectedActivityTags([])
    setEnergyLevel(5)
    setSituation('')
    setStyle(toStyle(null))
    setVisibility('public')
    setOptionsExpanded(true)
  }

  const onGenerateStory = async () => {
    try {
      setStoryOpen(true)
      setStoryBusy(true)
      setStoryError(null)
      if (storyUrl) URL.revokeObjectURL(storyUrl)
      setStoryUrl(null)
      setStoryBlob(null)
      const blob = await renderStoryPng({
        locale,
        date: selectedDate,
        themeTitle,
        note: note.trim().length ? note.trim().slice(0, 120) : (locale === 'de' ? 'Mein Hörmoment heute.' : 'My listening moment today.'),
        songTitle: selectedSong?.title || null,
        songArtist: selectedSong?.artist || null,
        energyLevel,
        moodTags: selectedMoodTags,
        activityTags: selectedActivityTags,
        situation: situation.trim().length ? situation.trim().slice(0, 60) : null,
        style: toStyle(style),
        authorName: profile?.display_name || profile?.username || null,
        authorAvatarUrl: profile ? getAvatarUrl(profile.avatar_id) : null,
      })
      setStoryBlob(blob)
      setStoryUrl(URL.createObjectURL(blob))
    } catch (e) {
      console.error(e)
      setStoryError(locale === 'de' ? 'Story konnte nicht erstellt werden.' : 'Could not generate story.')
      toast.error(locale === 'de' ? 'Story konnte nicht erstellt werden.' : 'Could not generate story.')
    } finally {
      setStoryBusy(false)
    }
  }

  const moodDisplay = moodChoices.length
    ? moodChoices.map((t) => ({ value: t, emoji: '✨', labelDe: t, labelEn: t }))
    : [...moodOptions]

  const activityDisplay = activityChoices.length
    ? activityChoices.map((t) => ({ value: t, emoji: '🎧', labelDe: t, labelEn: t }))
    : [...activityOptions]

  return (
    <div className="glass-card rounded-3xl p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {locale === 'de' ? 'Funkbuch' : 'Funkbook'}
          </p>
          <h2 className="text-2xl font-semibold truncate">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {formatDayLabel(locale, selectedDate)}
          </p>
          {question && (
            <p className="text-sm text-muted-foreground mt-2">
              <span className="font-medium text-foreground">{locale === 'de' ? 'Frage:' : 'Question:'}</span>{' '}
              {question}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full"
            onClick={() => setSelectedDate((d) => {
              const prev = new Date(d)
              prev.setDate(prev.getDate() - 1)
              return prev.toISOString().split('T')[0]
            })}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full"
            onClick={() => setSelectedDate((d) => {
              const next = new Date(d)
              next.setDate(next.getDate() + 1)
              const nextIso = next.toISOString().split('T')[0]
              return nextIso > today ? today : nextIso
            })}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 p-4 bg-muted/10">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-full">
            {locale === 'de' ? 'Ritual' : 'Ritual'}: {locale === 'de' ? `${maxCardsPerDay} Karten/Tag` : `${maxCardsPerDay} cards/day`}
          </Badge>
          {nowPlaying?.title && (
            <Badge variant="secondary" className="rounded-full">
              {locale === 'de' ? 'Gerade läuft' : 'Now playing'}: {nowPlaying.artist ? `${nowPlaying.artist} — ` : ''}{nowPlaying.title}
            </Badge>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className={`rounded-3xl border border-border/50 p-5 ${canCreate ? 'bg-background/40' : 'bg-muted/10 opacity-80'}`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
          <div>
            <p className="font-semibold">
              {locale === 'de' ? 'Deine Funkbuch-Karten' : 'Your Funkbook cards'}
            </p>
            <p className="text-xs text-muted-foreground">
              {canCreate
                ? (locale === 'de' ? 'Kurz. Echt. Radio-gebunden. Als Story exportierbar.' : 'Short. Real. Radio-bound. Exportable as a story.')
                : (locale === 'de' ? 'Erstellen nur für heute möglich.' : 'You can only create for today.')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={visibility === 'public' ? 'default' : 'secondary'}
              className="rounded-full"
              size="sm"
              onClick={() => setVisibility('public')}
              disabled={!canEditContent}
            >
              {locale === 'de' ? 'Öffentlich' : 'Public'}
            </Button>
            <Button
              type="button"
              variant={visibility === 'private' ? 'default' : 'secondary'}
              className="rounded-full"
              size="sm"
              onClick={() => setVisibility('private')}
              disabled={!canEditContent}
            >
              {locale === 'de' ? 'Privat' : 'Private'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="rounded-full"
              size="sm"
              onClick={onNewCard}
              disabled={!canCreateAnother}
              title={locale === 'de' ? 'Neue Karte erstellen' : 'Create a new card'}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              {locale === 'de' ? 'Neue Karte' : 'New card'}
            </Button>
          </div>
        </div>

        {myCards.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {myCards.map((card) => (
              <Button
                key={card.id}
                type="button"
                size="sm"
                variant={editingPostcardId === card.id ? 'default' : 'secondary'}
                className="rounded-full"
                onClick={() => loadFromCard(card)}
              >
                {locale === 'de' ? 'Karte' : 'Card'} {card.slot || 1}
              </Button>
            ))}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          {optionsExpanded && (
            <>
          <div className="rounded-2xl border border-border/50 bg-muted/10 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {locale === 'de' ? 'Song-Bindung' : 'Song binding'}
                </p>
                {selectedSong ? (
                  <div className="mt-1">
                    <p className="text-sm font-medium truncate">
                      {selectedSong.artist ? `${selectedSong.artist} — ` : ''}{selectedSong.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {selectedSong.track_id ? `Track #${selectedSong.track_id}` : ''}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">
                    {locale === 'de' ? 'Optional: Song aus der Datenbank auswählen.' : 'Optional: pick a song from the database.'}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="rounded-full"
                  onClick={() => setSongPickerOpen(true)}
                  disabled={!canEditContent}
                >
                  {locale === 'de' ? 'Song wählen' : 'Choose song'}
                </Button>
                {nowPlaying?.track_id && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="rounded-full"
                    onClick={() => {
                      setSelectedSong({
                        id: '',
                        title: nowPlaying.title || '',
                        artist: nowPlaying.artist || null,
                        preview_url: nowPlaying.preview_url || (nowPlaying.track_id ? `/api/preview/${nowPlaying.track_id}` : null),
                        track_id: nowPlaying.track_id || null,
                        artwork_url: null,
                      })
                    }}
                    disabled={!canEditContent}
                  >
                    {locale === 'de' ? 'Aktuellen Track' : 'Current track'}
                  </Button>
                )}
                {!!selectedSong && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="rounded-full"
                    onClick={() => setSelectedSong(null)}
                    disabled={!canEditContent}
                  >
                    {locale === 'de' ? 'Entfernen' : 'Remove'}
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {!!selectedSong && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="rounded-full"
                  onClick={() => playPreview(buildPreviewUrl(selectedSong.preview_url, selectedSong.track_id))}
                  disabled={!buildPreviewUrl(selectedSong.preview_url, selectedSong.track_id)}
                >
                  {playingSrc === buildPreviewUrl(selectedSong.preview_url, selectedSong.track_id) ? (
                    <Pause className="h-4 w-4 mr-2" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  {locale === 'de' ? 'Hörprobe' : 'Preview'}
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="rounded-full"
                onClick={onGenerateStory}
                disabled={storyBusy}
                title={locale === 'de' ? 'Instagram-Story Bild erstellen' : 'Generate Instagram story image'}
              >
                {storyBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Share2 className="h-4 w-4 mr-2" />}
                {locale === 'de' ? 'Story' : 'Story'}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-muted/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {locale === 'de' ? 'Energy' : 'Energy'}
              </p>
              <p className="text-xs text-muted-foreground">
                {energyLevel}/10
              </p>
            </div>
            <Slider
              value={[energyLevel]}
              onValueChange={([v]) => setEnergyLevel(v)}
              min={1}
              max={10}
              step={1}
              disabled={!canEditContent}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-border/50 bg-muted/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                {locale === 'de' ? 'Mood (max. 2)' : 'Mood (max 2)'}
              </p>
              <div className="flex flex-wrap gap-2">
                {moodDisplay.map((tag) => (
                  <Button
                    key={tag.value}
                    type="button"
                    size="sm"
                    variant={selectedMoodTags.includes(tag.value) ? 'default' : 'secondary'}
                    className="rounded-full"
                    onClick={() => setSelectedMoodTags((prev) => toggleTag(prev, tag.value, 2))}
                    disabled={!canEditContent}
                  >
                    {tag.emoji} {locale === 'de' ? tag.labelDe : tag.labelEn}
                  </Button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border/50 bg-muted/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                {locale === 'de' ? 'Aktivität (max. 2)' : 'Activity (max 2)'}
              </p>
              <div className="flex flex-wrap gap-2">
                {activityDisplay.map((tag) => (
                  <Button
                    key={tag.value}
                    type="button"
                    size="sm"
                    variant={selectedActivityTags.includes(tag.value) ? 'default' : 'secondary'}
                    className="rounded-full"
                    onClick={() => setSelectedActivityTags((prev) => toggleTag(prev, tag.value, 2))}
                    disabled={!canEditContent}
                  >
                    {tag.emoji} {locale === 'de' ? tag.labelDe : tag.labelEn}
                  </Button>
                ))}
              </div>

              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  {locale === 'de' ? 'Kontext' : 'Context'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {situationOptions.map((s) => (
                    <Button
                      key={s.value}
                      type="button"
                      size="sm"
                      variant={situation === (locale === 'de' ? s.labelDe : s.labelEn) ? 'default' : 'secondary'}
                      className="rounded-full"
                      onClick={() => setSituation(locale === 'de' ? s.labelDe : s.labelEn)}
                      disabled={!canEditContent}
                    >
                      {s.emoji} {locale === 'de' ? s.labelDe : s.labelEn}
                    </Button>
                  ))}
                </div>
                <div className="mt-2">
                  <Input
                    value={situation}
                    onChange={(e) => setSituation(e.target.value.slice(0, 60))}
                    placeholder={locale === 'de' ? 'Oder kurz selbst schreiben…' : 'Or type a short context…'}
                    disabled={!canEditContent}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {promptTemplates.slice(0, 3).map((tpl) => (
              <button
                key={tpl}
                type="button"
                onClick={() => setNote((prev) => (prev.trim().length === 0 ? tpl : prev))}
                disabled={!canEditContent}
                className="rounded-2xl border border-border/50 p-3 text-left hover:bg-muted/20 transition-colors"
              >
                <p className="text-xs text-muted-foreground">
                  {locale === 'de' ? 'Vorlage' : 'Template'}
                </p>
                <p className="text-sm font-medium truncate">{tpl}</p>
              </button>
            ))}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">
                {locale === 'de' ? 'Notiz (max. 120 Zeichen)' : 'Note (max 120 chars)'}
              </p>
              <p className="text-xs text-muted-foreground">
                {note.length}/120
              </p>
            </div>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 120))}
              placeholder={locale === 'de'
                ? '1 Satz reicht — was war dein Hörmoment heute?'
                : 'One sentence is enough — what was your listening moment today?'}
              disabled={!canEditContent || createMutation.isPending}
              className="rounded-2xl"
            />
          </div>
            </>
          )}

          <div className="rounded-2xl border border-border/50 bg-muted/10 p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <button
                type="button"
                className="flex items-start gap-2 min-w-0 text-left"
                onClick={() => setOptionsExpanded((v) => !v)}
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {locale === 'de' ? 'Funkbuch-Optionen' : 'Funkbook options'}
                  </p>
                  <p className="text-sm font-medium truncate">
                    {locale === 'de' ? 'Design & Export' : 'Design & export'}
                  </p>
                </div>
                <ChevronDown className={cn('h-4 w-4 mt-0.5 text-muted-foreground transition-transform', optionsExpanded && 'rotate-180')} />
              </button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="rounded-full"
                onClick={() => {
                  const next = stylePresets[Math.floor(Math.random() * stylePresets.length)]
                  setStyle({ ...DEFAULT_STYLE, ...next })
                  setOptionsExpanded(true)
                }}
                disabled={!canEditContent}
                title={locale === 'de' ? 'Zufälliger Style' : 'Random style'}
              >
                <Wand2 className="h-4 w-4 mr-2" />
                {locale === 'de' ? 'Shuffle' : 'Shuffle'}
              </Button>
            </div>

            {!optionsExpanded && (
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Badge variant="secondary" className="rounded-full">
                  {style.sticker || DEFAULT_STYLE.sticker} {style.preset || DEFAULT_STYLE.preset}
                </Badge>
                <Badge variant="secondary" className="rounded-full">
                  {locale === 'de' ? 'Pattern' : 'Pattern'}: {style.pattern || DEFAULT_STYLE.pattern}
                </Badge>
                <Badge variant="secondary" className="rounded-full">
                  {locale === 'de' ? 'Layout' : 'Layout'}: {style.layout || DEFAULT_STYLE.layout}
                </Badge>
              </div>
            )}

            {optionsExpanded && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
              {stylePresets.map((p) => (
                <Button
                  key={p.preset}
                  type="button"
                  size="sm"
                  variant={(style.preset || style.gradient) === p.preset ? 'default' : 'secondary'}
                  className="rounded-full"
                  onClick={() => setStyle({ ...DEFAULT_STYLE, ...p })}
                  disabled={!canEditContent}
                >
                  {p.sticker} {locale === 'de' ? p.labelDe : p.labelEn}
                </Button>
              ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border/50 bg-background/20 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  {locale === 'de' ? 'Accent' : 'Accent'}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {accentPalette.map((c) => {
                    const selected = (style.accent || DEFAULT_STYLE.accent).toLowerCase() === c.toLowerCase()
                    return (
                      <button
                        key={c}
                        type="button"
                        className={cn(
                          'h-9 w-9 rounded-xl border border-border/50 shadow-sm',
                          'hover:scale-[1.02] active:scale-[0.98] transition-transform',
                          selected && 'ring-2 ring-primary/40'
                        )}
                        style={{ backgroundColor: c }}
                        onClick={() => setStyle((prev) => ({ ...prev, accent: c }))}
                        disabled={!canEditContent}
                        aria-label={`Accent ${c}`}
                      />
                    )
                  })}
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={style.accent || DEFAULT_STYLE.accent}
                      onChange={(e) => setStyle((prev) => ({ ...prev, accent: e.target.value }))}
                      disabled={!canEditContent}
                      className="h-9 w-9 rounded-xl border border-border/50 bg-transparent p-0"
                      aria-label={locale === 'de' ? 'Eigene Farbe wählen' : 'Pick custom color'}
                    />
                    <Input
                      value={style.accent || DEFAULT_STYLE.accent}
                      onChange={(e) => setStyle((prev) => ({ ...prev, accent: e.target.value.slice(0, 12) }))}
                      disabled={!canEditContent}
                      className="h-9 w-[120px] rounded-xl"
                      placeholder="#7c3aed"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border/50 bg-background/20 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  {locale === 'de' ? 'Sticker' : 'Sticker'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {stickerPalette.map((s) => {
                    const selected = (style.sticker || DEFAULT_STYLE.sticker) === s
                    return (
                      <button
                        key={s}
                        type="button"
                        className={cn(
                          'h-10 w-10 rounded-2xl border border-border/50 bg-background/40',
                          'inline-flex items-center justify-center text-lg',
                          'hover:bg-background/60 transition-colors',
                          selected && 'ring-2 ring-primary/40'
                        )}
                        onClick={() => setStyle((prev) => ({ ...prev, sticker: s }))}
                        disabled={!canEditContent}
                        aria-label={`Sticker ${s}`}
                      >
                        {s}
                      </button>
                    )
                  })}
                  <Input
                    value={style.sticker || DEFAULT_STYLE.sticker}
                    onChange={(e) => setStyle((prev) => ({ ...prev, sticker: e.target.value.slice(0, 6) }))}
                    disabled={!canEditContent}
                    className="h-10 w-[140px] rounded-xl"
                    placeholder={locale === 'de' ? 'Custom…' : 'Custom…'}
                  />
                </div>
              </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border/50 bg-background/20 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  {locale === 'de' ? 'Pattern' : 'Pattern'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {patternPalette.map((p) => (
                    <Button
                      key={p.id}
                      type="button"
                      size="sm"
                      variant={(style.pattern || DEFAULT_STYLE.pattern) === p.id ? 'default' : 'secondary'}
                      className="rounded-full"
                      onClick={() => setStyle((prev) => ({ ...prev, pattern: p.id }))}
                      disabled={!canEditContent}
                    >
                      {locale === 'de' ? p.labelDe : p.labelEn}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border/50 bg-background/20 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  {locale === 'de' ? 'Layout' : 'Layout'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {layoutPalette.map((l) => (
                    <Button
                      key={l.id}
                      type="button"
                      size="sm"
                      variant={(style.layout || DEFAULT_STYLE.layout) === l.id ? 'default' : 'secondary'}
                      className="rounded-full"
                      onClick={() => setStyle((prev) => ({ ...prev, layout: l.id }))}
                      disabled={!canEditContent}
                    >
                      {locale === 'de' ? l.labelDe : l.labelEn}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    size="sm"
                    variant={(style.show_song ?? DEFAULT_STYLE.show_song) ? 'default' : 'secondary'}
                    className="rounded-full"
                    onClick={() => setStyle((prev) => ({ ...prev, show_song: !(prev.show_song ?? DEFAULT_STYLE.show_song) }))}
                    disabled={!canEditContent}
                    title={locale === 'de' ? 'Song im Export anzeigen' : 'Show song in export'}
                  >
                    {locale === 'de' ? 'Song anzeigen' : 'Show song'}
                  </Button>
                </div>
              </div>
                </div>
              </div>
            )}

            <div className={cn('relative rounded-3xl border border-border/50 overflow-hidden bg-gradient-to-br', getGradientClasses(style))}>
              <div
                className="absolute inset-y-0 left-0 w-2"
                style={{ backgroundColor: style.accent || DEFAULT_STYLE.accent }}
              />
              {style.pattern && style.pattern !== 'none' && (
                <div className={cn('absolute inset-0', getPatternOverlayClasses(style.pattern))} />
              )}
              <div className="relative p-4">
                {(style.layout || DEFAULT_STYLE.layout) === 'ticket' ? (
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                          {locale === 'de' ? 'Ticket' : 'Ticket'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{formatDayLabel(locale, selectedDate)}</p>
                        <p className="text-base font-semibold truncate mt-1">
                          {themeTitle || (locale === 'de' ? 'Funkbuch' : 'Funkbook')}
                        </p>
                      </div>
                      <span className="text-2xl">{style.sticker || DEFAULT_STYLE.sticker}</span>
                    </div>

                    <div className="my-3 border-t border-dashed border-border/60" />

                    <p className="text-sm whitespace-pre-wrap">
                      {note.trim().length ? note.trim() : (locale === 'de' ? 'Dein Hörmoment…' : 'Your listening moment…')}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="secondary" className="rounded-full">
                        {locale === 'de' ? 'Energy' : 'Energy'} {energyLevel}/10
                      </Badge>
                      {situation.trim().length > 0 && (
                        <Badge variant="secondary" className="rounded-full">
                          {situation.trim()}
                        </Badge>
                      )}
                      {(selectedMoodTags || []).map((t) => (
                        <Badge key={`m-preview-${t}`} variant="secondary" className="rounded-full">
                          {t}
                        </Badge>
                      ))}
                      {(selectedActivityTags || []).map((t) => (
                        <Badge key={`a-preview-${t}`} variant="secondary" className="rounded-full">
                          {t}
                        </Badge>
                      ))}
                      {visibility === 'private' && (
                        <Badge variant="secondary" className="rounded-full">
                          {locale === 'de' ? 'Privat' : 'Private'}
                        </Badge>
                      )}
                    </div>

                    {(style.show_song ?? DEFAULT_STYLE.show_song) && selectedSong && (
                      <div className="mt-3 rounded-2xl border border-border/50 bg-background/30 px-3 py-2">
                        <p className="text-xs text-muted-foreground">
                          {locale === 'de' ? 'Song' : 'Song'}
                        </p>
                        <p className="text-sm font-medium truncate">
                          {selectedSong.artist ? `${selectedSong.artist} — ` : ''}{selectedSong.title}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (style.layout || DEFAULT_STYLE.layout) === 'polaroid' ? (
                  <div className="rounded-3xl bg-white/90 text-slate-900 shadow-lg border border-white/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-slate-700">{formatDayLabel(locale, selectedDate)}</p>
                        <p className="text-base font-semibold truncate">{themeTitle || (locale === 'de' ? 'Funkbuch' : 'Funkbook')}</p>
                      </div>
                      <span className="text-2xl">{style.sticker || DEFAULT_STYLE.sticker}</span>
                    </div>

                    <p className="mt-3 text-sm whitespace-pre-wrap">
                      {note.trim().length ? note.trim() : (locale === 'de' ? 'Dein Hörmoment…' : 'Your listening moment…')}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="px-3 py-1 text-xs rounded-full bg-slate-900/10">
                        {locale === 'de' ? 'Energy' : 'Energy'} {energyLevel}/10
                      </span>
                      {situation.trim().length > 0 && (
                        <span className="px-3 py-1 text-xs rounded-full bg-slate-900/10">
                          {situation.trim()}
                        </span>
                      )}
                      {(selectedMoodTags || []).map((t) => (
                        <span key={`m-preview-${t}`} className="px-3 py-1 text-xs rounded-full bg-slate-900/10">
                          {t}
                        </span>
                      ))}
                      {(selectedActivityTags || []).map((t) => (
                        <span key={`a-preview-${t}`} className="px-3 py-1 text-xs rounded-full bg-slate-900/10">
                          {t}
                        </span>
                      ))}
                      {visibility === 'private' && (
                        <span className="px-3 py-1 text-xs rounded-full bg-slate-900/10">
                          {locale === 'de' ? 'Privat' : 'Private'}
                        </span>
                      )}
                    </div>

                    {(style.show_song ?? DEFAULT_STYLE.show_song) && selectedSong && (
                      <div className="mt-3 rounded-2xl border border-slate-900/15 bg-white/70 px-3 py-2">
                        <p className="text-xs text-slate-600">
                          {locale === 'de' ? 'Song' : 'Song'}
                        </p>
                        <p className="text-sm font-medium truncate">
                          {selectedSong.artist ? `${selectedSong.artist} — ` : ''}{selectedSong.title}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (style.layout || DEFAULT_STYLE.layout) === 'poster' ? (
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{formatDayLabel(locale, selectedDate)}</p>
                        <p className="text-lg font-semibold truncate mt-1">
                          {themeTitle || (locale === 'de' ? 'Funkbuch' : 'Funkbook')}
                        </p>
                        <div className="mt-2 h-1.5 w-24 rounded-full" style={{ backgroundColor: style.accent || DEFAULT_STYLE.accent }} />
                      </div>
                      <span className="text-3xl">{style.sticker || DEFAULT_STYLE.sticker}</span>
                    </div>

                    <p className="mt-3 text-base font-medium whitespace-pre-wrap">
                      {note.trim().length ? note.trim() : (locale === 'de' ? 'Dein Hörmoment…' : 'Your listening moment…')}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="secondary" className="rounded-full">
                        {locale === 'de' ? 'Energy' : 'Energy'} {energyLevel}/10
                      </Badge>
                      {situation.trim().length > 0 && (
                        <Badge variant="secondary" className="rounded-full">
                          {situation.trim()}
                        </Badge>
                      )}
                      {(selectedMoodTags || []).map((t) => (
                        <Badge key={`m-preview-${t}`} variant="secondary" className="rounded-full">
                          {t}
                        </Badge>
                      ))}
                      {(selectedActivityTags || []).map((t) => (
                        <Badge key={`a-preview-${t}`} variant="secondary" className="rounded-full">
                          {t}
                        </Badge>
                      ))}
                      {visibility === 'private' && (
                        <Badge variant="secondary" className="rounded-full">
                          {locale === 'de' ? 'Privat' : 'Private'}
                        </Badge>
                      )}
                    </div>

                    {(style.show_song ?? DEFAULT_STYLE.show_song) && selectedSong && (
                      <div className="mt-3 rounded-2xl border border-border/50 bg-background/30 px-3 py-2">
                        <p className="text-xs text-muted-foreground">
                          {locale === 'de' ? 'Song' : 'Song'}
                        </p>
                        <p className="text-sm font-medium truncate">
                          {selectedSong.artist ? `${selectedSong.artist} — ` : ''}{selectedSong.title}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{formatDayLabel(locale, selectedDate)}</p>
                        <p className="text-sm font-semibold truncate">{themeTitle || (locale === 'de' ? 'Funkbuch' : 'Funkbook')}</p>
                      </div>
                      <span className="text-xl">{style.sticker || DEFAULT_STYLE.sticker}</span>
                    </div>

                    <p className="mt-3 text-sm whitespace-pre-wrap">
                      {note.trim().length ? note.trim() : (locale === 'de' ? 'Dein Hörmoment…' : 'Your listening moment…')}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="secondary" className="rounded-full">
                        {locale === 'de' ? 'Energy' : 'Energy'} {energyLevel}/10
                      </Badge>
                      {situation.trim().length > 0 && (
                        <Badge variant="secondary" className="rounded-full">
                          {situation.trim()}
                        </Badge>
                      )}
                      {(selectedMoodTags || []).map((t) => (
                        <Badge key={`m-preview-${t}`} variant="secondary" className="rounded-full">
                          {t}
                        </Badge>
                      ))}
                      {(selectedActivityTags || []).map((t) => (
                        <Badge key={`a-preview-${t}`} variant="secondary" className="rounded-full">
                          {t}
                        </Badge>
                      ))}
                      {visibility === 'private' && (
                        <Badge variant="secondary" className="rounded-full">
                          {locale === 'de' ? 'Privat' : 'Private'}
                        </Badge>
                      )}
                    </div>

                    {(style.show_song ?? DEFAULT_STYLE.show_song) && selectedSong && (
                      <div className="mt-3 rounded-2xl border border-border/50 bg-background/30 px-3 py-2">
                        <p className="text-xs text-muted-foreground">
                          {locale === 'de' ? 'Song' : 'Song'}
                        </p>
                        <p className="text-sm font-medium truncate">
                          {selectedSong.artist ? `${selectedSong.artist} — ` : ''}{selectedSong.title}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            {!user ? (
              <p className="text-sm text-muted-foreground">
                {locale === 'de' ? 'Bitte anmelden, um zu posten.' : 'Log in to post.'}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {locale === 'de'
                  ? `Das wird als Karte im Funkbuch gespeichert (${myCards.length}/${maxCardsPerDay}).`
                  : `Saved as a card in the Funkbook (${myCards.length}/${maxCardsPerDay}).`}
              </p>
            )}
            <Button type="submit" className="rounded-full" disabled={!canEditContent || !user || createMutation.isPending}>
              {editingPostcardId ? (locale === 'de' ? 'Aktualisieren' : 'Update') : (locale === 'de' ? 'Speichern' : 'Save')}
            </Button>
          </div>
        </form>

        {user && myCards.length > 0 && editingPostcardId && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="rounded-full"
              onClick={() => {
                const card = myCards.find((c) => c.id === editingPostcardId)
                if (!card) return
                const next = card.visibility === 'private' ? 'public' : 'private'
                visibilityMutation.mutate({ postcardId: card.id, visibility: next })
              }}
              disabled={visibilityMutation.isPending}
              title={locale === 'de' ? 'Sichtbarkeit umschalten' : 'Toggle visibility'}
            >
              {locale === 'de' ? 'Privat/Öffentlich' : 'Private/Public'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="rounded-full"
              onClick={() => {
                if (confirm(locale === 'de' ? 'Karte wirklich löschen?' : 'Delete this card?')) {
                  deleteMutation.mutate(editingPostcardId)
                }
              }}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {locale === 'de' ? 'Löschen' : 'Delete'}
            </Button>
          </div>
        )}
      </div>

      {/* Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {locale === 'de' ? 'Heute im Funkbuch' : 'Today in the Funkbook'}
          </h3>
          <p className="text-xs text-muted-foreground">
            {(postcardsQuery.data || []).length} {locale === 'de' ? 'Karten' : 'cards'}
          </p>
        </div>

        {postcardsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">{locale === 'de' ? 'Laden...' : 'Loading...'}</p>
        ) : postcardsQuery.isError ? (
          <p className="text-sm text-muted-foreground">{locale === 'de' ? 'Karten konnten nicht geladen werden.' : 'Failed to load cards.'}</p>
        ) : (postcardsQuery.data || []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {locale === 'de' ? 'Noch keine Karten. Starte das Ritual.' : 'No cards yet. Start the ritual.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(postcardsQuery.data || []).slice(0, 12).map((card) => {
              const author = card.profiles?.display_name || (locale === 'de' ? 'Unbekannt' : 'Unknown')
              const reacted = myReactionSetQuery.data?.has(card.id) ?? false
              const canReact = !!user && card.user_id !== user.id
              const cardStyle = toStyle(card.style)
              const preview = card.songs ? buildPreviewUrl(card.songs.preview_url, card.songs.track_id) : null
              return (
                <div
                  key={card.id}
                  className={cn('relative rounded-3xl border border-border/50 overflow-hidden bg-gradient-to-br', getGradientClasses(cardStyle))}
                >
                  <div
                    className="absolute inset-y-0 left-0 w-2"
                    style={{ backgroundColor: cardStyle.accent || DEFAULT_STYLE.accent }}
                  />
                  {cardStyle.pattern && cardStyle.pattern !== 'none' && (
                    <div className={cn('absolute inset-0', getPatternOverlayClasses(cardStyle.pattern))} />
                  )}
                  <div className="relative p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={getAvatarUrl(card.profiles?.avatar_id)} />
                          <AvatarFallback>{author[0]?.toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{author}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(card.created_at).toLocaleTimeString(locale === 'de' ? 'de-DE' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{cardStyle.sticker || '🎧'}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant={reacted ? 'default' : 'secondary'}
                          className="rounded-full"
                          onClick={() => toggleReactionMutation.mutate(card.id)}
                          disabled={!canReact || toggleReactionMutation.isPending}
                          title={locale === 'de' ? 'Spark geben' : 'Give a spark'}
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          {card.reactions_count}
                        </Button>
                      </div>
                    </div>

                    {card.songs && (
                      <div className="mt-3 rounded-2xl border border-border/50 bg-background/30 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">
                              {locale === 'de' ? 'Song' : 'Song'}
                            </p>
                            <p className="text-sm font-medium truncate">
                              {card.songs.artist ? `${card.songs.artist} — ` : ''}{card.songs.title}
                            </p>
                          </div>
                          {preview && (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="rounded-full"
                              onClick={() => playPreview(preview)}
                            >
                              {playingSrc === preview ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

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
                      {(card.mood_tags || []).map((tag) => (
                        <Badge key={`m-${card.id}-${tag}`} variant="secondary" className="rounded-full">
                          {tag}
                        </Badge>
                      ))}
                      {(card.activity_tags || []).map((tag) => (
                        <Badge key={`a-${card.id}-${tag}`} variant="secondary" className="rounded-full">
                          {tag}
                        </Badge>
                      ))}
                      {card.visibility === 'private' && card.user_id === user?.id && (
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

      {/* Song picker */}
      <Dialog open={songPickerOpen} onOpenChange={(open) => setSongPickerOpen(open)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{locale === 'de' ? 'Song auswählen' : 'Pick a song'}</DialogTitle>
            <DialogDescription>
              {locale === 'de' ? 'Suche nach Titel oder Artist und höre kurz rein.' : 'Search title/artist and preview it.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              value={songSearch}
              onChange={(e) => setSongSearch(e.target.value)}
              placeholder={locale === 'de' ? 'Suchen… (min. 2 Zeichen)' : 'Search… (min 2 chars)'}
              autoFocus
            />

            {songSearchQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {locale === 'de' ? 'Laden…' : 'Loading…'}
              </div>
            ) : songSearchQuery.isError ? (
              <p className="text-sm text-muted-foreground">
                {locale === 'de' ? 'Songs konnten nicht geladen werden.' : 'Could not load songs.'}
              </p>
            ) : (
              <div className="max-h-[55vh] overflow-auto pr-2 space-y-2">
                {(songSearchQuery.data || []).map((s) => {
                  const preview = buildPreviewUrl(s.preview_url, s.track_id)
                  const isSelected = selectedSong?.id === s.id
                  return (
                    <div
                      key={s.id}
                      className={cn('rounded-2xl border border-border/50 p-3 flex items-center justify-between gap-3', isSelected && 'border-primary')}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {s.artist ? `${s.artist} — ` : ''}{s.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {s.track_id ? `Track #${s.track_id}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {preview && (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="rounded-full"
                            onClick={() => playPreview(preview)}
                          >
                            {playingSrc === preview ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="default"
                          className="rounded-full"
                          onClick={() => {
                            setSelectedSong(s)
                            setSongPickerOpen(false)
                          }}
                        >
                          {locale === 'de' ? 'Wählen' : 'Select'}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Story dialog */}
      <Dialog
        open={storyOpen}
        onOpenChange={(open) => {
          setStoryOpen(open)
          if (!open) {
            if (storyUrl) URL.revokeObjectURL(storyUrl)
            setStoryUrl(null)
            setStoryBlob(null)
            setStoryError(null)
          }
        }}
      >
        <DialogContent className="max-w-xl flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{locale === 'de' ? 'Instagram Story' : 'Instagram Story'}</DialogTitle>
            <DialogDescription>
              {locale === 'de' ? 'Bild im 9:16 Format — perfekt für Stories.' : '9:16 image — perfect for stories.'}
            </DialogDescription>
          </DialogHeader>

          {storyBusy ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {locale === 'de' ? 'Erstelle…' : 'Generating…'}
            </div>
          ) : storyUrl && storyBlob ? (
            <div className="flex flex-col gap-3 flex-1 min-h-0">
              <div className="rounded-2xl border border-border/50 overflow-hidden bg-muted/10 aspect-[9/16] w-full flex-1 min-h-0">
                <img src={storyUrl} alt="Funkbuch Story" className="w-full h-full object-cover" />
              </div>

              <p className="text-xs text-muted-foreground">
                {locale === 'de' ? 'Tipp: In Instagram als Story hochladen.' : 'Tip: Upload it to Instagram as a story.'}
              </p>

              <div className="space-y-2 mt-auto">
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-full w-full"
                  onClick={() => {
                    const blob = storyBlob
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `funkbuch-${selectedDate}.png`
                    document.body.appendChild(a)
                    a.click()
                    a.remove()
                    setTimeout(() => URL.revokeObjectURL(url), 1000)
                  }}
                >
                  {locale === 'de' ? 'Download' : 'Download'}
                </Button>
                <Button
                  type="button"
                  variant="default"
                  className="rounded-full w-full"
                  onClick={async () => {
                    const file = new File([storyBlob], `funkbuch-${selectedDate}.png`, { type: 'image/png' })
                    try {
                      if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({ files: [file], title: 'Funkbuch', text: 'Funkbuch Story' })
                        return
                      }
                    } catch {
                      // ignore
                    }
                    toast(locale === 'de' ? 'Teilen wird hier nicht unterstützt — nutze Download.' : 'Sharing not supported — use download.')
                  }}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  {locale === 'de' ? 'Teilen' : 'Share'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {storyError || (locale === 'de' ? 'Story konnte nicht erstellt werden.' : 'Could not generate story.')}
              </p>
              <Button type="button" className="rounded-full" onClick={onGenerateStory}>
                {locale === 'de' ? 'Erneut versuchen' : 'Try again'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
