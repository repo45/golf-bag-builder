import { Client } from '@neondatabase/serverless';

export default async (req, res) => {
  console.log('Received request to /api/clubs');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Present' : 'Missing');

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is missing');
    return res.status(500).json({ error: 'Server configuration error: DATABASE_URL is not set' });
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to Neon Postgres...');
    await client.connect();
    console.log('Connected to Neon Postgres');

    console.log('Executing query...');
    const clubsRes = await client.query(`
      SELECT c.*, json_agg(v.*) as variants
      FROM clubs c
      LEFT JOIN variants v ON c.id = v.club_id
      GROUP BY c.id
    `);
    console.log('Query executed, rows:', clubsRes.rows.length);

    if (clubsRes.rows.length === 0) {
      console.log('No clubs found in the database');
      return res.status(200).json({ clubs: [] });
    }

    res.status(200).json({ clubs: clubsRes.rows });
  } catch (err) {
    console.error('Error fetching clubs:', err);
    if (err.code === 'ECONNREFUSED') {
      res.status(503).json({ error: 'Database connection failed' });
    } else if (err.code === '42P01') {
      res.status(500).json({ error: 'Database schema error: Table does not exist' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  } finally {
    console.log('Closing database connection...');
    try {
      await client.end();
      console.log('Database connection closed');
    } catch (closeErr) {
      console.error('Error closing database connection:', closeErr);
    }
  }
};