'use client'

import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { HeroPlayer } from '@/components/player/hero-player'
import { DuelPreview } from '@/components/duels/duel-preview'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'

interface ThemeOfDayProps {
  theme?: {
    title: string
    teaser: string
    image_url: string | null
  }
  isLoading?: boolean
  activeDuel?: {
    id: string
    song_a: { title: string; artist: string } | null
    song_b: { title: string; artist: string } | null
    prompt?: string | null
    option_a_text?: string | null
    option_b_text?: string | null
    votes_a: number
    votes_b: number
    started_at: string | null
    ended_at: string | null
    status: string
  } | null
}

export function ThemeOfDay({ theme, isLoading, activeDuel }: ThemeOfDayProps) {
  const t = useTranslations('theme')

  if (isLoading) {
    return (
      <div className="glass-card rounded-3xl overflow-hidden">
        <Skeleton className="aspect-[21/9] w-full" />
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-20 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
      </div>
    )
  }

  if (!theme) {
    return null
  }

  return (
    <div className="glass-card rounded-3xl overflow-hidden">
      {/* Hero Image */}
      <div className="relative aspect-[21/9] sm:aspect-[16/9] md:aspect-[21/9] bg-gradient-to-br from-primary/20 to-primary/5">
        {theme.image_url ? (
          <Image
            src={theme.image_url}
            alt={theme.title}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-6xl">NGR</div>
          </div>
        )}

        {/* Overlay with title */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8">
          <Badge variant="secondary" className="mb-2 sm:mb-3">
            {t('title')}
          </Badge>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white drop-shadow-lg">
            {theme.title}
          </h2>
          {theme.teaser && (
            <p className="mt-2 text-sm sm:text-base md:text-lg text-white/90 drop-shadow-md max-w-3xl">
              {theme.teaser}
            </p>
          )}
        </div>
        <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 md:bottom-8 md:right-8">
          <Button
            size="lg"
            className="rounded-full px-8 sm:px-10 py-5 sm:py-6 text-base sm:text-lg font-semibold shadow-xl shadow-primary/40 bg-primary hover:bg-primary/90"
            asChild
          >
            <Link href="/community">
              Jetzt mitdiskutieren
            </Link>
          </Button>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        <HeroPlayer showMoodFeedback />

        <div className="border-t border-border/40 pt-6">
          <DuelPreview duel={activeDuel} layout="horizontal" />
        </div>
      </div>
    </div>
  )
}
