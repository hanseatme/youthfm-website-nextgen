import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAppSettings, getSettingBoolean, getSettingNumber } from '@/lib/supabase/settings'
import { evaluateBadgesForUser } from '@/lib/badges/evaluate'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { song_id, song_title, song_artist, song_artwork, reaction, energy_level, mood_tags, activity_tags } = body

    if (!reaction) {
      return NextResponse.json(
        { error: 'Reaction is required' },
        { status: 400 }
      )
    }

    // Create or get a dummy song if no song_id provided
    let finalSongId = song_id

    if (!finalSongId && song_title) {
      const songQuery = supabase
        .from('songs')
        .select('id')
        .ilike('title', song_title)

      if (song_artist) {
        songQuery.ilike('artist', song_artist)
      }

      const { data: existingSong } = await songQuery.single()

      if (existingSong) {
        finalSongId = (existingSong as { id: string }).id
      } else {
        const { data: newSong } = await supabase
          .from('songs')
          .insert({
            title: song_title,
            artist: song_artist || null,
            artwork_url: song_artwork || null,
            is_active: true,
          } as never)
          .select('id')
          .single()

        if (newSong) {
          finalSongId = (newSong as { id: string }).id
        }
      }
    }

    if (!finalSongId) {
      // Check if dummy song exists
      const { data: dummySong } = await supabase
        .from('songs')
        .select('id')
        .eq('title', 'General Feedback')
        .single()

      if (dummySong) {
        finalSongId = (dummySong as { id: string }).id
      } else {
        // Create dummy song
        const { data: newSong } = await supabase
          .from('songs')
          .insert({
            title: 'General Feedback',
            artist: 'Unknown',
            is_active: true,
          } as never)
          .select('id')
          .single()

        if (newSong) {
          finalSongId = (newSong as { id: string }).id
        }
      }
    }

    if (!finalSongId) {
      return NextResponse.json(
        { error: 'Failed to resolve song' },
        { status: 500 }
      )
    }

    // Calculate vibes reward
    const settings = await getAppSettings()
    const baseReward = getSettingNumber(settings, 'vibes_per_feedback', 5) || 5
    const extendedBonus = getSettingNumber(settings, 'vibes_per_feedback_extended', 9) || 9
    const isExtended = energy_level || mood_tags?.length > 0 || activity_tags?.length > 0
    const vibesReward = isExtended ? baseReward + extendedBonus : baseReward
    const vibesEnabled = getSettingBoolean(settings, 'vibes_enabled', true)

    // Insert feedback
    const { data: feedbackResult, error: feedbackError } = await supabase
      .from('song_feedback')
      .insert({
        user_id: user.id,
        song_id: finalSongId,
        reaction,
        energy_level: energy_level || null,
        mood_tags: mood_tags || [],
        activity_tags: activity_tags || [],
      } as never)
      .select()
      .single()

    if (feedbackError) {
      if (feedbackError.code === '23505') {
        return NextResponse.json(
          { error: 'Du hast diesen Song bereits bewertet.' },
          { status: 409 }
        )
      }
      console.error('Feedback error:', feedbackError)
      return NextResponse.json(
        { error: 'Failed to save feedback', details: feedbackError.message },
        { status: 500 }
      )
    }

    const feedbackData = feedbackResult as { id: string } | null

    let newBalance = null as number | null
    let earnedAmount = 0

    if (vibesEnabled) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('vibes_available')
        .eq('id', user.id)
        .single()

      const previousBalance = (profile as { vibes_available: number } | null)?.vibes_available ?? 0

      const { data: updatedTotal, error: vibesError } = await supabase.rpc('add_vibes', {
        p_user_id: user.id,
        p_amount: vibesReward,
        p_reason: isExtended ? 'feedback_extended' : 'feedback_basic',
        p_reference_type: 'song_feedback',
        p_reference_id: feedbackData?.id,
      })

      if (vibesError) {
        console.error('Update error:', vibesError)
        return NextResponse.json(
          { error: 'Failed to update vibes' },
          { status: 500 }
        )
      }

      const updatedValue = typeof updatedTotal === 'number' ? updatedTotal : null
      if (updatedValue !== null) {
        newBalance = updatedValue
        earnedAmount = Math.max(0, updatedValue - previousBalance)
      }
    }

    return NextResponse.json({
      success: true,
      vibes_earned: earnedAmount,
      new_balance: newBalance,
      badges_awarded: (await evaluateBadgesForUser(supabase, user.id)).awarded,
    })
  } catch (error) {
    console.error('Feedback submission error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
