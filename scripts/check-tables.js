const { Client } = require('pg')

const client = new Client({
  host: '192.168.178.53',
  port: 6543,
  database: 'postgres',
  user: 'postgres.local-dev-tenant',
  password: 'your-super-secret-and-long-postgres-password'
})

async function checkTables() {
  try {
    await client.connect()
    console.log('✅ Connected!\n')

    // Check for user_profiles or profiles table
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND (table_name LIKE '%profile%' OR table_name LIKE '%user%')
      ORDER BY table_name
    `)

    console.log('📊 Tables related to profiles/users:')
    result.rows.forEach(row => {
      console.log(`   - ${row.table_name}`)
    })

    // Check if avatars table exists
    const avatarsCheck = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'avatars'
    `)

    console.log(`\n📦 Avatars table: ${avatarsCheck.rows.length > 0 ? '✅ EXISTS' : '❌ DOES NOT EXIST'}`)

  } catch (error) {
    console.error('❌ Failed:', error.message)
  } finally {
    await client.end()
  }
}

checkTables()
