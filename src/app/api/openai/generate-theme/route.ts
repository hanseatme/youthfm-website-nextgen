import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createServiceClient } from '@/lib/supabase/server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const SYSTEM_PROMPT = `Du bist der Content-Creator für einen KI-Webradiosender.
Dein Stil ist: warm, einladend, leicht poetisch, aber nicht kitschig.
Zielgruppe: 18-49 Jahre, musikaffin, offen für KI-Innovationen.

Erstelle ein Thema des Tages für den angegebenen Wochentag und die Jahreszeit.
Berücksichtige typische Aktivitäten und Stimmungen für diesen Tag.`

export async function POST(request: NextRequest) {
  try {
    // Verify admin
    const supabase = await createServiceClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    const profile = profileData as { is_admin: boolean } | null

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { date } = await request.json()
    const targetDate = new Date(date)
    const dayOfWeek = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'][targetDate.getDay()]
    const month = targetDate.getMonth()
    const season = month >= 2 && month <= 4 ? 'Frühling' :
                   month >= 5 && month <= 7 ? 'Sommer' :
                   month >= 8 && month <= 10 ? 'Herbst' : 'Winter'

    // Generate content
    const completion = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Erstelle ein Thema für ${dayOfWeek}, ${season}.

Liefere als JSON:
{
  "title": "Kreativer deutscher Titel (max 3 Worte)",
  "title_en": "Creative English title (max 3 words)",
  "teaser": "Atmosphärischer deutscher Teaser-Text (2-3 Sätze, max 200 Zeichen)",
  "teaser_en": "Atmospheric English teaser text (2-3 sentences, max 200 chars)",
  "mood_tags": ["Tag1", "Tag2", "Tag3"],
  "activity_tags": ["Aktivität1", "Aktivität2", "Aktivität3"],
  "community_question": "Offene deutsche Frage zur Diskussion",
  "community_question_en": "Open English question for discussion",
  "fun_fact": "Interessanter deutscher Fakt zum Thema",
  "fun_fact_en": "Interesting English fact about the topic",
  "image_prompt": "Detaillierter englischer Prompt für Bildgenerierung, lo-fi aesthetic, no text, no faces"
}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
    })

    const content = JSON.parse(completion.choices[0].message.content || '{}')

    // Optionally generate image
    let imageUrl = null
    if (content.image_prompt) {
      try {
        const imageResponse = await openai.images.generate({
          model: 'gpt-image-1',
          prompt: content.image_prompt,
          n: 1,
          size: '1792x1024',
          quality: 'hd',
        })
        imageUrl = imageResponse.data?.[0]?.url
      } catch (imageError) {
        console.error('Image generation failed:', imageError)
        // Continue without image
      }
    }

    return NextResponse.json({
      ...content,
      image_url: imageUrl,
    })
  } catch (error) {
    console.error('Theme generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate theme' },
      { status: 500 }
    )
  }
}
