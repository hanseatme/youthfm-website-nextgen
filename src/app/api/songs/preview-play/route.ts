import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json().catch(() => ({}))
    const songId = (body as { song_id?: unknown })?.song_id

    if (typeof songId !== 'string' || !UUID_RE.test(songId)) {
      return NextResponse.json({ error: 'song_id is required' }, { status: 400 })
    }

    const { error } = await supabase.rpc('increment_song_preview_play', { p_song_id: songId })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error recording preview play:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

