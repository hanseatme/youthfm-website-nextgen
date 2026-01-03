import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('vibes_transactions')
    .select('id, amount, reason, reference_type, reference_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('Failed to load vibes transactions:', error)
    return NextResponse.json({ error: 'Failed to load transactions' }, { status: 500 })
  }

  return NextResponse.json({ transactions: data ?? [] })
}
