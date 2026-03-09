/**
 * Adds advance_amount and security_deposit to listings (rent & financials).
 * Run once: node scripts/add-advance-security-listings.js
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
      ALTER TABLE listings ADD COLUMN IF NOT EXISTS advance_amount DECIMAL(14, 2);
      ALTER TABLE listings ADD COLUMN IF NOT EXISTS security_deposit DECIMAL(14, 2);
    `);
    console.log('Done. advance_amount and security_deposit added to listings (or already exist).');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
