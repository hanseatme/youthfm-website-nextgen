import { NextResponse } from 'next/server'
import { getAppSettings, getSettingNumber, getSettingString } from '@/lib/supabase/settings'

// GET now playing data from external API
export async function GET() {
  try {
    const settings = await getAppSettings()
    const nowPlayingUrl =
      getSettingString(settings, 'now_playing_api') ||
      getSettingString(settings, 'now_playing_url') ||
      process.env.NEXT_PUBLIC_NOW_PLAYING_API ||
      'https://yfm.hanseat.me/api/nowplaying.json'
    const pollInterval =
      getSettingNumber(settings, 'poll_interval', 5000) ||
      Number(process.env.NEXT_PUBLIC_NOW_PLAYING_POLL_INTERVAL || 5000)
    const revalidateSeconds = Math.max(1, Math.floor(pollInterval / 1000))

    const response = await fetch(nowPlayingUrl, {
      next: { revalidate: revalidateSeconds },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch now playing data' },
        { status: response.status }
      )
    }

    const data = await response.json()

    let payload = {
      title: 'Unknown Title',
      artist: 'Unknown Artist',
      artwork: null as string | null,
      listeners: null as number | null,
      elapsed: 0,
      duration: 0,
      remaining: 0,
      started_at: null as string | null,
      show: null as string | null,
      station: 'Next Generation Radio',
      category: null as string | null,
      moderator: null as { name: string; avatar: string | null; isLive: boolean } | null,
    }

    if (data?.now_playing) {
      const category = data.now_playing.song?.custom_fields?.category || data.now_playing.song?.category
      const isMusic = category === 'music'

      payload = {
        ...payload,
        title: isMusic ? (data.now_playing.song?.title || 'Unknown Title') : 'Kurze Unterbrechung...',
        artist: isMusic ? (data.now_playing.song?.artist || 'Unknown Artist') : 'Youth FM',
        artwork: data.now_playing.song?.art || null,
        listeners: data.listeners?.current ?? null,
        elapsed: data.now_playing.elapsed || 0,
        duration: data.now_playing.duration || 0,
        remaining: data.now_playing.remaining || 0,
        started_at: data.now_playing.started_at || null,
        show: data.now_playing.show?.name || null,
        station: data.station?.name || payload.station,
        category: category || null,
        moderator: data.live
          ? {
              name: data.live.streamer_name || 'DJ',
              avatar: data.live.art || null,
              isLive: !!data.live.is_live,
            }
          : {
              name: 'AutoDJ',
              avatar: null,
              isLive: false,
            },
      }
    } else if (data?.title) {
      const category = data.custom_fields?.category || data.category
      const isMusic = category === 'music'

      payload = {
        ...payload,
        title: isMusic ? data.title : 'Kurze Unterbrechung...',
        artist: isMusic ? (data.artist || 'Unknown Artist') : 'Youth FM',
        artwork: data.artwork || data.artwork_url || null,
        listeners: data.listeners || null,
        elapsed: data.elapsed || 0,
        duration: data.duration || 0,
        remaining: data.remaining || 0,
        started_at: data.started_at || null,
        show: data.show || null,
        station: data.station || payload.station,
        category: category || null,
      }
    }

    return NextResponse.json({
      ...payload,
      artwork_url: payload.artwork,
      poll_interval: pollInterval,
    })
  } catch (error) {
    console.error('Error fetching now playing:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
