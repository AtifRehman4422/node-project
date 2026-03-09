require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Test DB connection + ensure required columns exist
const pool = require('./config/db');
pool.query('SELECT NOW()', (err, res) => {
  if (err) console.log('DB connection error:', err.message);
  else console.log('DB connected at:', res.rows[0].now);
});

// Add missing columns on startup (contact, google_id; password nullable for Google login)
(async function ensureColumns() {
  try {
    const contact = await pool.query(
      "SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='contact'"
    );
    if (contact.rows.length === 0) {
      await pool.query('ALTER TABLE users ADD COLUMN contact VARCHAR(50)');
      console.log('Added missing column: users.contact');
    }
    const googleId = await pool.query(
      "SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='google_id'"
    );
    if (googleId.rows.length === 0) {
      await pool.query('ALTER TABLE users ADD COLUMN google_id VARCHAR(100) UNIQUE');
      console.log('Added missing column: users.google_id');
    }
    const p = await pool.query(
      "SELECT is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='password'"
    );
    if (p.rows.length > 0 && p.rows[0].is_nullable === 'NO') {
      await pool.query('ALTER TABLE users ALTER COLUMN password DROP NOT NULL');
      console.log('users.password now nullable for Google login');
    }
  } catch (e) {
    console.log('Migration check:', e.message);
  }
})();

// Routes
const authRoutes = require('./routes/auth.routes');
const listingRoutes = require('./routes/listing.routes');
const favoritesRoutes = require('./routes/favorites.routes');
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/favorites', favoritesRoutes);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
