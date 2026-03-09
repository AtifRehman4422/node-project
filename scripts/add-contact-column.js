/**
 * Adds "contact" column to users table if it doesn't exist.
 * Run once: node scripts/add-contact-column.js
 */
require('dotenv').config();
const { Client } = require('pg');

const config = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'pr_db',
};

async function run() {
  const client = new Client(config);
  try {
    await client.connect();
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS contact VARCHAR(50);
    `);
    console.log('Done. "contact" column added (or already exists).');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
