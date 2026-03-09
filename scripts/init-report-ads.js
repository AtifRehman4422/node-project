/**
 * Creates report_ads table in pr_db. Run after init-listings.
 * Usage: node scripts/init-report-ads.js
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
    const sqlPath = path.join(__dirname, 'init-report-ads.sql');
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
    console.log('report_ads table created.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();

