/**
 * Adds any missing columns to existing tables.
 * Safe to run multiple times.
 * Usage: node scripts/add-missing-columns.js
 */
require('dotenv').config();
const { Client } = require('pg');

const DB_NAME = process.env.DB_NAME || 'pr_db';

// Expected columns per table: { name, type, defaultClause (optional) }
const TABLE_SCHEMA = {
  users: [
    { name: 'id', type: 'SERIAL PRIMARY KEY' },
    { name: 'username', type: 'VARCHAR(50)' },
    { name: 'email', type: 'VARCHAR(100) UNIQUE NOT NULL' },
    { name: 'contact', type: 'VARCHAR(50)' },
    { name: 'password', type: 'TEXT NOT NULL' },
    { name: 'profile_image', type: 'TEXT' },
    { name: 'is_verified', type: 'BOOLEAN', defaultClause: 'DEFAULT false' },
    { name: 'created_at', type: 'TIMESTAMP', defaultClause: 'DEFAULT CURRENT_TIMESTAMP' },
  ],
  otp_verifications: [
    { name: 'id', type: 'SERIAL PRIMARY KEY' },
    { name: 'email', type: 'VARCHAR(100)' },
    { name: 'otp', type: 'VARCHAR(6)' },
    { name: 'expires_at', type: 'TIMESTAMP' },
  ],
  password_resets: [
    { name: 'id', type: 'SERIAL PRIMARY KEY' },
    { name: 'email', type: 'VARCHAR(100)' },
    { name: 'token', type: 'TEXT' },
    { name: 'expires_at', type: 'TIMESTAMP' },
  ],
};

async function getExistingColumns(client, tableName) {
  const res = await client.query(
    `SELECT column_name FROM information_schema.columns 
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return res.rows.map((r) => r.column_name);
}

async function addMissingColumns(client, tableName, columns) {
  const existing = await getExistingColumns(client, tableName);
  const existingSet = new Set(existing);

  for (const col of columns) {
    if (existingSet.has(col.name)) continue;
    const defaultPart = col.defaultClause ? ` ${col.defaultClause}` : '';
    const sql = `ALTER TABLE ${tableName} ADD COLUMN ${col.name} ${col.type}${defaultPart}`;
    try {
      await client.query(sql);
      console.log(`  + ${tableName}.${col.name}`);
    } catch (err) {
      console.error(`  ✗ ${tableName}.${col.name}:`, err.message);
    }
  }
}

async function run() {
  const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: DB_NAME,
  });

  try {
    await client.connect();
    console.log('Checking tables for missing columns...\n');

    for (const [tableName, columns] of Object.entries(TABLE_SCHEMA)) {
      const res = await client.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
        [tableName]
      );
      if (res.rows.length === 0) {
        console.log(`Table "${tableName}" does not exist. Run: npm run init-db`);
        continue;
      }
      console.log(`Table: ${tableName}`);
      await addMissingColumns(client, tableName, columns);
    }

    console.log('\nDone.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
