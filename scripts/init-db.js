/**
 * Run this once to create database pr_db and all tables.
 * Usage: npm run init-db
 * Make sure .env has correct DB_USER, DB_PASSWORD, DB_HOST, DB_PORT.
 */
require('dotenv').config();
const { Client } = require('pg');

const DB_NAME = process.env.DB_NAME || 'pr_db';

const createTables = `
-- users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  contact VARCHAR(50) NOT NULL,
  password TEXT NOT NULL,
  profile_image TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- otp_verifications table
CREATE TABLE IF NOT EXISTS otp_verifications (
  id SERIAL PRIMARY KEY,
  email VARCHAR(100),
  otp VARCHAR(6),
  expires_at TIMESTAMP
);

-- password_resets table
CREATE TABLE IF NOT EXISTS password_resets (
  id SERIAL PRIMARY KEY,
  email VARCHAR(100),
  token TEXT,
  expires_at TIMESTAMP
);
`;

async function init() {
  const baseConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
  };

  const client = new Client({ ...baseConfig, database: 'postgres' });

  try {
    await client.connect();
    const res = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [DB_NAME]
    );
    if (res.rows.length === 0) {
      await client.query(`CREATE DATABASE ${DB_NAME}`);
      console.log(`Database "${DB_NAME}" created.`);
    } else {
      console.log(`Database "${DB_NAME}" already exists.`);
    }
  } catch (err) {
    console.error('Error creating database:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }

  const tableClient = new Client({ ...baseConfig, database: DB_NAME });
  try {
    await tableClient.connect();
    await tableClient.query(createTables);
    await tableClient.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='contact') THEN
          ALTER TABLE users ADD COLUMN contact VARCHAR(50);
        END IF;
      END $$;
    `);
    console.log('Tables created (or already exist): users, otp_verifications, password_resets');
  } catch (err) {
    console.error('Error creating tables:', err.message);
    process.exit(1);
  } finally {
    await tableClient.end();
  }

  console.log('DB setup complete. You can run: npm start');
}

init();
