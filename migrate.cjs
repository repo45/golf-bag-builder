const { Client } = require('@neondatabase/serverless');
const fs = require('fs');

// Load environment variables
require('dotenv').config();

console.log('Starting migration script...');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Present' : 'Missing');

const migrate = async () => {
  console.log('Creating Neon client...');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to Neon Postgres...');
    await client.connect();
    console.log('Connected to Neon Postgres successfully');

    console.log('Creating clubs table...');
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
        image VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Clubs table created');

    console.log('Creating variants table...');
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
        description TEXT,
        source VARCHAR(255),
        url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Variants table created');

    console.log('Loading clubs.json...');
    const clubsData = JSON.parse(fs.readFileSync('./data/clubs.json', 'utf8'));
    console.log(`Loaded ${clubsData.clubs.length} clubs from clubs.json`);

    console.log('Clearing existing data from variants table...');
    await client.query('DELETE FROM variants');
    console.log('Cleared variants table');

    console.log('Clearing existing data from clubs table...');
    await client.query('DELETE FROM clubs');
    console.log('Cleared clubs table');

    console.log('Migrating data...');
    let clubCount = 0;
    for (const club of clubsData.clubs) {
      clubCount++;
      console.log(`Inserting club ${clubCount}/${clubsData.clubs.length}: ${club.brand} ${club.model}`);

      // Map old handicapper levels to new ones
      let mappedHandicapperLevel = club.handicapperLevel;
      if (club.handicapperLevel === "Low Handicapper") {
        mappedHandicapperLevel = "Advanced";
      } else if (club.handicapperLevel === "Mid Handicapper") {
        mappedHandicapperLevel = "Intermediate";
      } else if (club.handicapperLevel === "High Handicapper") {
        mappedHandicapperLevel = "Beginner";
      }

      const clubRes = await client.query(
        'INSERT INTO clubs (brand, model, type, category, subType, specificType, handicapperLevel, image, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP) RETURNING id',
        [club.brand, club.model, club.type, club.category, club.subType, club.specificType, mappedHandicapperLevel, club.image]
      );
      const clubId = clubRes.rows[0].id;

      for (const variant of club.variants) {
        const retailer = variant.prices && variant.prices.length > 0 ? variant.prices[0].retailer : null;
        const url = variant.prices && variant.prices.length > 0 ? variant.prices[0].url : null;
        const price = variant.prices && variant.prices.length > 0 ? variant.prices[0].price : variant.price;

        await client.query(
          'INSERT INTO variants (club_id, price, loft, shaftMaterial, setMakeup, length, bounce, description, source, url, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)',
          [clubId, price, variant.loft, variant.shaftMaterial, variant.setMakeup, variant.length, variant.bounce, variant.description, retailer, url]
        );
      }
    }

    console.log('Database migration completed successfully');
  } catch (err) {
    console.error('Error during migration:', err);
    throw err;
  } finally {
    console.log('Closing database connection...');
    await client.end();
    console.log('Database connection closed');
  }
};

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});