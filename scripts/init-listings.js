/**
 * Creates listings tables in pr_db. Run after init-db.
 * Usage: node scripts/init-listings.js
 */
require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_NAME = process.env.DB_NAME || 'pr_db';

async function run() {
  const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
  });
  try {
    await client.connect();
    const sqlPath = path.join(__dirname, 'init-listings.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    const lines = sql.split(/\r?\n/).filter((line) => {
      const t = line.trim();
      return t.length > 0 && !t.startsWith('--');
    });
    const fullSql = lines.join('\n');
    const statements = fullSql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const stmt of statements) {
      await client.query(stmt);
    }
    console.log('Listings tables created: listings, listing_images, hostel_details, house_details, flat_details, shop_details, office_details, marquee_details, guest_house_details, farm_house_details, listing_extras');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
