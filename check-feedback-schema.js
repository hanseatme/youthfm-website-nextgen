const { Client } = require('pg');

async function checkSchema() {
  const client = new Client({
    host: '192.168.178.53',
    port: 6543,
    user: 'postgres.local-dev-tenant',
    password: 'your-super-secret-and-long-postgres-password',
    database: 'postgres',
  });

  try {
    await client.connect();
    console.log('Connected to database\n');

    // Check song_feedback table structure
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'song_feedback'
      ORDER BY ordinal_position;
    `);

    console.log('song_feedback table columns:');
    console.table(result.rows);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkSchema();
