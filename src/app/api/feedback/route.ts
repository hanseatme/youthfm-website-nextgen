import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// POST song feedback
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServiceClient()

    // Verify user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { song_id, reaction, energy_level, mood_tags, activity_tags } = body

    if (!song_id || !reaction) {
      return NextResponse.json({ error: 'song_id and reaction are required' }, { status: 400 })
    }

    // Check if song exists, if not create it
    const { data: existingSong } = await supabase
      .from('songs')
      .select('id')
      .eq('id', song_id)
      .single()

    if (!existingSong) {
      // Create the song if it doesn't exist
      await supabase.from('songs').insert({
        id: song_id,
        title: 'Unknown',
        is_active: true,
      } as never)
    }

    // Insert feedback
    const { data: feedbackResult, error } = await supabase
      .from('song_feedback')
      .insert({
        user_id: user.id,
        song_id,
        reaction,
        energy_level,
        mood_tags,
        activity_tags,
      } as never)
      .select()
      .single()

    if (error) {
      console.error('Feedback insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const feedbackData = feedbackResult as { id: string } | null

    // Award vibes for feedback
    const vibesAmount = 5 // Base vibes for feedback

    // Insert vibes transaction
    await supabase.from('vibes_transactions').insert({
      user_id: user.id,
      amount: vibesAmount,
      reason: 'song_feedback',
      reference_type: 'song_feedback',
      reference_id: feedbackData?.id || null,
    } as never)

    // Update user's vibes
    const { data: profile } = await supabase
      .from('profiles')
      .select('vibes_total, vibes_available')
      .eq('id', user.id)
      .single()

    const profileData = profile as { vibes_total: number; vibes_available: number } | null
    if (profileData) {
      await supabase
        .from('profiles')
        .update({
          vibes_total: profileData.vibes_total + vibesAmount,
          vibes_available: profileData.vibes_available + vibesAmount,
        } as never)
        .eq('id', user.id)
    }

    return NextResponse.json({
      data: feedbackData,
      vibes_earned: vibesAmount,
      message: 'Feedback submitted successfully'
    })
  } catch (error) {
    console.error('Error submitting feedback:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
