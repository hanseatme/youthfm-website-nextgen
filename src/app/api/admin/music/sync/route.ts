import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getAppSettings, getSettingString } from '@/lib/supabase/settings'

type StreamserverTrack = {
  id: number
  title: string
  artist?: string | null
  duration?: number | null
  is_active?: boolean | null
}

function getOrigin(url: string) {
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

export async function POST() {
  try {
    const supabase = await createServiceClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    const isAdmin = (profile as { is_admin: boolean } | null)?.is_admin
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const settings = await getAppSettings()
    const baseUrl =
      getSettingString(settings, 'streamserver_base_url') ||
      getOrigin(getSettingString(settings, 'now_playing_api') || '') ||
      'https://yfm.hanseat.me'

    const { data: privateRow } = await supabase
      .from('private_settings')
      .select('value')
      .eq('key', 'streamserver_api_key')
      .single()

    const apiKey = (privateRow as { value: unknown } | null)?.value
    const apiKeyString = typeof apiKey === 'string' ? apiKey : ''
    if (!apiKeyString) {
      return NextResponse.json({ error: 'Missing streamserver API key' }, { status: 400 })
    }

    const url = `${baseUrl.replace(/\/$/, '')}/api/files/music`
    const headers = { 'X-API-Key': apiKeyString }

    const response = await fetch(url, { method: 'GET', headers })
    const fallbackResponse = !response.ok
      ? await fetch(url, { method: 'POST', headers })
      : null

    const finalResponse = response.ok ? response : fallbackResponse!
    if (!finalResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch music list' }, { status: finalResponse.status })
    }

    const raw = await finalResponse.json()
    const tracks: StreamserverTrack[] =
      Array.isArray(raw) ? raw :
      Array.isArray(raw?.value) ? raw.value :
      Array.isArray(raw?.data) ? raw.data :
      []

    if (!Array.isArray(tracks) || tracks.length === 0) {
      return NextResponse.json({ error: 'No tracks returned' }, { status: 502 })
    }

    const upsertRows = tracks
      .filter((t) => typeof t?.id === 'number' && typeof t?.title === 'string')
      .map((t) => ({
        track_id: t.id,
        external_id: String(t.id),
        title: t.title,
        artist: t.artist ?? null,
        duration_seconds: Number.isFinite(Number(t.duration)) ? Math.round(Number(t.duration)) : null,
        preview_url: `/api/preview/${t.id}`,
        is_active: t.is_active ?? true,
      }))

    const { error: upsertError } = await supabase
      .from('songs')
      .upsert(upsertRows as never, { onConflict: 'track_id' })

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, synced: upsertRows.length })
  } catch (error) {
    console.error('Error syncing music:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
