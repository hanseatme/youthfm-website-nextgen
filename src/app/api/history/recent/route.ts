import { NextRequest, NextResponse } from 'next/server'
import { getAppSettings, getSettingString } from '@/lib/supabase/settings'

function getOrigin(url: string) {
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const settings = await getAppSettings()
    const baseUrl =
      getSettingString(settings, 'streamserver_base_url') ||
      getOrigin(getSettingString(settings, 'now_playing_api') || '') ||
      'https://yfm.hanseat.me'

    const { searchParams } = new URL(request.url)
    const limit = Math.max(1, Math.min(50, Number(searchParams.get('limit') || '10') || 10))

    const upstreamUrl = `${baseUrl.replace(/\/$/, '')}/api/history/recent?limit=${limit}`
    const upstream = await fetch(upstreamUrl, { next: { revalidate: 5 } })

    if (!upstream.ok) {
      return NextResponse.json({ error: 'Failed to fetch history' }, { status: upstream.status })
    }

    const raw = await upstream.json()
    const data = Array.isArray(raw) ? raw : (Array.isArray(raw?.value) ? raw.value : [])

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching recent history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
