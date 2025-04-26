const { Client } = require('@neondatabase/serverless');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

const migrate = async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    // Create clubs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS clubs (
        id SERIAL PRIMARY KEY,
        brand VARCHAR(255) NOT NULL,
        model VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        category VARCHAR(50),
        subType VARCHAR(50),
        specificType VARCHAR(50),
        handicapperLevel VARCHAR(50),
        image VARCHAR(255)
      );
    `);

    // Create variants table
    await client.query(`
      CREATE TABLE IF NOT EXISTS variants (
        id SERIAL PRIMARY KEY,
        club_id INTEGER REFERENCES clubs(id) ON DELETE CASCADE,
        price DECIMAL(10, 2) NOT NULL,
        loft VARCHAR(50),
        shaftMaterial VARCHAR(50),
        setMakeup VARCHAR(50),
        length VARCHAR(50),
        bounce VARCHAR(50),
        description TEXT
      );
    `);

    // Load and parse clubs.json
    const clubsData = JSON.parse(fs.readFileSync('./src/data/clubs.json', 'utf8'));

    // Clear existing data (optional, remove if you don't want to clear)
    await client.query('DELETE FROM variants');
    await client.query('DELETE FROM clubs');

    // Migrate data
    for (const club of clubsData.clubs) {
      // Insert club
      const clubRes = await client.query(
        'INSERT INTO clubs (brand, model, type, category, subType, specificType, handicapperLevel, image) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
        [club.brand, club.model, club.type, club.category, club.subType, club.specificType, club.handicapperLevel, club.image]
      );
      const clubId = clubRes.rows[0].id;

      // Insert variants
      for (const variant of club.variants) {
        await client.query(
          'INSERT INTO variants (club_id, price, loft, shaftMaterial, setMakeup, length, bounce, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [clubId, variant.price, variant.loft, variant.shaftMaterial, variant.setMakeup, variant.length, variant.bounce, variant.description]
        );
      }
    }

    console.log('Database migration completed successfully');
  } catch (err) {
    console.error('Error during migration:', err);
  } finally {
    await client.end();
  }
};

migrate();