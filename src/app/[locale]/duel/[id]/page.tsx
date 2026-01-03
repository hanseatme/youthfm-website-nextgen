import { setRequestLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DuelVoting } from '@/components/duels/duel-voting'

interface DuelPageProps {
  params: Promise<{ locale: string; id: string }>
}

export default async function DuelPage({ params }: DuelPageProps) {
  const { locale, id } = await params
  setRequestLocale(locale)

  const supabase = await createClient()

  // Fetch duel data
  const { data: duel, error } = await supabase
    .from('duels')
    .select(`
      *,
      song_a:songs!duels_song_a_id_fkey(*),
      song_b:songs!duels_song_b_id_fkey(*)
    `)
    .eq('id', id)
    .single()

  if (error || !duel) {
    redirect('/')
  }

  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser()

  // Check if user has already voted
  let hasVoted = false
  let userVote: 'a' | 'b' | null = null

  if (user) {
    const { data: vote } = await supabase
      .from('duel_votes')
      .select('voted_for')
      .eq('duel_id', id)
      .eq('user_id', user.id)
      .single()

    if (vote) {
      hasVoted = true
      userVote = (vote as { voted_for: 'a' | 'b' }).voted_for
    }
  }

  return (
    <div className="relative min-h-screen">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto w-full">
          <DuelVoting
            duel={duel}
            hasVoted={hasVoted}
            userVote={userVote}
            isAuthenticated={!!user}
            locale={locale}
          />
        </div>
      </div>
    </div>
  )
}
