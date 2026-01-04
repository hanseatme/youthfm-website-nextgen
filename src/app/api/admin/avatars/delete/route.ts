import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Use service role client for storage operations
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { searchParams } = new URL(request.url)
    const avatarId = searchParams.get('id')

    if (!avatarId) {
      return NextResponse.json({ error: 'Avatar ID required' }, { status: 400 })
    }

    const avatarIdNum = Number(avatarId)
    if (!Number.isFinite(avatarIdNum)) {
      return NextResponse.json({ error: 'Invalid avatar ID' }, { status: 400 })
    }

    // Get avatar info
    const { data: avatar, error: fetchError } = await supabase
      .from('avatars')
      .select('file_path')
      .eq('id', avatarIdNum)
      .single()

    if (fetchError || !avatar) {
      return NextResponse.json({ error: 'Avatar not found' }, { status: 404 })
    }

    // Check if avatar is in use
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('avatar_id', avatarIdNum)

    if (count && count > 0) {
      return NextResponse.json({
        error: `Cannot delete avatar. It is currently used by ${count} user(s).`
      }, { status: 400 })
    }

    // Delete from storage using service role
    const { error: storageError } = await supabaseAdmin.storage
      .from('avatars')
      .remove([avatar.file_path])

    if (storageError) {
      console.error('Storage delete error:', storageError)
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('avatars')
      .delete()
      .eq('id', avatarIdNum)

    if (deleteError) {
      console.error('Database delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete avatar' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Avatar delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
