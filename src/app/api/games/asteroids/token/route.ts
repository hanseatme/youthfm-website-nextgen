import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

// Simple JWT implementation without external dependencies
function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function createHmacSignature(data: string, secret: string): string {
  const crypto = require('crypto')
  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function createJWT(
  payload: Record<string, unknown>,
  secret: string,
  expiresInSeconds: number = 300
): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  }

  const now = Math.floor(Date.now() / 1000)
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  }

  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload))
  const signature = createHmacSignature(`${encodedHeader}.${encodedPayload}`, secret)

  return `${encodedHeader}.${encodedPayload}.${signature}`
}

export async function POST(request: NextRequest) {
  try {
    // Get the current user
    const supabase = (await createClient()) as any
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const roomId = body.roomId

    if (!roomId || typeof roomId !== 'string') {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 })
    }

    // Get user's profile for display name and color
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('id', user.id)
      .single()

    const displayName = profile?.display_name || profile?.username || null

    // Verify the user is a member of the room
    const { data: roomPlayer, error: roomError } = await supabase
      .from('asteroids_room_players')
      .select('room_id, color')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .is('left_at', null)
      .single()

    if (roomError || !roomPlayer) {
      return NextResponse.json({ error: 'Not a member of this room' }, { status: 403 })
    }

    // Get the game server API key from private settings
    const serviceClient = (await createServiceClient()) as any
    const { data: apiKeyRow, error: keyError } = await serviceClient
      .from('private_settings')
      .select('value')
      .eq('key', 'gameserver_api_key')
      .single()

    if (keyError || !apiKeyRow?.value) {
      return NextResponse.json(
        { error: 'Game server not configured' },
        { status: 503 }
      )
    }

    const apiKey = String(apiKeyRow.value)
    if (!apiKey || apiKey.length < 16) {
      return NextResponse.json(
        { error: 'Game server API key not configured properly' },
        { status: 503 }
      )
    }

    // Create JWT token
    const token = createJWT(
      {
        userId: user.id,
        roomId,
        displayName,
        color: roomPlayer.color || '#00ffff',
        type: 'asteroids',
      },
      apiKey,
      3600 // 1 hour (supports reconnects during longer sessions)
    )

    return NextResponse.json({ token })
  } catch (error) {
    console.error('Failed to generate game server token:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
