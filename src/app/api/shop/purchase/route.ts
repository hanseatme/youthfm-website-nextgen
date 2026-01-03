import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST purchase shop item
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { item_id } = body

    if (!item_id) {
      return NextResponse.json({ error: 'item_id is required' }, { status: 400 })
    }

    // Get the shop item
    const { data: item, error: itemError } = await supabase
      .from('shop_items')
      .select('*')
      .eq('id', item_id)
      .eq('is_available', true)
      .single()

    if (itemError || !item) {
      return NextResponse.json({ error: 'Item not found or unavailable' }, { status: 404 })
    }

    const shopItem = item as {
      id: string
      cost_vibes: number
      stock_limit: number | null
      name: string
      metadata?: Record<string, unknown> | null
    }

    const metadata = (shopItem.metadata || {}) as Record<string, unknown>
    const itemType = typeof metadata.type === 'string' ? metadata.type : null
    const isRepeatable = metadata.repeatable === true
    const parsedAmount = Number(metadata.amount || 1)
    const amount = Number.isFinite(parsedAmount) ? parsedAmount : 1

    // Check stock if limited
    if (shopItem.stock_limit !== null) {
      const { count } = await supabase
        .from('user_purchases')
        .select('*', { count: 'exact', head: true })
        .eq('item_id', item_id)

      if (count !== null && count >= shopItem.stock_limit) {
        return NextResponse.json({ error: 'Item out of stock' }, { status: 400 })
      }
    }

    // Check if user already purchased (for one-time items)
    if (!isRepeatable) {
      const { data: existingPurchase } = await supabase
        .from('user_purchases')
        .select('id')
        .eq('item_id', item_id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (existingPurchase) {
        return NextResponse.json({ error: 'Already purchased this item' }, { status: 400 })
      }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('streak_freezes, avatar_tier, badge_showcase_slots, banner_unlocked, skip_credits, song_request_pool_credits, dedication_credits')
      .eq('id', user.id)
      .single()

    const profileData = profile as {
      streak_freezes: number
      avatar_tier: string
      badge_showcase_slots: number
      banner_unlocked: boolean
      skip_credits: number
      song_request_pool_credits: number
      dedication_credits: number
    } | null

    if (!profileData) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (itemType === 'profile_banner' && profileData.banner_unlocked) {
      return NextResponse.json({ error: 'Profile banner already unlocked' }, { status: 400 })
    }

    if (itemType === 'avatar_set' && metadata.tier === 'premium' && profileData.avatar_tier === 'premium') {
      return NextResponse.json({ error: 'Premium avatars already unlocked' }, { status: 400 })
    }

    if (itemType === 'avatar_set' && metadata.tier === 'standard' && profileData.avatar_tier !== 'standard') {
      // If already premium, no need to buy standard
      return NextResponse.json({ error: 'Avatar set already unlocked' }, { status: 400 })
    }

    if (itemType === 'badge_showcase') {
      const slots = Number(metadata.slots || 3)
      if (profileData.badge_showcase_slots >= slots) {
        return NextResponse.json({ error: 'Badge showcase already unlocked' }, { status: 400 })
      }
    }

    const { data: spendOk, error: spendError } = await supabase.rpc('spend_vibes', {
      p_user_id: user.id,
      p_amount: shopItem.cost_vibes,
      p_reason: `purchase_${shopItem.name}`,
      p_reference_type: 'shop_purchase',
      p_reference_id: item_id,
    })

    if (spendError) {
      console.error('Spend error:', spendError)
      return NextResponse.json({ error: 'Failed to spend vibes' }, { status: 500 })
    }

    if (!spendOk) {
      return NextResponse.json({ error: 'Not enough vibes' }, { status: 400 })
    }

    // Record the purchase
    const { data: purchase, error: purchaseError } = await supabase
      .from('user_purchases')
      .insert({
        user_id: user.id,
        item_id: item_id,
        cost_vibes: shopItem.cost_vibes,
        metadata: shopItem.metadata ?? null,
      } as never)
      .select()
      .single()

    if (purchaseError) {
      console.error('Purchase error:', purchaseError)
      return NextResponse.json({ error: 'Failed to record purchase' }, { status: 500 })
    }

    if (itemType) {
      if (itemType === 'streak_freeze') {
        await supabase
          .from('profiles')
          .update({ streak_freezes: profileData.streak_freezes + amount } as never)
          .eq('id', user.id)
      } else if (itemType === 'song_skip') {
        await supabase
          .from('profiles')
          .update({ skip_credits: profileData.skip_credits + amount } as never)
          .eq('id', user.id)
      } else if (itemType === 'song_request_pool') {
        await supabase
          .from('profiles')
          .update({ song_request_pool_credits: profileData.song_request_pool_credits + amount } as never)
          .eq('id', user.id)
      } else if (itemType === 'daily_dedication') {
        await supabase
          .from('profiles')
          .update({ dedication_credits: profileData.dedication_credits + amount } as never)
          .eq('id', user.id)
      } else if (itemType === 'avatar_set') {
        const tier = metadata.tier === 'premium' ? 'premium' : 'standard'
        await supabase
          .from('profiles')
          .update({ avatar_tier: tier } as never)
          .eq('id', user.id)
      } else if (itemType === 'badge_showcase') {
        const slots = Number(metadata.slots || 3)
        await supabase
          .from('profiles')
          .update({ badge_showcase_slots: slots } as never)
          .eq('id', user.id)
      } else if (itemType === 'profile_banner') {
        await supabase
          .from('profiles')
          .update({ banner_unlocked: true } as never)
          .eq('id', user.id)
      } else if (itemType === 'vip_badge') {
        await supabase.rpc('award_badge', {
          p_user_id: user.id,
          p_badge_slug: 'vip-badge',
        })
      }
    }

    return NextResponse.json({
      success: true,
      purchase,
      message: 'Purchase successful'
    })
  } catch (error) {
    console.error('Error processing purchase:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
