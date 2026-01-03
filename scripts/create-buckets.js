const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'http://192.168.178.53:8000'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q'

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createBuckets() {
  console.log('🚀 Creating storage buckets...\n')

  try {
    // Create avatars bucket
    console.log('📦 Creating avatars bucket...')
    const { data: avatarsBucket, error: avatarsError } = await supabase.storage.createBucket('avatars', {
      public: true,
      fileSizeLimit: 2097152, // 2MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    })

    if (avatarsError) {
      if (avatarsError.message.includes('already exists')) {
        console.log('  ⚠️  Bucket already exists')
      } else {
        console.log('  ❌ Error:', avatarsError.message)
      }
    } else {
      console.log('  ✅ Success!')
    }

    // Create theme-images bucket
    console.log('\n📦 Creating theme-images bucket...')
    const { data: themesBucket, error: themesError } = await supabase.storage.createBucket('theme-images', {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    })

    if (themesError) {
      if (themesError.message.includes('already exists')) {
        console.log('  ⚠️  Bucket already exists')
      } else {
        console.log('  ❌ Error:', themesError.message)
      }
    } else {
      console.log('  ✅ Success!')
    }

    console.log('\n✅ Storage buckets created!\n')

  } catch (error) {
    console.error('❌ Failed:', error)
    process.exit(1)
  }
}

createBuckets()
