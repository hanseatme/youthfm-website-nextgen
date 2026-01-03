'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Flame, ThumbsUp, Meh, ThumbsDown, SkipForward, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/hooks/use-auth'
import { toast } from 'sonner'

interface MoodFeedbackProps {
  songId?: string
  songTrackId?: number | null
  songPreviewUrl?: string | null
  songTitle?: string | null
  songArtist?: string | null
  songArtwork?: string | null
  onFeedbackSubmit?: (feedback: FeedbackData) => void
  compact?: boolean
  embedded?: boolean
}

interface FeedbackData {
  reaction: number
  energyLevel?: number
  moodTags?: string[]
  activityTags?: string[]
}

const reactions = [
  { value: 1, icon: Flame, label: 'loveIt', color: 'text-orange-500 hover:bg-orange-500/10', activeColor: 'bg-orange-500/20 ring-orange-500' },
  { value: 2, icon: ThumbsUp, label: 'likeIt', color: 'text-green-500 hover:bg-green-500/10', activeColor: 'bg-green-500/20 ring-green-500' },
  { value: 3, icon: Meh, label: 'neutral', color: 'text-gray-500 hover:bg-gray-500/10', activeColor: 'bg-gray-500/20 ring-gray-500' },
  { value: 4, icon: ThumbsDown, label: 'dislike', color: 'text-red-400 hover:bg-red-400/10', activeColor: 'bg-red-400/20 ring-red-400' },
  { value: 5, icon: SkipForward, label: 'skip', color: 'text-purple-500 hover:bg-purple-500/10', activeColor: 'bg-purple-500/20 ring-purple-500' },
]

const moodOptions = [
  { value: 'happy', emoji: '☀️' },
  { value: 'melancholic', emoji: '🌙' },
  { value: 'motivating', emoji: '🚀' },
  { value: 'meditative', emoji: '🌊' },
  { value: 'intense', emoji: '⚡' },
]

const activityOptions = [
  { value: 'work', emoji: '💼' },
  { value: 'sport', emoji: '🏃' },
  { value: 'evening', emoji: '🌃' },
  { value: 'morning', emoji: '☕' },
  { value: 'party', emoji: '🎉' },
  { value: 'sleep', emoji: '😴' },
]

export function MoodFeedback({ songId, songTrackId, songPreviewUrl, songTitle, songArtist, songArtwork, onFeedbackSubmit, compact = false, embedded = false }: MoodFeedbackProps) {
  const t = useTranslations('feedback')
  const { isAuthenticated } = useAuth()
  const [selectedReaction, setSelectedReaction] = useState<number | null>(null)
  const [showExtended, setShowExtended] = useState(false)
  const [energyLevel, setEnergyLevel] = useState(5)
  const [selectedMoods, setSelectedMoods] = useState<string[]>([])
  const [selectedActivities, setSelectedActivities] = useState<string[]>([])
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [baseVibes, setBaseVibes] = useState(5)
  const [extendedBonus, setExtendedBonus] = useState(9)

  useEffect(() => {
    let isActive = true

    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings')
        if (!response.ok) return
        const data = await response.json()

        if (!isActive) return

        if (typeof data.vibes_per_feedback === 'number') {
          setBaseVibes(data.vibes_per_feedback)
        }
        if (typeof data.vibes_per_feedback_extended === 'number') {
          setExtendedBonus(data.vibes_per_feedback_extended)
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
      }
    }

    loadSettings()
    return () => {
      isActive = false
    }
  }, [])

  const handleReactionClick = (value: number) => {
    if (!isAuthenticated) {
      toast.error('Bitte melde dich an, um Feedback zu geben')
      return
    }

    setSelectedReaction(value)
    setIsSubmitted(false)
  }

  const toggleMood = (mood: string) => {
    setSelectedMoods((prev) => {
      if (prev.includes(mood)) {
        return prev.filter((m) => m !== mood)
      }
      if (prev.length >= 2) {
        return [...prev.slice(1), mood]
      }
      return [...prev, mood]
    })
  }

  const toggleActivity = (activity: string) => {
    setSelectedActivities((prev) => {
      if (prev.includes(activity)) {
        return prev.filter((a) => a !== activity)
      }
      if (prev.length >= 2) {
        return [...prev.slice(1), activity]
      }
      return [...prev, activity]
    })
  }

  const submitFeedback = async () => {
    if (!selectedReaction) return

    const feedback: FeedbackData = {
      reaction: selectedReaction,
      energyLevel: showExtended ? energyLevel : undefined,
      moodTags: showExtended && selectedMoods.length > 0 ? selectedMoods : undefined,
      activityTags: showExtended && selectedActivities.length > 0 ? selectedActivities : undefined,
    }

    try {
      // Submit feedback to API
      const response = await fetch('/api/feedback/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          song_id: songId,
          song_track_id: songTrackId,
          song_preview_url: songPreviewUrl,
          song_title: songTitle,
          song_artist: songArtist,
          song_artwork: songArtwork,
          reaction: selectedReaction,
          energy_level: showExtended ? energyLevel : undefined,
          mood_tags: showExtended && selectedMoods.length > 0 ? selectedMoods : undefined,
          activity_tags: showExtended && selectedActivities.length > 0 ? selectedActivities : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit feedback')
      }

      onFeedbackSubmit?.(feedback)
      setIsSubmitted(true)
      toast.success(t('thankYou'), {
        description: t('vibesEarned', { amount: data.vibes_earned ?? (showExtended ? baseVibes + extendedBonus : baseVibes) }),
      })
    } catch (error) {
      console.error('Feedback submission error:', error)
      toast.error(error instanceof Error ? error.message : 'Fehler beim Senden des Feedbacks')
    }
  }

  if (isSubmitted) {
    return (
      <div className="glass-card rounded-2xl p-4 text-center">
        <p className="text-lg font-medium text-green-500">{t('thankYou')}</p>
        <p className="text-sm text-muted-foreground">
          {t('vibesEarned', { amount: showExtended ? baseVibes + extendedBonus : baseVibes })}
        </p>
      </div>
    )
  }

  return (
    <div className={cn(
      embedded
        ? 'space-y-4'
        : 'glass-card rounded-2xl space-y-4',
      compact ? 'space-y-3' : '',
      embedded ? '' : (compact ? 'p-3' : 'p-4')
    )}>
      <p className={cn(
        'text-center font-medium text-muted-foreground',
        compact ? 'text-xs' : 'text-sm'
      )}>
        {t('title')}
      </p>

      {/* Basic Reactions */}
      <div className={cn(
        'flex justify-center gap-2',
        compact && 'gap-1.5'
      )}>
        {reactions.map(({ value, icon: Icon, label, color, activeColor }) => (
          <button
            key={value}
            onClick={() => handleReactionClick(value)}
            className={cn(
              'flex flex-col items-center gap-1 rounded-xl transition-all',
              compact ? 'p-2' : 'p-3',
              color,
              selectedReaction === value && `ring-2 ${activeColor}`
            )}
          >
            <Icon className={compact ? 'h-5 w-5' : 'h-6 w-6'} />
            <span className={compact ? 'text-[9px]' : 'text-[10px]'}>{t(label)}</span>
          </button>
        ))}
      </div>

      {/* Extended feedback toggle */}
      {selectedReaction && (
        <button
          onClick={() => setShowExtended(!showExtended)}
          className={cn(
            'w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors',
            compact ? 'text-xs' : 'text-sm'
          )}
        >
          {showExtended ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {t('tellUsMore')}
        </button>
      )}

      {/* Extended feedback */}
      {showExtended && selectedReaction && (
        <div className={cn(
          'space-y-4 border-t border-border/50',
          compact ? 'pt-3 space-y-3' : 'pt-4'
        )}>
          {/* Energy Level */}
          <div className="space-y-2">
            <div className={cn(
              'flex justify-between',
              compact ? 'text-xs' : 'text-sm'
            )}>
              <span>{t('energy')}</span>
              <span className="text-muted-foreground">
                {energyLevel <= 3 ? t('relaxed') : energyLevel >= 7 ? t('energetic') : ''}
              </span>
            </div>
            <Slider
              value={[energyLevel]}
              onValueChange={([v]) => setEnergyLevel(v)}
              min={1}
              max={10}
              step={1}
            />
            <div className={cn(
              'flex justify-between text-muted-foreground',
              compact ? 'text-[10px]' : 'text-xs'
            )}>
              <span>🧘 {t('relaxed')}</span>
              <span>🔋 {t('energetic')}</span>
            </div>
          </div>

          {/* Mood Tags */}
          <div className="space-y-2">
            <p className={compact ? 'text-xs' : 'text-sm'}>{t('mood')}</p>
            <div className={cn(
              'flex flex-wrap justify-center gap-2',
              compact && 'gap-1.5'
            )}>
              {moodOptions.map(({ value, emoji }) => (
                <Badge
                  key={value}
                  variant={selectedMoods.includes(value) ? 'default' : 'outline'}
                  className={cn('cursor-pointer', compact && 'text-[10px] px-2 py-0.5')}
                  onClick={() => toggleMood(value)}
                >
                  {emoji} {t(`moods.${value}`)}
                </Badge>
              ))}
            </div>
          </div>

          {/* Activity Tags */}
          <div className="space-y-2">
            <p className={compact ? 'text-xs' : 'text-sm'}>{t('fitsFor')}</p>
            <div className={cn(
              'flex flex-wrap justify-center gap-2',
              compact && 'gap-1.5'
            )}>
              {activityOptions.map(({ value, emoji }) => (
                <Badge
                  key={value}
                  variant={selectedActivities.includes(value) ? 'default' : 'outline'}
                  className={cn('cursor-pointer', compact && 'text-[10px] px-2 py-0.5')}
                  onClick={() => toggleActivity(value)}
                >
                  {emoji} {t(`activities.${value}`)}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Submit button */}
      {selectedReaction && (
        <Button onClick={submitFeedback} className="w-full" size={compact ? 'sm' : 'default'}>
          Feedback senden (+{showExtended ? baseVibes + extendedBonus : baseVibes} Vibes)
        </Button>
      )}
    </div>
  )
}
