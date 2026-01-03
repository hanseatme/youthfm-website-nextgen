import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const supabaseUrl = 'http://192.168.178.53:8000'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q'

async function runSQL(sql: string): Promise<{ success: boolean; error?: string }> {
  // Try using the pg-meta SQL endpoint if available
  const endpoints = [
    `${supabaseUrl}/pg/sql`,
    `${supabaseUrl}/rest/v1/rpc/exec_sql`,
  ]

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
        },
        body: JSON.stringify({ query: sql }),
      })

      if (response.ok) {
        return { success: true }
      }
    } catch (e) {
      // Continue to next endpoint
    }
  }

  return { success: false, error: 'No SQL endpoint available' }
}

async function runMigrations() {
  console.log('='.repeat(50))
  console.log('Next Generation Radio - Database Migration (via API)')
  console.log('='.repeat(50))
  console.log('')

  // Read migration files
  const migrationsDir = join(__dirname, '..', 'supabase', 'migrations')

  const migrations = [
    '00001_initial_schema.sql',
    '00002_rls_policies.sql',
    '00003_functions.sql',
    '00004_seed_data.sql',
  ]

  console.log('Testing Supabase connection...')

  // First test if we can reach Supabase
  try {
    const healthCheck = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
      },
    })
    console.log(`Supabase REST API status: ${healthCheck.status}`)
  } catch (e) {
    console.error('Cannot reach Supabase:', e)
    return
  }

  console.log('')
  console.log('The Supabase REST API does not support DDL statements directly.')
  console.log('')
  console.log('To run the migrations, please use one of these methods:')
  console.log('')
  console.log('='.repeat(50))
  console.log('Option 1: Supabase Studio SQL Editor')
  console.log('='.repeat(50))
  console.log(`1. Open http://192.168.178.53:3000 (Supabase Studio)`)
  console.log('2. Go to SQL Editor')
  console.log('3. Run each migration file in order:')
  for (const m of migrations) {
    console.log(`   - supabase/migrations/${m}`)
  }
  console.log('')
  console.log('='.repeat(50))
  console.log('Option 2: Combined SQL (copy-paste ready)')
  console.log('='.repeat(50))
  console.log('')

  // Create combined SQL output
  console.log('Here is the combined SQL for easy copy-paste:')
  console.log('')
  console.log('-'.repeat(50))

  for (const migrationFile of migrations) {
    const sql = readFileSync(join(migrationsDir, migrationFile), 'utf-8')
    console.log(`\n-- =============================================`)
    console.log(`-- Migration: ${migrationFile}`)
    console.log(`-- =============================================\n`)
    console.log(sql)
  }

  console.log('-'.repeat(50))
}

runMigrations()
