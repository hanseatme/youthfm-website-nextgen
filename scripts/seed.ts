import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://192.168.178.53:8000'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createAdminUser() {
  console.log('Creating admin user...')

  let userId: string | null = null

  // Try to create user, or get existing user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: 'admin@nextgenradio.de',
    password: 'Admin123!',
    email_confirm: true,
    user_metadata: {
      display_name: 'Admin'
    }
  })

  if (authError) {
    if (authError.message.includes('already been registered')) {
      // Get existing user
      const { data: users } = await supabase.auth.admin.listUsers()
      const existingUser = users?.users?.find(u => u.email === 'admin@nextgenradio.de')
      if (existingUser) {
        userId = existingUser.id
        console.log('Admin user already exists:', userId)
      }
    } else {
      console.error('Error creating auth user:', authError)
      return null
    }
  } else {
    userId = authData.user?.id || null
    console.log('Auth user created:', userId)
  }

  if (!userId) return null

  // Create or update profile with is_admin = true
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      username: 'admin',
      display_name: 'Administrator',
      location: 'Hamburg',
      avatar_id: 1,
      is_admin: true,
      vibes_total: 10000,
      vibes_available: 10000,
      streak_current: 30,
      streak_longest: 30,
    }, { onConflict: 'id' })

  if (profileError) {
    console.error('Error creating profile:', profileError)
  } else {
    console.log('Admin profile created/updated')
  }

  return userId
}

async function createTestUsers() {
  console.log('Creating test users...')

  const testUsers = [
    { email: 'max@test.de', username: 'max_music', display_name: 'Max', location: 'Berlin' },
    { email: 'lisa@test.de', username: 'lisa_vibes', display_name: 'Lisa', location: 'München' },
    { email: 'tom@test.de', username: 'dj_tom', display_name: 'Tom', location: 'Köln' },
    { email: 'anna@test.de', username: 'anna_beats', display_name: 'Anna', location: 'Frankfurt' },
    { email: 'paul@test.de', username: 'paul_radio', display_name: 'Paul', location: 'Hamburg' },
  ]

  // Get all existing users once
  const { data: existingUsers } = await supabase.auth.admin.listUsers()

  for (const user of testUsers) {
    try {
      let userId: string | null = null

      // Check if user already exists
      const existingUser = existingUsers?.users?.find(u => u.email === user.email)

      if (existingUser) {
        userId = existingUser.id
        console.log(`User ${user.email} already exists`)
      } else {
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: 'Test123!',
          email_confirm: true,
        })

        if (authError) {
          console.error(`Error creating user ${user.email}:`, authError)
          continue
        }
        userId = authData.user!.id
      }

      // Upsert profile
      await supabase.from('profiles').upsert({
        id: userId,
        username: user.username,
        display_name: user.display_name,
        location: user.location,
        avatar_id: Math.floor(Math.random() * 6) + 1,
        vibes_total: Math.floor(Math.random() * 5000),
        vibes_available: Math.floor(Math.random() * 2000),
        streak_current: Math.floor(Math.random() * 20),
        streak_longest: Math.floor(Math.random() * 50),
      }, { onConflict: 'id' })

      console.log(`Profile created/updated: ${user.display_name}`)
    } catch (e) {
      console.error(`Error with user ${user.email}:`, e)
    }
  }
}

async function createTestSongs() {
  console.log('Creating test songs...')

  const songs = [
    { title: 'Summer Vibes', artist: 'DJ Sunset', duration_seconds: 210 },
    { title: 'Night Drive', artist: 'Synthwave Collective', duration_seconds: 245 },
    { title: 'Coffee Morning', artist: 'Lo-Fi Beats', duration_seconds: 180 },
    { title: 'Urban Dreams', artist: 'City Sounds', duration_seconds: 225 },
    { title: 'Ocean Waves', artist: 'Chill Masters', duration_seconds: 300 },
    { title: 'Electric Heart', artist: 'Neon Pulse', duration_seconds: 195 },
    { title: 'Midnight Jazz', artist: 'Smooth Trio', duration_seconds: 270 },
    { title: 'Rainy Days', artist: 'Acoustic Soul', duration_seconds: 240 },
    { title: 'Dance Floor', artist: 'Beat Makers', duration_seconds: 215 },
    { title: 'Sunset Boulevard', artist: 'Retro Wave', duration_seconds: 255 },
  ]

  const { data, error } = await supabase.from('songs').insert(songs).select()

  if (error) {
    console.error('Error creating songs:', error)
    return []
  }

  console.log(`Created ${data.length} songs`)
  return data
}

async function createTestDuel(songIds: string[]) {
  console.log('Creating test duel...')

  if (songIds.length < 2) {
    console.log('Not enough songs for duel')
    return
  }

  const { data, error } = await supabase.from('duels').insert({
    song_a_id: songIds[0],
    song_b_id: songIds[1],
    duel_type: 'classic',
    status: 'active',
    started_at: new Date().toISOString(),
    votes_a: 12,
    votes_b: 8,
  }).select()

  if (error) {
    console.error('Error creating duel:', error)
  } else {
    console.log('Created active duel')
  }
}

async function createDailyTheme() {
  console.log('Creating daily theme...')

  const today = new Date().toISOString().split('T')[0]

  const { error } = await supabase.from('daily_themes').insert({
    date: today,
    title: 'Winterliche Gemütlichkeit',
    title_en: 'Winter Coziness',
    teaser: 'Der perfekte Soundtrack für kalte Tage. Kuschel dich ein und genieße entspannte Beats.',
    teaser_en: 'The perfect soundtrack for cold days. Cuddle up and enjoy relaxed beats.',
    mood_tags: ['relaxed', 'cozy', 'warm'],
    activity_tags: ['reading', 'coffee', 'home'],
    community_question: 'Was ist dein Lieblings-Wintergetränk?',
    community_question_en: 'What is your favorite winter drink?',
    fun_fact: 'Musik mit langsamem Tempo kann nachweislich den Blutdruck senken.',
    fun_fact_en: 'Slow-tempo music has been proven to lower blood pressure.',
    image_url: 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=1200',
  })

  if (error) {
    console.error('Error creating theme:', error)
  } else {
    console.log('Created daily theme for', today)
  }
}

async function createBadges() {
  console.log('Creating badges...')

  const badges = [
    { slug: 'first_listen', name: 'Erster Kontakt', name_en: 'First Contact', description: 'Höre deinen ersten Song', description_en: 'Listen to your first song', icon: '🎧', category: 'listening', condition_type: 'songs_listened', condition_value: { count: 1 }, vibes_reward: 10 },
    { slug: 'feedback_master', name: 'Feedback-Meister', name_en: 'Feedback Master', description: 'Gib 50 Song-Feedbacks', description_en: 'Give 50 song feedbacks', icon: '⭐', category: 'feedback', condition_type: 'feedbacks_given', condition_value: { count: 50 }, vibes_reward: 100 },
    { slug: 'duel_champion', name: 'Duell-Champion', name_en: 'Duel Champion', description: 'Gewinne 10 Duelle', description_en: 'Win 10 duels', icon: '🏆', category: 'duel', condition_type: 'duels_won', condition_value: { count: 10 }, vibes_reward: 200 },
    { slug: 'streak_starter', name: 'Streak-Starter', name_en: 'Streak Starter', description: 'Halte einen 7-Tage-Streak', description_en: 'Keep a 7-day streak', icon: '🔥', category: 'streak', condition_type: 'streak_days', condition_value: { count: 7 }, vibes_reward: 50 },
    { slug: 'community_member', name: 'Community-Mitglied', name_en: 'Community Member', description: 'Folge 5 anderen Nutzern', description_en: 'Follow 5 other users', icon: '👥', category: 'community', condition_type: 'following_count', condition_value: { count: 5 }, vibes_reward: 25 },
  ]

  const { error } = await supabase.from('badges').insert(badges)

  if (error) {
    console.error('Error creating badges:', error)
  } else {
    console.log(`Created ${badges.length} badges`)
  }
}

async function createShopItems() {
  console.log('Creating shop items...')

  const items = [
    { slug: 'song_skip', name: 'Song-Skip', name_en: 'Song Skip', description: 'Überspringe den aktuellen Song', description_en: 'Skip the current song', category: 'influence', cost_vibes: 50 },
    { slug: 'priority_vote', name: 'Prioritäts-Vote', name_en: 'Priority Vote', description: 'Dein Vote zählt doppelt beim nächsten Duell', description_en: 'Your vote counts double in the next duel', category: 'influence', cost_vibes: 100 },
    { slug: 'custom_color', name: 'Namensfarbe', name_en: 'Name Color', description: 'Wähle eine eigene Farbe für deinen Namen', description_en: 'Choose a custom color for your name', category: 'personalization', cost_vibes: 200 },
    { slug: 'vip_badge', name: 'VIP-Badge', name_en: 'VIP Badge', description: 'Zeige einen VIP-Badge neben deinem Namen', description_en: 'Show a VIP badge next to your name', category: 'status', cost_vibes: 500 },
    { slug: 'streak_freeze', name: 'Streak-Freeze', name_en: 'Streak Freeze', description: 'Erhalte einen zusätzlichen Streak-Freeze', description_en: 'Get an additional streak freeze', category: 'extras', cost_vibes: 75 },
  ]

  const { error } = await supabase.from('shop_items').insert(items)

  if (error) {
    console.error('Error creating shop items:', error)
  } else {
    console.log(`Created ${items.length} shop items`)
  }
}

async function createAvatars() {
  console.log('Creating predefined avatars...')

  const avatars = [
    { id: 1, name: 'Default', image_url: '/avatars/1.png', category: 'standard', sort_order: 1 },
    { id: 2, name: 'Cool Cat', image_url: '/avatars/2.png', category: 'standard', sort_order: 2 },
    { id: 3, name: 'Happy Face', image_url: '/avatars/3.png', category: 'standard', sort_order: 3 },
    { id: 4, name: 'Music Lover', image_url: '/avatars/4.png', category: 'standard', sort_order: 4 },
    { id: 5, name: 'Star', image_url: '/avatars/5.png', category: 'standard', sort_order: 5 },
    { id: 6, name: 'Wave', image_url: '/avatars/6.png', category: 'standard', sort_order: 6 },
  ]

  const { error } = await supabase.from('predefined_avatars').upsert(avatars)

  if (error) {
    console.error('Error creating avatars:', error)
  } else {
    console.log(`Created ${avatars.length} avatars`)
  }
}

async function createAppSettings() {
  console.log('Creating app settings...')

  const settings = [
    { key: 'stream_enabled', value: true, description: 'Stream aktiv' },
    { key: 'stream_url', value: 'https://stream.hanseat.me/stream', description: 'Stream URL' },
    { key: 'now_playing_url', value: 'https://yfm.hanseat.me/api/nowplaying.json', description: 'Now Playing API URL' },
    { key: 'vibes_enabled', value: true, description: 'Vibes-System aktiv' },
    { key: 'vibes_per_feedback', value: 5, description: 'Vibes pro Feedback' },
    { key: 'vibes_per_vote', value: 3, description: 'Vibes pro Duell-Vote' },
    { key: 'streaks_enabled', value: true, description: 'Streak-System aktiv' },
    { key: 'streak_min_minutes', value: 10, description: 'Minimum Minuten für Streak' },
    { key: 'duels_enabled', value: true, description: 'Duelle aktiv' },
    { key: 'duel_duration_hours', value: 24, description: 'Duell-Dauer in Stunden' },
    { key: 'chat_enabled', value: true, description: 'Chat aktiv' },
    { key: 'chat_cooldown', value: 5, description: 'Chat-Cooldown in Sekunden' },
  ]

  const { error } = await supabase.from('app_settings').upsert(settings, { onConflict: 'key' })

  if (error) {
    console.error('Error creating settings:', error)
  } else {
    console.log(`Created ${settings.length} app settings`)
  }
}

async function main() {
  console.log('='.repeat(50))
  console.log('Next Generation Radio - Database Seeder')
  console.log('='.repeat(50))
  console.log('')

  try {
    // Create admin user
    await createAdminUser()

    // Create test users
    await createTestUsers()

    // Create songs
    const songs = await createTestSongs()

    // Create duel
    if (songs.length >= 2) {
      await createTestDuel(songs.map(s => s.id))
    }

    // Create daily theme
    await createDailyTheme()

    // Create badges
    await createBadges()

    // Create shop items
    await createShopItems()

    // Create avatars
    await createAvatars()

    // Create app settings
    await createAppSettings()

    console.log('')
    console.log('='.repeat(50))
    console.log('Seeding complete!')
    console.log('')
    console.log('Admin Login:')
    console.log('  Email: admin@nextgenradio.de')
    console.log('  Password: Admin123!')
    console.log('')
    console.log('Test User Login:')
    console.log('  Email: max@test.de')
    console.log('  Password: Test123!')
    console.log('='.repeat(50))

  } catch (error) {
    console.error('Fatal error during seeding:', error)
    process.exit(1)
  }
}

main()
