const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = 'http://192.168.178.53:8000'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q'

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration() {
  console.log('🚀 Starting storage migration...\n')

  try {
    // Read the SQL migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '00005_storage_buckets.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    console.log('📄 Migration SQL loaded from:', migrationPath)
    console.log('\n' + '='.repeat(60))

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'))

    console.log(`\n📊 Found ${statements.length} SQL statements to execute\n`)

    let successCount = 0
    let skipCount = 0
    let errorCount = 0

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]

      // Skip comments and empty statements
      if (!statement || statement.startsWith('--')) {
        continue
      }

      // Extract a description from the statement
      let description = statement.substring(0, 80).replace(/\s+/g, ' ')
      if (statement.toLowerCase().includes('insert into storage.buckets')) {
        const match = statement.match(/VALUES\s*\(\s*'([^']+)'/i)
        description = match ? `Creating bucket: ${match[1]}` : 'Creating storage bucket'
      } else if (statement.toLowerCase().includes('create policy')) {
        const match = statement.match(/CREATE POLICY\s+"([^"]+)"/i)
        description = match ? `Policy: ${match[1]}` : 'Creating policy'
      } else if (statement.toLowerCase().includes('create table')) {
        const match = statement.match(/CREATE TABLE[^(]*\s+(\w+)/i)
        description = match ? `Creating table: ${match[1]}` : 'Creating table'
      } else if (statement.toLowerCase().includes('alter table')) {
        const match = statement.match(/ALTER TABLE\s+(\w+)/i)
        description = match ? `Altering table: ${match[1]}` : 'Altering table'
      }

      console.log(`[${i + 1}/${statements.length}] ${description}`)

      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: statement + ';'
        }).catch(async (err) => {
          // Fallback: try via postgrest directly
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': serviceRoleKey,
              'Authorization': `Bearer ${serviceRoleKey}`
            },
            body: JSON.stringify({ sql: statement + ';' })
          })

          if (!response.ok) {
            const text = await response.text()
            throw new Error(`HTTP ${response.status}: ${text}`)
          }

          return await response.json()
        })

        if (error) {
          // Check if it's a "already exists" error
          if (error.message && (
            error.message.includes('already exists') ||
            error.message.includes('duplicate') ||
            error.message.includes('ON CONFLICT DO NOTHING')
          )) {
            console.log(`  ⚠️  Already exists, skipping`)
            skipCount++
          } else {
            console.log(`  ❌ Error: ${error.message}`)
            errorCount++
          }
        } else {
          console.log(`  ✅ Success`)
          successCount++
        }
      } catch (err) {
        const errMsg = err.message || String(err)
        if (errMsg.includes('already exists') || errMsg.includes('duplicate')) {
          console.log(`  ⚠️  Already exists, skipping`)
          skipCount++
        } else if (errMsg.includes('does not exist') && errMsg.includes('exec_sql')) {
          console.log(`  ⚠️  Cannot execute via RPC, trying direct SQL...`)
          // Try to create buckets directly via storage API
          if (statement.includes("'avatars'")) {
            await createBucket('avatars', 2097152)
          } else if (statement.includes("'theme-images'")) {
            await createBucket('theme-images', 5242880)
          } else {
            console.log(`  ⚠️  Skipping SQL statement (needs manual execution)`)
            skipCount++
          }
        } else {
          console.log(`  ❌ Error: ${errMsg}`)
          errorCount++
        }
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('\n📈 Migration Summary:')
    console.log(`  ✅ Successful: ${successCount}`)
    console.log(`  ⚠️  Skipped: ${skipCount}`)
    console.log(`  ❌ Errors: ${errorCount}`)

    if (errorCount > 0) {
      console.log('\n⚠️  Some statements failed. This is often normal for:')
      console.log('  - Policies (need to be created via Supabase Studio)')
      console.log('  - Complex SQL (needs direct PostgreSQL access)')
      console.log('\n💡 You can run the remaining SQL manually in Supabase Studio SQL Editor')
    }

    console.log('\n✅ Migration completed!\n')

  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

async function createBucket(name, sizeLimit) {
  try {
    const { data, error } = await supabase.storage.createBucket(name, {
      public: true,
      fileSizeLimit: sizeLimit,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    })

    if (error) {
      if (error.message.includes('already exists')) {
        console.log(`  ⚠️  Bucket '${name}' already exists`)
        return true
      }
      throw error
    }

    console.log(`  ✅ Created bucket '${name}'`)
    return true
  } catch (err) {
    console.log(`  ❌ Failed to create bucket '${name}': ${err.message}`)
    return false
  }
}

runMigration()
