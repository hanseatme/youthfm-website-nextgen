import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getAppSettings, getSettingBoolean, getSettingString } from '@/lib/supabase/settings'

function validateUsername(username: string) {
  const trimmed = username.trim()
  if (trimmed.length < 3 || trimmed.length > 30) return { ok: false as const, error: 'Username must be 3-30 characters' }
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) return { ok: false as const, error: 'Username may only contain letters, numbers and _' }
  return { ok: true as const, value: trimmed }
}

async function verifyTurnstile(secret: string, token: string, ip: string | null) {
  const form = new URLSearchParams()
  form.set('secret', secret)
  form.set('response', token)
  if (ip) form.set('remoteip', ip)

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  })

  if (!res.ok) return { ok: false as const }
  const data = await res.json().catch(() => null) as { success?: boolean } | null
  return { ok: Boolean(data?.success) as boolean }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      email,
      password,
      username,
      display_name,
      first_name,
      accept_terms,
      accept_privacy,
      captcha_token,
      locale,
    } = body as Record<string, unknown>

    if (typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }
    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }
    if (typeof display_name !== 'string' || display_name.trim().length < 2) {
      return NextResponse.json({ error: 'Display name is required' }, { status: 400 })
    }
    if (accept_terms !== true || accept_privacy !== true) {
      return NextResponse.json({ error: 'Terms and privacy must be accepted' }, { status: 400 })
    }

    const usernameResult = typeof username === 'string' ? validateUsername(username) : { ok: false as const, error: 'Username is required' }
    if (!usernameResult.ok) {
      return NextResponse.json({ error: usernameResult.error }, { status: 400 })
    }

    const settings = await getAppSettings()
    const captchaEnabled = getSettingBoolean(settings, 'captcha_enabled', false)

    if (captchaEnabled) {
      if (typeof captcha_token !== 'string' || captcha_token.length < 10) {
        return NextResponse.json({ error: 'Captcha is required' }, { status: 400 })
      }

      const supabase = await createServiceClient()
      const { data: secretRow } = await supabase
        .from('private_settings')
        .select('value')
        .eq('key', 'captcha_secret_key')
        .maybeSingle()

      const secret = (secretRow as { value?: unknown } | null)?.value
      if (typeof secret !== 'string' || secret.length < 10) {
        return NextResponse.json({ error: 'Captcha is not configured' }, { status: 500 })
      }

      const ip = request.headers.get('x-forwarded-for')?.split(',')?.[0]?.trim() || null
      const ok = await verifyTurnstile(secret, captcha_token, ip)
      if (!ok.ok) {
        return NextResponse.json({ error: 'Captcha verification failed' }, { status: 400 })
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: 'Supabase is not configured' }, { status: 500 })
    }

    const emailRedirectTo = typeof locale === 'string' && locale.length > 0
      ? `${request.nextUrl.origin}/${locale}/callback`
      : `${request.nextUrl.origin}/callback`

    const signupRes = await fetch(`${supabaseUrl}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        data: {
          display_name: display_name.trim(),
          username: usernameResult.value,
          first_name: typeof first_name === 'string' ? first_name.trim() : '',
          accepted_terms: true,
          accepted_privacy: true,
        },
        options: {
          emailRedirectTo,
        },
      }),
    })

    const signupJson = await signupRes.json().catch(() => null)
    if (!signupRes.ok) {
      const message =
        (signupJson && typeof signupJson === 'object' && 'msg' in signupJson && typeof (signupJson as any).msg === 'string')
          ? (signupJson as any).msg
          : (signupJson && typeof signupJson === 'object' && 'message' in signupJson && typeof (signupJson as any).message === 'string')
            ? (signupJson as any).message
            : 'Registration failed'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const captchaSiteKey = getSettingString(settings, 'captcha_site_key') || null

    return NextResponse.json({ ok: true, captcha_enabled: captchaEnabled, captcha_site_key: captchaSiteKey })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

