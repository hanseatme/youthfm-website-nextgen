const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://192.168.178.53:8000'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseKey) {
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY not found in environment')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  console.log('Running storage migration...')

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '00005_storage_buckets.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    console.log('Migration SQL loaded')
    console.log('Note: This script creates buckets via the Supabase API.')
    console.log('SQL policies need to be run manually via psql or Supabase Studio.')

    // Create avatars bucket
    console.log('\nCreating avatars bucket...')
    const { data: avatarsBucket, error: avatarsError } = await supabase.storage.createBucket('avatars', {
      public: true,
      fileSizeLimit: 2097152, // 2MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    })

    if (avatarsError && avatarsError.message !== 'Bucket already exists') {
      console.error('Error creating avatars bucket:', avatarsError)
    } else if (avatarsBucket) {
      console.log('✓ Avatars bucket created successfully')
    } else {
      console.log('✓ Avatars bucket already exists')
    }

    // Create theme-images bucket
    console.log('\nCreating theme-images bucket...')
    const { data: themesBucket, error: themesError } = await supabase.storage.createBucket('theme-images', {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    })

    if (themesError && themesError.message !== 'Bucket already exists') {
      console.error('Error creating theme-images bucket:', themesError)
    } else if (themesBucket) {
      console.log('✓ Theme-images bucket created successfully')
    } else {
      console.log('✓ Theme-images bucket already exists')
    }

    console.log('\n✅ Migration completed!')
    console.log('\nIMPORTANT: You need to run the SQL policies manually.')
    console.log('SQL file location:', migrationPath)
    console.log('\nYou can run it via:')
    console.log('1. Supabase Studio (SQL Editor)')
    console.log('2. psql command line')

  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

runMigration()
