import { NextRequest, NextResponse } from 'next/server'
import { getAppSettings, getSettingString } from '@/lib/supabase/settings'
import { createServiceClient } from '@/lib/supabase/server'

function getOrigin(url: string) {
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params
  const id = Number(idParam)
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const settings = await getAppSettings()
  const baseUrl =
    getSettingString(settings, 'streamserver_base_url') ||
    getOrigin(getSettingString(settings, 'now_playing_api') || '') ||
    'https://yfm.hanseat.me'

  const upstreamUrl = `${baseUrl.replace(/\/$/, '')}/api/preview/${id}`

  let headers: Record<string, string> = {}
  try {
    const supabase = await createServiceClient()
    const { data: privateRow } = await supabase
      .from('private_settings')
      .select('value')
      .eq('key', 'streamserver_api_key')
      .single()

    const apiKey = (privateRow as { value: unknown } | null)?.value
    if (typeof apiKey === 'string' && apiKey.length > 0) {
      headers = { 'X-API-Key': apiKey }
    }
  } catch {
    // No key available (or not needed for previews)
  }

  const upstream = await fetch(upstreamUrl, { headers })
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: 'Failed to fetch preview' }, { status: upstream.status || 502 })
  }

  const contentType = upstream.headers.get('content-type') || 'audio/mpeg'
  const responseHeaders = new Headers()
  responseHeaders.set('Content-Type', contentType)
  responseHeaders.set('Cache-Control', 'public, max-age=3600')

  return new NextResponse(upstream.body, { status: 200, headers: responseHeaders })
}
