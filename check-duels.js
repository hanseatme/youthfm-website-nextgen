const { Client } = require('pg');

async function checkDuels() {
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

    // Check for duels
    const duelsResult = await client.query(`
      SELECT id, status, created_at, song_a_id, song_b_id, votes_a, votes_b
      FROM duels
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log('Duels in database:', duelsResult.rowCount);
    console.log(duelsResult.rows);

    // Check for songs
    const songsResult = await client.query(`
      SELECT id, title, artist
      FROM songs
      LIMIT 5
    `);

    console.log('\nSongs in database:', songsResult.rowCount);
    console.log(songsResult.rows);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkDuels();
