/**
 * Seeds 3 Abbottabad listings (2 Hostels, 1 Guest House).
 * Requires: users table has at least one user; listings + type tables exist.
 * Usage: node scripts/seed-abbottabad-listings.js
 */
require('dotenv').config();
const pool = require('../config/db');

async function run() {
  const client = await pool.connect();
  try {
    const userResult = await client.query('SELECT id FROM users LIMIT 1');
    const userId = userResult.rows[0]?.id;
    if (!userId) {
      console.error('No user found. Create a user (sign up) first.');
      process.exit(1);
    }

    await client.query('BEGIN');

    // 1) Abbottabad View Hotel – Hostel
    const r1 = await client.query(
      `INSERT INTO listings (
        user_id, property_type, city, address, title, description,
        sector, landmark, contact_phone, owner_name, rent, status
      ) VALUES ($1, 'Hostel', 'Abbottabad', $2, $3, $4, $5, $6, $7, $8, 0, 'active')
      RETURNING id`,
      [
        userId,
        'Near Jinnah Road',
        'Abbottabad View Hotel',
        'A budget hostel-type property in Abbottabad; call ahead to ask if they offer 3-bed or shared male rooms.',
        'Abbottabad',
        'Budget hostel, 3-bed / shared male rooms – call to confirm',
        null, // contact_phone
        'Abbottabad View Hotel', // owner_name
      ]
    );
    const id1 = r1.rows[0].id;
    await client.query(
      `INSERT INTO hostel_details (listing_id, beds, room_type, preference)
       VALUES ($1, 3, 'Shared', 'Male')`,
      [id1]
    );

    // 2) Exotic Girls Hostel – Hostel
    const r2 = await client.query(
      `INSERT INTO listings (
        user_id, property_type, city, address, title, description,
        sector, landmark, contact_phone, owner_name, rent, status
      ) VALUES ($1, 'Hostel', 'Abbottabad', $2, $3, $4, $5, $6, $7, $8, 0, 'active')
      RETURNING id`,
      [
        userId,
        'Abbottabad',
        'Exotic Girls Hostel',
        'A rated hostel. Note: advertised as girls hostel — likely not suitable for male guests unless they explicitly offer male rooms.',
        'Abbottabad',
        'Girls hostel – contact for male room availability',
        null,
        'Exotic Girls Hostel',
      ]
    );
    const id2 = r2.rows[0].id;
    await client.query(
      `INSERT INTO hostel_details (listing_id, beds, room_type, preference)
       VALUES ($1, 2, 'Shared', 'Female')`,
      [id2]
    );

    // 3) Bagh Valley Guest House Abbottabad – Guest House
    const r3 = await client.query(
      `INSERT INTO listings (
        user_id, property_type, city, address, title, description,
        sector, landmark, contact_phone, owner_name, rent, status
      ) VALUES ($1, 'Guest House', 'Abbottabad', $2, $3, $4, $5, $6, $7, $8, 0, 'active')
      RETURNING id`,
      [
        userId,
        'Bagh Valley, Abbottabad',
        'Bagh Valley Guest House Abbottabad',
        'Guest house that might accommodate groups — contact to check if they can do a 3-bed arrangement for men.',
        'Bagh Valley',
        'Groups, 3-bed for men – contact to confirm',
        null,
        'Bagh Valley Guest House',
      ]
    );
    const id3 = r3.rows[0].id;
    await client.query(
      `INSERT INTO guest_house_details (listing_id, rooms, preference)
       VALUES ($1, 3, 'Male')`,
      [id3]
    );

    await client.query('COMMIT');
    console.log('Seeded 3 Abbottabad listings (IDs: %s, %s, %s)', id1, id2, id3);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
