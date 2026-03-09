const pool = require('../config/db');

// Keep in sync with TYPE_TABLES in listing.controller.js
const TYPE_TABLES = {
  Hostel: 'hostel_details',
  House: 'house_details',
  Flat: 'flat_details',
  Shop: 'shop_details',
  Office: 'office_details',
  Marquee: 'marquee_details',
  'Guest House': 'guest_house_details',
  'Farm House': 'farm_house_details',
};

async function getUserId(email) {
  const r = await pool.query('SELECT id FROM users WHERE LOWER(TRIM(email)) = $1', [email?.toLowerCase()]);
  return r.rows[0]?.id || null;
}

/**
 * POST /api/favorites - Add listing to favorites (body: listing_id)
 */
const add = async (req, res) => {
  try {
    const userId = await getUserId(req.user?.email);
    if (!userId) return res.status(401).json({ message: 'User not found' });
    const listingId = parseInt(req.body?.listing_id || req.body?.listingId, 10);
    if (isNaN(listingId)) return res.status(400).json({ message: 'listing_id is required' });
    await pool.query(
      'INSERT INTO favorites (user_id, listing_id) VALUES ($1, $2) ON CONFLICT (user_id, listing_id) DO NOTHING',
      [userId, listingId]
    );
    res.status(201).json({ message: 'Added to favorites' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * DELETE /api/favorites/:listingId - Remove from favorites
 */
const remove = async (req, res) => {
  try {
    const userId = await getUserId(req.user?.email);
    if (!userId) return res.status(401).json({ message: 'User not found' });
    const listingId = parseInt(req.params.listingId, 10);
    if (isNaN(listingId)) return res.status(400).json({ message: 'Invalid listing id' });
    await pool.query('DELETE FROM favorites WHERE user_id = $1 AND listing_id = $2', [userId, listingId]);
    res.json({ message: 'Removed from favorites' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET /api/favorites - List user's favorite listing ids and full listing data
 */
const list = async (req, res) => {
  try {
    const userId = await getUserId(req.user?.email);
    if (!userId) return res.status(401).json({ message: 'User not found' });
    const r = await pool.query(
      `SELECT l.*, u.username, u.email
       FROM favorites f
       JOIN listings l ON l.id = f.listing_id
       LEFT JOIN users u ON l.user_id = u.id
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC`,
      [userId]
    );
    const rows = r.rows;
    if (rows.length === 0) return res.json([]);

    const ids = rows.map((x) => x.id);

    // Images
    const imgResult = await pool.query(
      'SELECT listing_id, image_path FROM listing_images WHERE listing_id = ANY($1) ORDER BY listing_id, sort_order',
      [ids]
    );
    const imagesByListing = {};
    for (const row of imgResult.rows) {
      if (!imagesByListing[row.listing_id]) imagesByListing[row.listing_id] = [];
      imagesByListing[row.listing_id].push(row.image_path);
    }

    // Type-specific details (hostel_details, house_details, etc.)
    const detailsByListingId = {};
    for (const propType of Object.keys(TYPE_TABLES)) {
      const typeIds = rows.filter((r) => r.property_type === propType).map((r) => r.id);
      if (typeIds.length === 0) continue;
      const tableName = TYPE_TABLES[propType];
      const detailR = await pool.query(
        `SELECT * FROM ${tableName} WHERE listing_id = ANY($1)`,
        [typeIds]
      );
      for (const d of detailR.rows) {
        detailsByListingId[d.listing_id] = d;
      }
    }

    // Common extras (rooms, bathrooms, etc.)
    const extrasResult = await pool.query(
      'SELECT * FROM listing_extras WHERE listing_id = ANY($1)',
      [ids]
    );
    const extrasByListingId = {};
    for (const e of extrasResult.rows) {
      extrasByListingId[e.listing_id] = e;
    }

    const out = rows.map((row) => ({
      ...row,
      images: imagesByListing[row.id] || [],
      type_details: detailsByListingId[row.id] || null,
      extras: extrasByListingId[row.id] || null,
    }));

    res.json(out);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * GET /api/favorites/check/:listingId - Check if listing is favorited by current user
 */
const check = async (req, res) => {
  try {
    const userId = await getUserId(req.user?.email);
    if (!userId) return res.json({ is_favorite: false });
    const listingId = parseInt(req.params.listingId, 10);
    if (isNaN(listingId)) return res.json({ is_favorite: false });
    const r = await pool.query('SELECT 1 FROM favorites WHERE user_id = $1 AND listing_id = $2', [userId, listingId]);
    res.json({ is_favorite: r.rows.length > 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { add, remove, list, check };
