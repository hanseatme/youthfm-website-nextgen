import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, session_id } = body as { action?: 'start' | 'end'; session_id?: string }

    if (action === 'start') {
      const { data, error } = await supabase
        .from('listening_sessions')
        .insert({
          user_id: user.id,
          started_at: new Date().toISOString(),
          songs_heard: 0,
        } as never)
        .select('id')
        .single()

      if (error || !data) {
        return NextResponse.json({ error: 'Failed to start session' }, { status: 500 })
      }

      return NextResponse.json({ session_id: data.id })
    }

    if (action === 'end') {
      if (!session_id) {
        return NextResponse.json({ error: 'session_id is required' }, { status: 400 })
      }

      const { data: session } = await supabase
        .from('listening_sessions')
        .select('id, started_at, ended_at')
        .eq('id', session_id)
        .eq('user_id', user.id)
        .single()

      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      }

      if (session.ended_at) {
        return NextResponse.json({ ok: true })
      }

      const startedAt = new Date(session.started_at)
      const minutes = Math.max(1, Math.ceil((Date.now() - startedAt.getTime()) / 60000))

      const { error: updateError } = await supabase
        .from('listening_sessions')
        .update({
          ended_at: new Date().toISOString(),
          duration_minutes: minutes,
        } as never)
        .eq('id', session_id)
        .eq('user_id', user.id)
        .is('ended_at', null)

      if (updateError) {
        return NextResponse.json({ error: 'Failed to end session' }, { status: 500 })
      }

      await supabase.rpc('update_user_streak', {
        p_user_id: user.id,
        p_minutes_listened: minutes,
      })

      return NextResponse.json({ ok: true, minutes })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Listening track error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
