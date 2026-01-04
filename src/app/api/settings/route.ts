import { NextResponse } from 'next/server'
import {
  getAppSettings,
  getSettingBoolean,
  getSettingNumber,
  getSettingString,
} from '@/lib/supabase/settings'

export async function GET() {
  const settings = await getAppSettings()

  const streamUrl =
    getSettingString(settings, 'stream_url') ||
    process.env.NEXT_PUBLIC_STREAM_URL ||
    'https://stream.hanseat.me/stream'

  const pollInterval =
    getSettingNumber(settings, 'poll_interval', 5000) ||
    Number(process.env.NEXT_PUBLIC_NOW_PLAYING_POLL_INTERVAL || 5000)

  const nowPlayingApi =
    getSettingString(settings, 'now_playing_api') ||
    getSettingString(settings, 'now_playing_url') ||
    process.env.NEXT_PUBLIC_NOW_PLAYING_API ||
    'https://yfm.hanseat.me/api/nowplaying.json'

  const streamEnabled = getSettingBoolean(settings, 'stream_enabled', true)
  const vibesEnabled = getSettingBoolean(settings, 'vibes_enabled', true)
  const vibesPerFeedback = getSettingNumber(settings, 'vibes_per_feedback', 5)
  const vibesPerFeedbackExtended = getSettingNumber(settings, 'vibes_per_feedback_extended', 9)
  const vibesPerVote = getSettingNumber(settings, 'vibes_per_vote', 20)
  const captchaEnabled = getSettingBoolean(settings, 'captcha_enabled', false)
  const captchaSiteKey = getSettingString(settings, 'captcha_site_key') || null
  const funkbookMaxCardsPerDay = getSettingNumber(settings, 'funkbook_max_cards_per_day', 2)
  const funkbookVibesPerCard = getSettingNumber(settings, 'funkbook_vibes_per_card', 5)

  return NextResponse.json({
    stream_url: streamUrl,
    now_playing_api: nowPlayingApi,
    poll_interval: pollInterval,
    stream_enabled: streamEnabled,
    vibes_enabled: vibesEnabled,
    vibes_per_feedback: vibesPerFeedback,
    vibes_per_feedback_extended: vibesPerFeedbackExtended,
    vibes_per_vote: vibesPerVote,
    captcha_enabled: captchaEnabled,
    captcha_site_key: captchaSiteKey,
    funkbook_max_cards_per_day: funkbookMaxCardsPerDay,
    funkbook_vibes_per_card: funkbookVibesPerCard,
  })
}
