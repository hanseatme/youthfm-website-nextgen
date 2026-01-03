import { unstable_cache } from 'next/cache'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

type SettingsMap = Record<string, unknown>

const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

async function fetchSettings(): Promise<SettingsMap> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('key, value')

  if (error || !data) {
    return {}
  }

  const settings: SettingsMap = {}
  for (const item of data as { key: string; value: unknown }[]) {
    settings[item.key] = item.value
  }

  return settings
}

export const getAppSettings = unstable_cache(fetchSettings, ['app_settings'], {
  revalidate: 60,
})

export function getSettingString(
  settings: SettingsMap,
  key: string,
  fallback?: string
) {
  const value = settings[key]
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return fallback
}

export function getSettingNumber(
  settings: SettingsMap,
  key: string,
  fallback?: number
) {
  const value = settings[key]
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

export function getSettingBoolean(
  settings: SettingsMap,
  key: string,
  fallback?: boolean
) {
  const value = settings[key]
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true
    if (value.toLowerCase() === 'false') return false
  }
  return fallback
}
