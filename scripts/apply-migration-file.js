const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

function parseKeyValueText(text) {
  const map = {}
  const lines = text.split(/\r?\n/g)
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#') || line.startsWith('//')) continue

    const match = line.match(/^([A-Za-z0-9_.-]+)\s*[:=]\s*(.*)$/)
    if (!match) continue
    const key = match[1]
    let value = match[2].trim()
    value = value.replace(/^[\"']|[\"']$/g, '')
    map[key] = value
  }
  return map
}

function getDbConfig(configTextMap) {
  const urlCandidate = configTextMap.API_EXTERNAL_URL || configTextMap.SUPABASE_PUBLIC_URL || ''
  let derivedHost = ''
  try {
    derivedHost = new URL(urlCandidate).hostname
  } catch {
    derivedHost = ''
  }

  const hostCandidate = configTextMap.POSTGRES_HOST || derivedHost || '192.168.178.53'
  const host = hostCandidate === 'db' ? '192.168.178.53' : hostCandidate

  const portRaw =
    configTextMap.POOLER_PROXY_PORT_TRANSACTION ||
    configTextMap.POSTGRES_PORT ||
    '6543'

  const tenantId = configTextMap.POOLER_TENANT_ID || ''
  const user =
    configTextMap.DB_USER ||
    (tenantId ? `postgres.${tenantId}` : 'postgres.local-dev-tenant')

  const database = configTextMap.POSTGRES_DB || 'postgres'

  const password = configTextMap.POSTGRES_PASSWORD || configTextMap.DB_PASSWORD || ''

  const port = Number(portRaw)
  if (!Number.isFinite(port)) {
    throw new Error(`Invalid DB port: ${portRaw}`)
  }
  if (!password) {
    throw new Error('Missing DB password in config')
  }

  return { host, port, database, user, password, ssl: false }
}

async function main() {
  const migrationArg = process.argv[2] || path.join('supabase', 'migrations', '00011_music_api_and_previews.sql')
  const migrationPath = path.isAbsolute(migrationArg) ? migrationArg : path.join(process.cwd(), migrationArg)

  const configPath = path.join(process.cwd(), 'supabase config', 'config-data.txt')
  if (!fs.existsSync(configPath)) {
    throw new Error(`Missing config file: ${configPath}`)
  }
  if (!fs.existsSync(migrationPath)) {
    throw new Error(`Missing migration file: ${migrationPath}`)
  }

  const configText = fs.readFileSync(configPath, 'utf8')
  const configMap = parseKeyValueText(configText)
  const dbConfig = getDbConfig(configMap)

  const sql = fs.readFileSync(migrationPath, 'utf8')
  const client = new Client(dbConfig)

  console.log(`Connecting to Postgres at ${dbConfig.host}:${dbConfig.port}/${dbConfig.database} ...`)
  await client.connect()

  try {
    console.log(`Applying migration: ${path.relative(process.cwd(), migrationPath)}`)
    await client.query(sql)
    console.log('Migration applied successfully.')
  } finally {
    await client.end()
  }
}

main().catch((err) => {
  console.error('Migration failed:', err?.message || err)
  process.exit(1)
})
