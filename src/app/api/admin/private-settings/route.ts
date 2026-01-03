import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

async function requireAdmin(supabase: Awaited<ReturnType<typeof createServiceClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, status: 401 as const }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  const isAdmin = (profile as { is_admin: boolean } | null)?.is_admin
  if (!isAdmin) return { ok: false as const, status: 403 as const }

  return { ok: true as const }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceClient()
    const auth = await requireAdmin(supabase)
    if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

    const { searchParams } = new URL(request.url)
    const keysParam = searchParams.get('keys') || ''
    const keys = keysParam
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)

    if (keys.length === 0) {
      return NextResponse.json({ error: 'keys query param is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('private_settings')
      .select('key, value')
      .in('key', keys)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const settings: Record<string, unknown> = {}
    for (const row of (data || []) as Array<{ key: string; value: unknown }>) {
      settings[row.key] = row.value
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error fetching private settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServiceClient()
    const auth = await requireAdmin(supabase)
    if (!auth.ok) return NextResponse.json({ error: 'Forbidden' }, { status: auth.status })

    const body = await request.json()
    const { key, value } = body as { key?: string; value?: unknown }

    if (!key || typeof key !== 'string') {
      return NextResponse.json({ error: 'key is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('private_settings')
      .upsert({
        key,
        value,
        updated_at: new Date().toISOString(),
      } as never, { onConflict: 'key' })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error updating private settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

