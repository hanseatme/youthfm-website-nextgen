const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

const client = new Client({
  host: '192.168.178.53',
  port: 6543,
  database: 'postgres',
  user: 'postgres.local-dev-tenant',
  password: 'your-super-secret-and-long-postgres-password'
})

async function runSQL() {
  try {
    console.log('🔌 Connecting to PostgreSQL...')
    await client.connect()
    console.log('✅ Connected!\n')

    const sqlPath = path.join(__dirname, 'create-avatars-table.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    console.log('📄 Executing SQL from:', sqlPath)
    console.log('=' .repeat(60) + '\n')

    // Split by semicolon and execute each statement
    // Remove comments first
    const cleanedSQL = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n')

    const statements = cleanedSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    console.log(`Found ${statements.length} statements to execute\n`)

    let successCount = 0
    let errorCount = 0

    for (const statement of statements) {
      // Get a brief description
      let desc = statement.substring(0, 60).replace(/\s+/g, ' ')
      if (statement.includes('CREATE TABLE')) {
        const match = statement.match(/CREATE TABLE[^(]*\s+(\w+)/i)
        desc = match ? `Creating table: ${match[1]}` : 'Creating table'
      } else if (statement.includes('CREATE POLICY')) {
        const match = statement.match(/CREATE POLICY\s+"([^"]+)"/i)
        desc = match ? `Creating policy: ${match[1]}` : 'Creating policy'
      } else if (statement.includes('ALTER TABLE')) {
        const match = statement.match(/ALTER TABLE\s+(\w+)/i)
        desc = match ? `Altering table: ${match[1]}` : 'Altering table'
      }

      try {
        console.log(`⏳ ${desc}...`)
        await client.query(statement + ';')
        console.log(`   ✅ Success\n`)
        successCount++
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(`   ⚠️  Already exists, skipping\n`)
        } else {
          console.log(`   ❌ Error: ${err.message}\n`)
          errorCount++
        }
      }
    }

    console.log('=' .repeat(60))
    console.log(`\n✅ Completed!`)
    console.log(`   Successful: ${successCount}`)
    console.log(`   Errors: ${errorCount}\n`)

  } catch (error) {
    console.error('❌ Failed:', error.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

runSQL()
