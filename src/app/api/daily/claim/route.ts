import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAppSettings, getSettingBoolean } from '@/lib/supabase/settings'
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

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('vibes_available, streak_current, streak_multiplier, last_seen_at')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    const profileData = profile as {
      vibes_available: number
      streak_current: number
      streak_multiplier: number
      last_seen_at: string | null
    }

    // Check if already claimed today
    const today = new Date().toISOString().split('T')[0]
    const lastActivity = profileData.last_seen_at
      ? new Date(profileData.last_seen_at).toISOString().split('T')[0]
      : null

    if (lastActivity === today) {
      return NextResponse.json({ ok: true, already_claimed: true })
    }

    // Calculate daily reward based on streak
    const baseReward = 10
    const streakBonus = profileData.streak_current * 2
    const multiplier = profileData.streak_multiplier || 1
    const rewardBase = baseReward + streakBonus
    const totalReward = Math.floor(rewardBase * multiplier)

    const settings = await getAppSettings()
    const vibesEnabled = getSettingBoolean(settings, 'vibes_enabled', true)

    let newBalance = profileData.vibes_available
    if (vibesEnabled) {
      const { data: updatedTotal, error: vibesError } = await supabase.rpc('add_vibes', {
        p_user_id: user.id,
        p_amount: rewardBase,
        p_reason: 'daily_login',
        p_reference_type: 'daily_activity',
      })

      if (vibesError) {
        console.error('Vibes update error:', vibesError)
        return NextResponse.json(
          { error: 'Failed to update vibes' },
          { status: 500 }
        )
      }

      const updatedValue = typeof updatedTotal === 'number' ? updatedTotal : null
      if (updatedValue !== null) {
        newBalance = updatedValue
      }
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        last_seen_at: new Date().toISOString(),
      } as never)
      .eq('id', user.id)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      vibes_earned: vibesEnabled ? totalReward : 0,
      streak: profileData.streak_current,
      multiplier: multiplier,
      new_balance: newBalance,
      badges_awarded: (await evaluateBadgesForUser(supabase, user.id)).awarded,
    })
  } catch (error) {
    console.error('Daily claim error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
