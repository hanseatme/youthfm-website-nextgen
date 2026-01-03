import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { evaluateBadgesForUser } from '@/lib/badges/evaluate'

// POST vote for a duel
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { duel_id, voted_for } = body

    if (!duel_id || !voted_for) {
      return NextResponse.json({ error: 'duel_id and voted_for are required' }, { status: 400 })
    }

    if (voted_for !== 'a' && voted_for !== 'b') {
      return NextResponse.json({ error: 'voted_for must be "a" or "b"' }, { status: 400 })
    }

    const { data: vibesEarned, error } = await supabase.rpc('cast_duel_vote', {
      p_duel_id: duel_id,
      p_vote: voted_for,
    })

    if (error) {
      const message = error.message || 'Voting failed'
      const status = message.includes('active') || message.includes('Already voted') ? 400 : 500
      return NextResponse.json({ error: message }, { status })
    }

    return NextResponse.json({
      success: true,
      vibes_earned: vibesEarned ?? 0,
      message: 'Vote cast successfully',
      badges_awarded: (await evaluateBadgesForUser(supabase, user.id)).awarded,
    })
  } catch (error) {
    console.error('Error casting vote:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET duel details with vote counts
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const duel_id = searchParams.get('duel_id')

    if (!duel_id) {
      return NextResponse.json({ error: 'duel_id is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('duels')
      .select(`
        *,
        song_a:songs!duels_song_a_id_fkey(id, title, artist, artwork_url),
        song_b:songs!duels_song_b_id_fkey(id, title, artist, artwork_url)
      `)
      .eq('id', duel_id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Check if current user has voted
    const { data: { user } } = await supabase.auth.getUser()
    let userVote = null

    if (user) {
      const { data: vote } = await supabase
        .from('duel_votes')
        .select('voted_for')
        .eq('duel_id', duel_id)
        .eq('user_id', user.id)
        .single()

      if (vote) {
        userVote = (vote as { voted_for: string }).voted_for
      }
    }

    return NextResponse.json({
      data,
      user_vote: userVote,
    })
  } catch (error) {
    console.error('Error fetching duel:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
