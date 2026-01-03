import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// GET all themes
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceClient()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const { data, error, count } = await supabase
      .from('daily_themes')
      .select('*', { count: 'exact' })
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data, count })
  } catch (error) {
    console.error('Error fetching themes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST new theme
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServiceClient()

    // Verify admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    const profileData = profile as { is_admin: boolean } | null
    if (!profileData?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { date, title, title_en, teaser, teaser_en, image_url, mood_tags, activity_tags, community_question, community_question_en, fun_fact, fun_fact_en } = body

    if (!date || !title) {
      return NextResponse.json({ error: 'Date and title are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('daily_themes')
      .upsert({
        date,
        title,
        title_en,
        teaser,
        teaser_en,
        image_url,
        mood_tags,
        activity_tags,
        community_question,
        community_question_en,
        fun_fact,
        fun_fact_en,
      } as never, { onConflict: 'date' })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error creating theme:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH/PUT update existing theme
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServiceClient()

    // Verify admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    const profileData = profile as { is_admin: boolean } | null
    if (!profileData?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { id, date, title, title_en, teaser, teaser_en, image_url } = body

    if (!id || !date || !title) {
      return NextResponse.json({ error: 'ID, date and title are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('daily_themes')
      .update({
        date,
        title,
        title_en: title_en || null,
        teaser: teaser || null,
        teaser_en: teaser_en || null,
        image_url: image_url || null,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error updating theme:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
