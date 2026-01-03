'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Swords, ArrowLeft, Sparkles, Music } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Link } from '@/i18n/navigation'

interface DuelVotingProps {
  duel: {
    id: string
    song_a_id: string | null
    song_b_id: string | null
    prompt?: string | null
    option_a_text?: string | null
    option_b_text?: string | null
    votes_a: number
    votes_b: number
    status: string
    started_at: string | null
    ended_at: string | null
    song_a: {
      id: string
      title: string
      artist: string
      artwork_url?: string | null
    } | null
    song_b: {
      id: string
      title: string
      artist: string
      artwork_url?: string | null
    } | null
  }
  hasVoted: boolean
  userVote: 'a' | 'b' | null
  isAuthenticated: boolean
  locale: string
}

export function DuelVoting({ duel, hasVoted: initialHasVoted, userVote: initialUserVote, isAuthenticated, locale }: DuelVotingProps) {
  const router = useRouter()
  const [isVoting, setIsVoting] = useState(false)
  const [hasVoted, setHasVoted] = useState(initialHasVoted)
  const [userVote, setUserVote] = useState<'a' | 'b' | null>(initialUserVote)
  const [votes, setVotes] = useState({ a: duel.votes_a, b: duel.votes_b })
  const [vibesEarned, setVibesEarned] = useState<number | null>(null)

  const totalVotes = votes.a + votes.b
  const percentA = totalVotes > 0 ? (votes.a / totalVotes) * 100 : 50
  const percentB = totalVotes > 0 ? (votes.b / totalVotes) * 100 : 50
  const isTextDuel = Boolean(duel.option_a_text || duel.option_b_text)
  const optionATitle = duel.option_a_text?.trim() || duel.song_a?.title || 'Option A'
  const optionBTitle = duel.option_b_text?.trim() || duel.song_b?.title || 'Option B'
  const optionASubtitle = duel.option_a_text ? null : (duel.song_a?.artist || 'Unknown')
  const optionBSubtitle = duel.option_b_text ? null : (duel.song_b?.artist || 'Unknown')

  const handleVote = async (choice: 'a' | 'b') => {
    if (!isAuthenticated) {
      toast.error(locale === 'de' ? 'Bitte melde dich an, um abzustimmen' : 'Please log in to vote')
      return
    }

    if (hasVoted) {
      toast.error(locale === 'de' ? 'Du hast bereits abgestimmt' : 'You have already voted')
      return
    }

    if (duel.status !== 'active') {
      toast.error(locale === 'de' ? 'Dieses Duell ist nicht mehr aktiv' : 'This duel is no longer active')
      return
    }

    setIsVoting(true)

    try {
      const response = await fetch('/api/duels/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duel_id: duel.id,
          voted_for: choice,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Voting failed')
      }

      // Update local state
      setHasVoted(true)
      setUserVote(choice)
      setVotes(prev => ({
        a: choice === 'a' ? prev.a + 1 : prev.a,
        b: choice === 'b' ? prev.b + 1 : prev.b,
      }))

      toast.success(locale === 'de' ? 'Stimme abgegeben!' : 'Vote submitted!', {
        description: locale === 'de'
          ? `+${data.vibes_earned ?? 0} Vibes verdient`
          : `+${data.vibes_earned ?? 0} vibes earned`,
        icon: <Sparkles className="h-5 w-5 text-primary" />,
      })

      // Refresh to update server state
      setVibesEarned(data.vibes_earned ?? 0)
      router.refresh()
    } catch (error) {
      console.error('Vote error:', error)
      toast.error(locale === 'de' ? 'Fehler beim Abstimmen' : 'Error voting')
    } finally {
      setIsVoting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {locale === 'de' ? 'Zurück' : 'Back'}
        </Link>
      </Button>

      {/* Header */}
      <div className="glass-card rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Swords className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Song Duell</h1>
              <p className="text-sm text-muted-foreground">
                {duel.prompt?.trim()
                  ? duel.prompt
                  : (locale === 'de' ? 'Stimme für deinen Favoriten ab' : 'Vote for your favorite')}
              </p>
            </div>
          </div>
          {duel.status === 'active' && (
            <Badge className="bg-red-500 text-white">
              <span className="relative flex h-2 w-2 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
              </span>
              LIVE
            </Badge>
          )}
        </div>

        {/* Vote counts */}
        <div className="text-center mb-6">
          <p className="text-sm text-muted-foreground">
            {totalVotes} {locale === 'de' ? 'Stimmen insgesamt' : 'total votes'}
          </p>
        </div>
      </div>

      {/* Voting cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Song A */}
        <button
          onClick={() => handleVote('a')}
          disabled={hasVoted || isVoting || duel.status !== 'active'}
          className={cn(
            'glass-card rounded-3xl p-6 transition-all duration-300',
            !hasVoted && duel.status === 'active' && 'hover:scale-105 hover:shadow-xl cursor-pointer',
            hasVoted && userVote === 'a' && 'ring-2 ring-primary',
            hasVoted && 'cursor-not-allowed opacity-75'
          )}
        >
          {!isTextDuel && (
            <div className="aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 mb-4">
              {duel.song_a?.artwork_url ? (
                <img
                  src={duel.song_a.artwork_url}
                  alt={duel.song_a.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Music className="w-16 h-16 text-primary/60" />
                </div>
              )}
            </div>
          )}

          <div className="text-center mb-4">
            <h3 className="text-xl font-bold mb-1">{optionATitle}</h3>
            {optionASubtitle && (
              <p className="text-muted-foreground">{optionASubtitle}</p>
            )}
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-semibold">
              <span>{percentA.toFixed(1)}%</span>
              <span>{votes.a} {locale === 'de' ? 'Stimmen' : 'votes'}</span>
            </div>
            <Progress value={percentA} className="h-3" />
          </div>

          {userVote === 'a' && (
            <Badge className="w-full mt-4 justify-center" variant="default">
              {locale === 'de' ? 'Deine Stimme' : 'Your vote'}
            </Badge>
          )}
        </button>

        {/* Song B */}
        <button
          onClick={() => handleVote('b')}
          disabled={hasVoted || isVoting || duel.status !== 'active'}
          className={cn(
            'glass-card rounded-3xl p-6 transition-all duration-300',
            !hasVoted && duel.status === 'active' && 'hover:scale-105 hover:shadow-xl cursor-pointer',
            hasVoted && userVote === 'b' && 'ring-2 ring-primary',
            hasVoted && 'cursor-not-allowed opacity-75'
          )}
        >
          {!isTextDuel && (
            <div className="aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 mb-4">
              {duel.song_b?.artwork_url ? (
                <img
                  src={duel.song_b.artwork_url}
                  alt={duel.song_b.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Music className="w-16 h-16 text-primary/60" />
                </div>
              )}
            </div>
          )}

          <div className="text-center mb-4">
            <h3 className="text-xl font-bold mb-1">{optionBTitle}</h3>
            {optionBSubtitle && (
              <p className="text-muted-foreground">{optionBSubtitle}</p>
            )}
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-semibold">
              <span>{percentB.toFixed(1)}%</span>
              <span>{votes.b} {locale === 'de' ? 'Stimmen' : 'votes'}</span>
            </div>
            <Progress value={percentB} className="h-3" />
          </div>

          {userVote === 'b' && (
            <Badge className="w-full mt-4 justify-center" variant="default">
              {locale === 'de' ? 'Deine Stimme' : 'Your vote'}
            </Badge>
          )}
        </button>
      </div>

      {/* Info banner */}
      {!isAuthenticated && (
        <div className="glass-card rounded-3xl p-6 text-center">
          <p className="text-muted-foreground mb-4">
            {locale === 'de'
              ? 'Melde dich an, um abzustimmen und Vibes zu verdienen!'
              : 'Log in to vote and earn vibes!'}
          </p>
          <Button asChild>
            <Link href="/login">
              {locale === 'de' ? 'Anmelden' : 'Log in'}
            </Link>
          </Button>
        </div>
      )}

      {hasVoted && (
        <div className="glass-card rounded-3xl p-6 text-center">
          <Sparkles className="h-12 w-12 mx-auto mb-3 text-primary" />
          <p className="text-lg font-semibold mb-2">
            {locale === 'de' ? 'Danke für deine Stimme!' : 'Thanks for voting!'}
          </p>
          <p className="text-muted-foreground">
            {vibesEarned !== null
              ? (locale === 'de'
                ? `Du hast ${vibesEarned} Vibes verdient`
                : `You earned ${vibesEarned} vibes`)
              : (locale === 'de'
                ? 'Deine Stimme wurde gespeichert.'
                : 'Your vote was saved.')}
          </p>
        </div>
      )}
    </div>
  )
}
