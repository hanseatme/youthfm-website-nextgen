import { Client } from 'pg'
import { readFileSync } from 'fs'
import { join } from 'path'

// PostgreSQL connection for self-hosted Supabase via Supavisor
// Tenant ID from env: local-dev-tenant
const pgConfig = {
  host: '192.168.178.53',
  port: 6543, // Supavisor transaction pooling port
  database: 'postgres',
  user: 'postgres.local-dev-tenant', // Format: user.tenant_id
  password: 'your-super-secret-and-long-postgres-password',
  ssl: false,
}

async function runMigrations() {
  console.log('='.repeat(50))
  console.log('Next Generation Radio - Database Migration')
  console.log('='.repeat(50))
  console.log('')

  const client = new Client(pgConfig)

  try {
    console.log('Connecting to PostgreSQL...')
    await client.connect()
    console.log('Connected successfully!')
    console.log('')

    // Read all migration files
    const migrationsDir = join(__dirname, '..', 'supabase', 'migrations')

    const migrations = [
      '00001_initial_schema.sql',
      '00002_rls_policies.sql',
      '00003_functions.sql',
      '00004_seed_data.sql',
    ]

    for (const migrationFile of migrations) {
      console.log(`Running migration: ${migrationFile}`)
      const sql = readFileSync(join(migrationsDir, migrationFile), 'utf-8')

      try {
        await client.query(sql)
        console.log(`  ✓ ${migrationFile} completed`)
      } catch (err) {
        const error = err as Error & { code?: string }
        // Some errors are acceptable (like "already exists")
        if (error.code === '42710' || error.code === '42P07' || error.message.includes('already exists')) {
          console.log(`  ⚠ ${migrationFile} - some objects already exist (continuing)`)
        } else {
          console.error(`  ✗ ${migrationFile} failed:`, error.message)
          throw err
        }
      }
    }

    console.log('')
    console.log('='.repeat(50))
    console.log('All migrations completed successfully!')
    console.log('='.repeat(50))

  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

runMigrations()
