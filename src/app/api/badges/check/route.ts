import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { evaluateBadgesForUser } from '@/lib/badges/evaluate'

export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await evaluateBadgesForUser(supabase, user.id)

  return NextResponse.json({
    success: true,
    awarded: result.awarded,
    checked: result.checked,
  })
}
