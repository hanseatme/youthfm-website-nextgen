import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type RequestType = 'song_skip' | 'song_request_pool' | 'daily_dedication'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { type, message, title, artist } = body as {
    type?: RequestType
    message?: string
    title?: string
    artist?: string
  }

  if (!type || !['song_skip', 'song_request_pool', 'daily_dedication'].includes(type)) {
    return NextResponse.json({ error: 'Invalid request type' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('skip_credits, song_request_pool_credits, dedication_credits')
    .eq('id', user.id)
    .single()

  const profileData = profile as {
    skip_credits: number
    song_request_pool_credits: number
    dedication_credits: number
  } | null

  if (!profileData) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  if (type === 'song_skip' && profileData.skip_credits <= 0) {
    return NextResponse.json({ error: 'No song skip credits available' }, { status: 400 })
  }
  if (type === 'song_request_pool' && profileData.song_request_pool_credits <= 0) {
    return NextResponse.json({ error: 'No song request credits available' }, { status: 400 })
  }
  if (type === 'daily_dedication' && profileData.dedication_credits <= 0) {
    return NextResponse.json({ error: 'No dedication credits available' }, { status: 400 })
  }

  let content = ''
  if (type === 'song_skip') {
    content = '[Song-Skip] Bitte aktuellen Song ueberspringen.'
  } else if (type === 'song_request_pool') {
    const song = [title, artist].filter(Boolean).join(' - ').trim()
    if (!song) {
      return NextResponse.json({ error: 'Song title or artist is required' }, { status: 400 })
    }
    content = `[Song-Wunsch Pool] ${song}`
  } else if (type === 'daily_dedication') {
    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Dedication message is required' }, { status: 400 })
    }
    content = `[Tages-Widmung] ${message.trim()}`
  }

  if (content.length > 500) {
    return NextResponse.json({ error: 'Message too long' }, { status: 400 })
  }

  const { error: insertError } = await supabase.from('chat_messages').insert({
    user_id: user.id,
    channel: 'studio',
    content,
    status: 'active',
  } as never)

  if (insertError) {
    console.error('Studio request error:', insertError)
    return NextResponse.json({ error: 'Failed to send request' }, { status: 500 })
  }

  if (type === 'song_skip') {
    await supabase
      .from('profiles')
      .update({ skip_credits: profileData.skip_credits - 1 } as never)
      .eq('id', user.id)
  } else if (type === 'song_request_pool') {
    await supabase
      .from('profiles')
      .update({ song_request_pool_credits: profileData.song_request_pool_credits - 1 } as never)
      .eq('id', user.id)
  } else if (type === 'daily_dedication') {
    await supabase
      .from('profiles')
      .update({ dedication_credits: profileData.dedication_credits - 1 } as never)
      .eq('id', user.id)
  }

  return NextResponse.json({ success: true })
}
