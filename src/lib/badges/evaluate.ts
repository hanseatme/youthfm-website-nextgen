import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database'

type BadgeRecord = {
  id: string
  slug: string
  condition_type: string
  condition_value: Json | null
}

type BadgeStats = {
  feedbackCount: number
  loveVotes: number
  reactionCounts: Record<number, number>
  moodFeedbackCount: number
  completeFeedbackCount: number
  duelVotesCount: number
  winnerPicksCount: number
  underdogWinsCount: number
  firstVotesCount: number
  chatMessagesCount: number
  streakDays: number
  freezeUsedCount: number
  profileComplete: boolean
  songsHeard: number
  earlyListens: number
  lateListens: number
  dayListens: number
  maxSessionMinutes: number
  distinctListenHours: number
  referrals: number
  communityPillar: boolean
}

function getObject(value: Json | null): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function getNumber(value: unknown, fallback = 0) {
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(num) ? num : fallback
}

function isTruthy(value: unknown) {
  return value === true || value === 'true'
}

export async function evaluateBadgesForUser(
  supabase: SupabaseClient<Database>,
  userId: string
) {
  const [{ data: badges }, { data: existingBadges }, { data: profile }] = await Promise.all([
    supabase
      .from('badges')
      .select('id, slug, condition_type, condition_value')
      .eq('is_active', true),
    supabase
      .from('user_badges')
      .select('badge_id')
      .eq('user_id', userId),
    supabase
      .from('profiles')
      .select('username, display_name, bio, location, avatar_id, streak_current')
      .eq('id', userId)
      .single(),
  ])

  if (!badges || !profile) {
    return { awarded: [] as string[], checked: 0 }
  }

  const existingSet = new Set(
    (existingBadges || []).map((row) => row.badge_id)
  )

  const feedbackCountPromise = supabase
    .from('song_feedback')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  const loveVotesPromise = supabase
    .from('song_feedback')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('reaction', 1)

  const moodFeedbackPromise = supabase
    .from('song_feedback')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .not('mood_tags', 'is', null)

  const completeFeedbackPromise = supabase
    .from('song_feedback')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .not('energy_level', 'is', null)
    .not('mood_tags', 'is', null)
    .not('activity_tags', 'is', null)

  const duelVotesPromise = supabase
    .from('duel_votes')
    .select('duel_id, voted_for, created_at, duels:duel_id(id, song_a_id, song_b_id, winner_id, votes_a, votes_b)')
    .eq('user_id', userId)

  const chatMessagesPromise = supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'active')

  const streakHistoryPromise = supabase
    .from('streak_history')
    .select('freeze_used, minutes_listened, date')
    .eq('user_id', userId)

  const listeningSessionsPromise = supabase
    .from('listening_sessions')
    .select('duration_minutes, songs_heard, started_at')
    .eq('user_id', userId)

  const reactionCountsPromise = Promise.all(
    [1, 2, 3, 4, 5].map((reaction) =>
      supabase
        .from('song_feedback')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('reaction', reaction)
        .then((result) => ({ reaction, count: result.count || 0 }))
    )
  )

  const [
    feedbackCountResult,
    loveVotesResult,
    moodFeedbackResult,
    completeFeedbackResult,
    duelVotesResult,
    chatMessagesResult,
    streakHistoryResult,
    listeningSessionsResult,
    reactionCountsResult,
  ] = await Promise.all([
    feedbackCountPromise,
    loveVotesPromise,
    moodFeedbackPromise,
    completeFeedbackPromise,
    duelVotesPromise,
    chatMessagesPromise,
    streakHistoryPromise,
    listeningSessionsPromise,
    reactionCountsPromise,
  ])

  const reactionCounts: Record<number, number> = {}
  reactionCountsResult.forEach((row) => {
    reactionCounts[row.reaction] = row.count
  })

  const duelVotes = (duelVotesResult.data || []) as unknown as Array<{
    duel_id: string
    voted_for: 'a' | 'b'
    created_at: string
    duels: {
      id: string
      song_a_id: string
      song_b_id: string
      winner_id: string | null
      votes_a: number
      votes_b: number
    } | null
  }>

  let winnerPicksCount = 0
  let underdogWinsCount = 0

  duelVotes.forEach((vote) => {
    const duel = vote.duels
    if (!duel || !duel.winner_id) return
    const winnerIsA = duel.winner_id === duel.song_a_id
    const pickedWinner =
      (winnerIsA && vote.voted_for === 'a') ||
      (!winnerIsA && vote.voted_for === 'b')

    if (pickedWinner) {
      winnerPicksCount += 1
      const underdogWon =
        (winnerIsA && duel.votes_a < duel.votes_b) ||
        (!winnerIsA && duel.votes_b < duel.votes_a)
      if (underdogWon) {
        underdogWinsCount += 1
      }
    }
  })

  let firstVotesCount = 0
  const duelIds = Array.from(new Set(duelVotes.map((vote) => vote.duel_id)))
  for (const duelId of duelIds) {
    const { data: firstVote } = await supabase
      .from('duel_votes')
      .select('user_id')
      .eq('duel_id', duelId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()
    if (firstVote?.user_id === userId) {
      firstVotesCount += 1
    }
  }

  const streakHistory = (streakHistoryResult.data || []) as Array<{
    freeze_used: boolean
    minutes_listened: number
    date: string
  }>
  const freezeUsedCount = streakHistory.filter((row) => row.freeze_used).length
  const activeDaysCount = new Set(
    streakHistory.filter((row) => row.minutes_listened > 0).map((row) => row.date)
  ).size

  const sessions = (listeningSessionsResult.data || []) as Array<{
    duration_minutes: number | null
    songs_heard: number
    started_at: string
  }>
  let songsHeard = 0
  let maxSessionMinutes = 0
  let earlyListens = 0
  let lateListens = 0
  let dayListens = 0
  const hourSet = new Set<number>()

  sessions.forEach((session) => {
    songsHeard += session.songs_heard || 0
    if (session.duration_minutes && session.duration_minutes > maxSessionMinutes) {
      maxSessionMinutes = session.duration_minutes
    }
    const start = new Date(session.started_at)
    if (!Number.isNaN(start.getTime())) {
      const hour = start.getHours()
      hourSet.add(hour)
      if (hour < 7) earlyListens += 1
      if (hour < 5) lateListens += 1
      if (hour >= 9 && hour < 17) dayListens += 1
    }
  })

  const profileComplete = Boolean(
    (profile.display_name || profile.username) &&
      profile.bio &&
      profile.location &&
      profile.avatar_id
  )

  const communityPillar =
    activeDaysCount >= 30 &&
    (chatMessagesResult.count || 0) >= 50 &&
    (feedbackCountResult.count || 0) >= 100

  const stats: BadgeStats = {
    feedbackCount: feedbackCountResult.count || 0,
    loveVotes: loveVotesResult.count || 0,
    reactionCounts,
    moodFeedbackCount: moodFeedbackResult.count || 0,
    completeFeedbackCount: completeFeedbackResult.count || 0,
    duelVotesCount: duelVotesResult.data?.length || 0,
    winnerPicksCount,
    underdogWinsCount,
    firstVotesCount,
    chatMessagesCount: chatMessagesResult.count || 0,
    streakDays: profile.streak_current || 0,
    freezeUsedCount,
    profileComplete,
    songsHeard,
    earlyListens,
    lateListens,
    dayListens,
    maxSessionMinutes,
    distinctListenHours: hourSet.size,
    referrals: 0,
    communityPillar,
  }

  const awarded: string[] = []

  for (const badge of badges as BadgeRecord[]) {
    if (existingSet.has(badge.id)) continue
    const condition = badge.condition_type
    const value = getObject(badge.condition_value)

    let meets = false

    switch (condition) {
      case 'feedback_count':
        meets = stats.feedbackCount >= getNumber(value.count)
        break
      case 'love_votes':
        meets = stats.loveVotes >= getNumber(value.count)
        break
      case 'all_reactions': {
        const minEach = getNumber(value.min_each)
        meets = [1, 2, 3, 4, 5].every(
          (reaction) => (stats.reactionCounts[reaction] || 0) >= minEach
        )
        break
      }
      case 'mood_tags':
        meets = stats.moodFeedbackCount >= getNumber(value.count)
        break
      case 'complete_feedback':
        meets = stats.completeFeedbackCount >= getNumber(value.count)
        break
      case 'duel_votes':
        meets = stats.duelVotesCount >= getNumber(value.count)
        break
      case 'winner_picks':
        meets = stats.winnerPicksCount >= getNumber(value.count)
        break
      case 'underdog_wins':
        meets = stats.underdogWinsCount >= getNumber(value.count)
        break
      case 'first_votes':
        meets = stats.firstVotesCount >= getNumber(value.count)
        break
      case 'streak_days':
        meets = stats.streakDays >= getNumber(value.days)
        break
      case 'freeze_used':
        meets = stats.freezeUsedCount >= getNumber(value.count)
        break
      case 'profile_complete':
        meets = stats.profileComplete
        break
      case 'chat_messages':
        meets = stats.chatMessagesCount >= getNumber(value.count)
        break
      case 'songs_heard':
        meets = stats.songsHeard >= getNumber(value.count)
        break
      case 'early_listens':
        meets = stats.earlyListens >= getNumber(value.count)
        break
      case 'late_listens':
        meets = stats.lateListens >= getNumber(value.count)
        break
      case 'day_listens':
        meets = stats.dayListens >= getNumber(value.count)
        break
      case 'session_duration':
        meets = stats.maxSessionMinutes >= getNumber(value.minutes)
        break
      case 'all_hours':
        meets = stats.distinctListenHours >= getNumber(value.count)
        break
      case 'referrals':
        meets = stats.referrals >= getNumber(value.count)
        break
      case 'community_pillar':
        meets = stats.communityPillar
        break
      case 'feature_implemented':
        meets = isTruthy(value.enabled)
        break
      case 'launch_day':
      case 'anniversary':
      default:
        meets = false
        break
    }

    if (!meets) continue

    const { data: awardedOk } = await supabase.rpc('award_badge', {
      p_user_id: userId,
      p_badge_slug: badge.slug,
    })

    if (awardedOk) {
      awarded.push(badge.slug)
    }
  }

  return { awarded, checked: badges.length }
}
