const pool = require('../config/db');
const { sendReportEmail } = require('../services/email.service');

/**
 * Get user id from email (set by auth middleware)
 */
async function getUserId(email) {
  const r = await pool.query('SELECT id FROM users WHERE LOWER(TRIM(email)) = $1', [email?.toLowerCase()]);
  return r.rows[0]?.id || null;
}

/**
 * POST /api/listings - Create listing (multipart: images[] + JSON fields in body)
 * Saves user_id so we know who created the listing.
 */
const create = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = await getUserId(req.user?.email);
    if (!userId) return res.status(401).json({ message: 'User not found' });

    const body = req.body || {};
    const propertyType = (body.property_type || '').trim() || 'Hostel';
    const city = (body.city || '').trim();
    const title = (body.title || '').trim();
    if (!city) return res.status(400).json({ message: 'City is required' });
    if (!title) return res.status(400).json({ message: 'Title is required' });

    const files = req.files || [];
    const imagePaths = (Array.isArray(files) ? files : [files]).map((f) => f.filename);

    await client.query('BEGIN');

    const listResult = await client.query(
      `INSERT INTO listings (
        user_id, property_type, city, address, latitude, longitude,
        title, description, area_size, area_unit, rent, advance_amount, security_deposit, is_negotiable,
        available_from, available_from_time, contact_email, contact_phone,
        owner_name, whatsapp, sector, landmark
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING id`,
      [
        userId,
        propertyType,
        city,
        body.address || null,
        body.latitude ? parseFloat(body.latitude) : null,
        body.longitude ? parseFloat(body.longitude) : null,
        title,
        body.description || null,
        body.area_size ? parseFloat(body.area_size) : null,
        body.area_unit || null,
        body.rent ? parseFloat(body.rent) : null,
        body.advance_amount != null && body.advance_amount !== '' ? parseFloat(body.advance_amount) : null,
        body.security_deposit != null && body.security_deposit !== '' ? parseFloat(body.security_deposit) : null,
        body.is_negotiable === 'true' || body.is_negotiable === true,
        body.available_from || null,
        body.available_from_time || null,
        body.contact_email || null,
        body.contact_phone || null,
        body.owner_name || null,
        body.whatsapp || null,
        body.sector || null,
        body.landmark || null,
      ]
    );
    const listingId = listResult.rows[0].id;

    for (let i = 0; i < imagePaths.length; i++) {
      await client.query(
        'INSERT INTO listing_images (listing_id, image_path, sort_order) VALUES ($1, $2, $3)',
        [listingId, imagePaths[i], i]
      );
    }

    const typePayload = typeof body.type_details === 'string' ? JSON.parse(body.type_details || '{}') : (body.type_details || {});

    if (propertyType === 'Hostel') {
      await client.query(
        `INSERT INTO hostel_details (listing_id, hostel_type, beds, room_type, attached_washroom, ac, study_table, wifi, laundry, water_24, power_backup, security, food_included, preference, smoking_allowed, alcohol_allowed, in_time_rules, available_from_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
        [
          listingId,
          typePayload.hostel_type || null,
          typePayload.beds ?? 1,
          typePayload.room_type || null,
          typePayload.attached_washroom || false,
          typePayload.ac || false,
          typePayload.study_table || false,
          typePayload.wifi || false,
          typePayload.laundry || false,
          typePayload.water_24 || false,
          typePayload.power_backup || false,
          typePayload.security || false,
          typePayload.food_included || false,
          typePayload.preference || null,
          typePayload.smoking_allowed || false,
          typePayload.alcohol_allowed || false,
          typePayload.in_time_rules || null,
          typePayload.available_from_date || null,
        ]
      );
    } else if (propertyType === 'House') {
      await client.query(
        `INSERT INTO house_details (listing_id, portion, bhk, floor, furnished, balcony, modular_kitchen, lift, parking, water_24, power_backup, security, gated_society, preference, pets_allowed, veg_non_veg, available_from_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          listingId,
          typePayload.portion || null,
          typePayload.bhk || null,
          typePayload.floor ?? 1,
          typePayload.furnished || null,
          typePayload.balcony || false,
          typePayload.modular_kitchen || false,
          typePayload.lift || false,
          typePayload.parking || false,
          typePayload.water_24 || false,
          typePayload.power_backup || false,
          typePayload.security || false,
          typePayload.gated_society || false,
          typePayload.preference || null,
          typePayload.pets_allowed || false,
          typePayload.veg_non_veg || false,
          typePayload.available_from_date || null,
        ]
      );
    } else if (propertyType === 'Flat') {
      await client.query(
        `INSERT INTO flat_details (listing_id, lift, balcony, furnished, generator, parking, modular_kitchen, water_24, security, gated_society)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          listingId,
          typePayload.lift || false,
          typePayload.balcony || false,
          typePayload.furnished || null,
          typePayload.generator || false,
          typePayload.parking || false,
          typePayload.modular_kitchen || false,
          typePayload.water_24 || false,
          typePayload.security || false,
          typePayload.gated_society || false,
        ]
      );
    } else if (propertyType === 'Shop') {
      await client.query(
        `INSERT INTO shop_details (listing_id, shop_location, front_width, ceiling_height, front_type, electricity, water, washroom, parking, suitable_for, available_from_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          listingId,
          typePayload.shop_location || null,
          typePayload.front_width ? parseFloat(typePayload.front_width) : null,
          typePayload.ceiling_height ? parseFloat(typePayload.ceiling_height) : null,
          typePayload.front_type || null,
          typePayload.electricity || false,
          typePayload.water || false,
          typePayload.washroom || false,
          typePayload.parking || false,
          typePayload.suitable_for || null,
          typePayload.available_from_date || null,
        ]
      );
    } else if (propertyType === 'Office') {
      await client.query(
        `INSERT INTO office_details (listing_id, floor, furnished, cabins, workstations, conference_room, reception, lift, parking, power_backup, internet_ready, security, suitable_for, available_from_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          listingId,
          typePayload.floor ?? 1,
          typePayload.furnished || null,
          typePayload.cabins ?? 0,
          typePayload.workstations ?? 0,
          typePayload.conference_room || false,
          typePayload.reception || false,
          typePayload.lift || false,
          typePayload.parking || false,
          typePayload.power_backup || false,
          typePayload.internet_ready || false,
          typePayload.security || false,
          typePayload.suitable_for || null,
          typePayload.available_from_date || null,
        ]
      );
    } else if (propertyType === 'Marquee' || propertyType === 'Guest House' || propertyType === 'Farm House') {
      if (propertyType === 'Marquee') {
        await client.query(
          `INSERT INTO marquee_details (listing_id, max_guests, ac, stage, bridal_room, parking_capacity, generator, decoration, catering, suitable_for, rent_per_day, rent_per_event, advance_amount, discount, maintenance, security_deposit)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
          [
            listingId,
            typePayload.max_guests ?? 100,
            typePayload.ac || false,
            typePayload.stage || false,
            typePayload.bridal_room || false,
            typePayload.parking_capacity ?? 0,
            typePayload.generator || false,
            typePayload.decoration || false,
            typePayload.catering || null,
            typePayload.suitable_for || null,
            typePayload.rent_per_day ? parseFloat(typePayload.rent_per_day) : null,
            typePayload.rent_per_event ? parseFloat(typePayload.rent_per_event) : null,
            typePayload.advance_amount ? parseFloat(typePayload.advance_amount) : null,
            typePayload.discount || null,
            typePayload.maintenance ? parseFloat(typePayload.maintenance) : null,
            typePayload.security_deposit ? parseFloat(typePayload.security_deposit) : null,
          ]
        );
      } else if (propertyType === 'Guest House') {
        await client.query(
          `INSERT INTO guest_house_details (listing_id, rooms, ac, attached_bathroom, tv, wifi, room_service, parking, power_backup, preference, available_from_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            listingId,
            typePayload.rooms ?? 1,
            typePayload.ac || false,
            typePayload.attached_bathroom || false,
            typePayload.tv || false,
            typePayload.wifi || false,
            typePayload.room_service || false,
            typePayload.parking || false,
            typePayload.power_backup || false,
            typePayload.preference || null,
            typePayload.available_from_date || null,
          ]
        );
      } else if (propertyType === 'Farm House') {
        await client.query(
          `INSERT INTO farm_house_details (listing_id, land_size, lawn, garden, rooms, hall, swimming_pool, parking, electricity, water_supply, suitable_for, available_from_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            listingId,
            typePayload.land_size ? parseFloat(typePayload.land_size) : null,
            typePayload.lawn || false,
            typePayload.garden || false,
            typePayload.rooms || false,
            typePayload.hall || false,
            typePayload.swimming_pool || false,
            typePayload.parking || false,
            typePayload.electricity || false,
            typePayload.water_supply || false,
            typePayload.suitable_for || null,
            typePayload.available_from_date || null,
          ]
        );
      }
    }

    await client.query(
      `INSERT INTO listing_extras (listing_id, laundry, mess, rooms, bathrooms, kitchen, tv_lounge)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        listingId,
        body.laundry || null,
        body.mess || null,
        body.rooms ? parseInt(body.rooms, 10) : null,
        body.bathrooms ? parseInt(body.bathrooms, 10) : null,
        body.kitchen ? parseInt(body.kitchen, 10) : null,
        body.tv_lounge ? parseInt(body.tv_lounge, 10) : null,
      ]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Listing created', listing_id: listingId });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

/**
 * GET /api/listings - List listings (optional: city, property_type, user_id). Each row includes images[].
 */
const list = async (req, res) => {
  try {
    const city = req.query.city;
    const propertyType = req.query.property_type;
    const userId = req.query.user_id;
    let q = 'SELECT l.*, u.username, u.email FROM listings l LEFT JOIN users u ON l.user_id = u.id WHERE 1=1';
    const params = [];
    let n = 1;
    if (city) {
      q += ` AND l.city = $${n}`;
      params.push(city);
      n++;
    }
    if (propertyType) {
      q += ` AND l.property_type = $${n}`;
      params.push(propertyType);
      n++;
    }
    if (userId) {
      q += ` AND l.user_id = $${n}`;
      params.push(userId);
      n++;
    }
    q += ' ORDER BY l.created_at DESC';
    const r = await pool.query(q, params);
    const rows = r.rows;
    if (rows.length === 0) return res.json([]);
    const ids = rows.map((x) => x.id);
    const imgResult = await pool.query(
      'SELECT listing_id, image_path FROM listing_images WHERE listing_id = ANY($1) ORDER BY listing_id, sort_order',
      [ids]
    );
    const imagesByListing = {};
    for (const row of imgResult.rows) {
      if (!imagesByListing[row.listing_id]) imagesByListing[row.listing_id] = [];
      imagesByListing[row.listing_id].push(row.image_path);
    }
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

/**
 * GET /api/listings/:id - Single listing with images and type_details
 */
const getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid listing id' });
    const listResult = await pool.query(
      'SELECT l.*, u.username, u.email FROM listings l LEFT JOIN users u ON l.user_id = u.id WHERE l.id = $1',
      [id]
    );
    if (listResult.rows.length === 0) return res.status(404).json({ message: 'Listing not found' });
    const listing = listResult.rows[0];
    const imgResult = await pool.query(
      'SELECT image_path FROM listing_images WHERE listing_id = $1 ORDER BY sort_order',
      [id]
    );
    listing.images = imgResult.rows.map((r) => r.image_path);
    const tableName = TYPE_TABLES[listing.property_type];
    if (tableName) {
      const detailResult = await pool.query(`SELECT * FROM ${tableName} WHERE listing_id = $1`, [id]);
      listing.type_details = detailResult.rows[0] || null;
    } else {
      listing.type_details = null;
    }
    const extrasResult = await pool.query('SELECT * FROM listing_extras WHERE listing_id = $1', [id]);
    listing.extras = extrasResult.rows[0] || null;
    res.json(listing);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * POST /api/listings/:id/report - Report an ad (requires auth)
 */
const reportAd = async (req, res) => {
  try {
    const listingId = parseInt(req.params.id, 10);
    if (isNaN(listingId)) return res.status(400).json({ message: 'Invalid listing id' });

    const userId = await getUserId(req.user?.email);
    if (!userId) return res.status(401).json({ message: 'User not found' });

    const { reason, details, contact } = req.body || {};
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({ message: 'Reason is required' });
    }

    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO report_ads (listing_id, reported_by_user_id, reported_by_email, reason, details, reporter_contact)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          listingId,
          userId,
          req.user?.email || null,
          reason.trim(),
          details && details.trim() ? details.trim() : null,
          contact && contact.trim ? contact.trim() : null,
        ]
      );

      // Fetch basic listing info for email (optional – ignore failures)
      let listingTitle = null;
      try {
        const r = await client.query('SELECT title FROM listings WHERE id = $1', [listingId]);
        listingTitle = r.rows[0]?.title || null;
      } catch (_) {}

      // Fire-and-forget email; don't block response on errors
      sendReportEmail({
        listingId,
        listingTitle,
        reporterEmail: req.user?.email || null,
        reporterContact: contact,
        reason: reason.trim(),
        details: details && details.trim ? details.trim() : '',
      }).catch((err) => console.error('Failed to send report email', err));

      res.status(201).json({ message: 'Report submitted' });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * PATCH /api/listings/:id - Update own listing (auth, owner only). Same body as create (multipart).
 */
const updateListing = async (req, res) => {
  const client = await pool.connect();
  try {
    const listingId = parseInt(req.params.id, 10);
    if (isNaN(listingId)) return res.status(400).json({ message: 'Invalid listing id' });

    const userId = await getUserId(req.user?.email);
    if (!userId) return res.status(401).json({ message: 'User not found' });

    const existing = await client.query('SELECT id, user_id, property_type FROM listings WHERE id = $1', [listingId]);
    if (existing.rows.length === 0) return res.status(404).json({ message: 'Listing not found' });
    if (existing.rows[0].user_id !== userId) return res.status(403).json({ message: 'You can only edit your own listing' });

    const body = req.body || {};
    const propertyType = (body.property_type || '').trim() || existing.rows[0].property_type;
    const city = (body.city || '').trim();
    const title = (body.title || '').trim();
    if (!city) return res.status(400).json({ message: 'City is required' });
    if (!title) return res.status(400).json({ message: 'Title is required' });

    const files = req.files || [];
    const newPaths = (Array.isArray(files) ? files : [files]).filter(Boolean).map((f) => f.filename);
    let existingImages = [];
    if (body.existing_images) {
      try {
        const parsed = typeof body.existing_images === 'string' ? JSON.parse(body.existing_images) : body.existing_images;
        existingImages = Array.isArray(parsed) ? parsed.filter(Boolean) : [];
      } catch (_) {}
    }
    const imagePaths = [...existingImages, ...newPaths];
    const typePayload = typeof body.type_details === 'string' ? JSON.parse(body.type_details || '{}') : (body.type_details || {});

    await client.query('BEGIN');

    await client.query(
      `UPDATE listings SET
        property_type = $1, city = $2, address = $3, latitude = $4, longitude = $5,
        title = $6, description = $7, area_size = $8, area_unit = $9, rent = $10,
        advance_amount = $11, security_deposit = $12, is_negotiable = $13,
        available_from = $14, available_from_time = $15, contact_email = $16, contact_phone = $17,
        owner_name = $18, whatsapp = $19, sector = $20, landmark = $21, updated_at = CURRENT_TIMESTAMP
       WHERE id = $22 AND user_id = $23`,
      [
        propertyType,
        city,
        body.address || null,
        body.latitude ? parseFloat(body.latitude) : null,
        body.longitude ? parseFloat(body.longitude) : null,
        title,
        body.description || null,
        body.area_size ? parseFloat(body.area_size) : null,
        body.area_unit || null,
        body.rent ? parseFloat(body.rent) : null,
        body.advance_amount != null && body.advance_amount !== '' ? parseFloat(body.advance_amount) : null,
        body.security_deposit != null && body.security_deposit !== '' ? parseFloat(body.security_deposit) : null,
        body.is_negotiable === 'true' || body.is_negotiable === true,
        body.available_from || null,
        body.available_from_time || null,
        body.contact_email || null,
        body.contact_phone || null,
        body.owner_name || null,
        body.whatsapp || null,
        body.sector || null,
        body.landmark || null,
        listingId,
        userId,
      ]
    );

    await client.query(
      `UPDATE listing_extras SET laundry = $1, mess = $2, rooms = $3, bathrooms = $4, kitchen = $5, tv_lounge = $6 WHERE listing_id = $7`,
      [
        body.laundry || null,
        body.mess || null,
        body.rooms ? parseInt(body.rooms, 10) : null,
        body.bathrooms ? parseInt(body.bathrooms, 10) : null,
        body.kitchen ? parseInt(body.kitchen, 10) : null,
        body.tv_lounge ? parseInt(body.tv_lounge, 10) : null,
        listingId,
      ]
    );

    const tableName = TYPE_TABLES[propertyType];
    if (tableName === 'hostel_details') {
      await client.query(
        `UPDATE hostel_details SET hostel_type = $1, beds = $2, room_type = $3, attached_washroom = $4, ac = $5, study_table = $6, wifi = $7, laundry = $8, water_24 = $9, power_backup = $10, security = $11, food_included = $12, preference = $13, smoking_allowed = $14, alcohol_allowed = $15, in_time_rules = $16, available_from_date = $17 WHERE listing_id = $18`,
        [
          typePayload.hostel_type || null,
          typePayload.beds ?? 1,
          typePayload.room_type || null,
          typePayload.attached_washroom || false,
          typePayload.ac || false,
          typePayload.study_table || false,
          typePayload.wifi || false,
          typePayload.laundry || false,
          typePayload.water_24 || false,
          typePayload.power_backup || false,
          typePayload.security || false,
          typePayload.food_included || false,
          typePayload.preference || null,
          typePayload.smoking_allowed || false,
          typePayload.alcohol_allowed || false,
          typePayload.in_time_rules || null,
          typePayload.available_from_date || null,
          listingId,
        ]
      );
    } else if (tableName === 'house_details') {
      await client.query(
        `UPDATE house_details SET portion = $1, bhk = $2, floor = $3, furnished = $4, balcony = $5, modular_kitchen = $6, lift = $7, parking = $8, water_24 = $9, power_backup = $10, security = $11, gated_society = $12, preference = $13, pets_allowed = $14, veg_non_veg = $15, available_from_date = $16 WHERE listing_id = $17`,
        [
          typePayload.portion || null,
          typePayload.bhk || null,
          typePayload.floor ?? 1,
          typePayload.furnished || null,
          typePayload.balcony || false,
          typePayload.modular_kitchen || false,
          typePayload.lift || false,
          typePayload.parking || false,
          typePayload.water_24 || false,
          typePayload.power_backup || false,
          typePayload.security || false,
          typePayload.gated_society || false,
          typePayload.preference || null,
          typePayload.pets_allowed || false,
          typePayload.veg_non_veg || false,
          typePayload.available_from_date || null,
          listingId,
        ]
      );
    } else if (tableName === 'flat_details') {
      await client.query(
        `UPDATE flat_details SET lift = $1, balcony = $2, furnished = $3, generator = $4, parking = $5, modular_kitchen = $6, water_24 = $7, security = $8, gated_society = $9 WHERE listing_id = $10`,
        [
          typePayload.lift || false,
          typePayload.balcony || false,
          typePayload.furnished || null,
          typePayload.generator || false,
          typePayload.parking || false,
          typePayload.modular_kitchen || false,
          typePayload.water_24 || false,
          typePayload.security || false,
          typePayload.gated_society || false,
          listingId,
        ]
      );
    } else if (tableName === 'shop_details') {
      await client.query(
        `UPDATE shop_details SET shop_location = $1, front_width = $2, ceiling_height = $3, front_type = $4, electricity = $5, water = $6, washroom = $7, parking = $8, suitable_for = $9, available_from_date = $10 WHERE listing_id = $11`,
        [
          typePayload.shop_location || null,
          typePayload.front_width ? parseFloat(typePayload.front_width) : null,
          typePayload.ceiling_height ? parseFloat(typePayload.ceiling_height) : null,
          typePayload.front_type || null,
          typePayload.electricity || false,
          typePayload.water || false,
          typePayload.washroom || false,
          typePayload.parking || false,
          typePayload.suitable_for || null,
          typePayload.available_from_date || null,
          listingId,
        ]
      );
    } else if (tableName === 'office_details') {
      await client.query(
        `UPDATE office_details SET floor = $1, furnished = $2, cabins = $3, workstations = $4, conference_room = $5, reception = $6, lift = $7, parking = $8, power_backup = $9, internet_ready = $10, security = $11, suitable_for = $12, available_from_date = $13 WHERE listing_id = $14`,
        [
          typePayload.floor ?? 1,
          typePayload.furnished || null,
          typePayload.cabins ?? 0,
          typePayload.workstations ?? 0,
          typePayload.conference_room || false,
          typePayload.reception || false,
          typePayload.lift || false,
          typePayload.parking || false,
          typePayload.power_backup || false,
          typePayload.internet_ready || false,
          typePayload.security || false,
          typePayload.suitable_for || null,
          typePayload.available_from_date || null,
          listingId,
        ]
      );
    } else if (tableName === 'marquee_details') {
      await client.query(
        `UPDATE marquee_details SET max_guests = $1, ac = $2, stage = $3, bridal_room = $4, parking_capacity = $5, generator = $6, decoration = $7, catering = $8, suitable_for = $9, rent_per_day = $10, rent_per_event = $11, advance_amount = $12, discount = $13, maintenance = $14, security_deposit = $15 WHERE listing_id = $16`,
        [
          typePayload.max_guests ?? 100,
          typePayload.ac || false,
          typePayload.stage || false,
          typePayload.bridal_room || false,
          typePayload.parking_capacity ?? 0,
          typePayload.generator || false,
          typePayload.decoration || false,
          typePayload.catering || null,
          typePayload.suitable_for || null,
          typePayload.rent_per_day ? parseFloat(typePayload.rent_per_day) : null,
          typePayload.rent_per_event ? parseFloat(typePayload.rent_per_event) : null,
          typePayload.advance_amount ? parseFloat(typePayload.advance_amount) : null,
          typePayload.discount || null,
          typePayload.maintenance ? parseFloat(typePayload.maintenance) : null,
          typePayload.security_deposit ? parseFloat(typePayload.security_deposit) : null,
          listingId,
        ]
      );
    } else if (tableName === 'guest_house_details') {
      await client.query(
        `UPDATE guest_house_details SET rooms = $1, ac = $2, attached_bathroom = $3, tv = $4, wifi = $5, room_service = $6, parking = $7, power_backup = $8, preference = $9, available_from_date = $10 WHERE listing_id = $11`,
        [
          typePayload.rooms ?? 1,
          typePayload.ac || false,
          typePayload.attached_bathroom || false,
          typePayload.tv || false,
          typePayload.wifi || false,
          typePayload.room_service || false,
          typePayload.parking || false,
          typePayload.power_backup || false,
          typePayload.preference || null,
          typePayload.available_from_date || null,
          listingId,
        ]
      );
    } else if (tableName === 'farm_house_details') {
      await client.query(
        `UPDATE farm_house_details SET land_size = $1, lawn = $2, garden = $3, rooms = $4, hall = $5, swimming_pool = $6, parking = $7, electricity = $8, water_supply = $9, suitable_for = $10, available_from_date = $11 WHERE listing_id = $12`,
        [
          typePayload.land_size ? parseFloat(typePayload.land_size) : null,
          typePayload.lawn || false,
          typePayload.garden || false,
          typePayload.rooms || false,
          typePayload.hall || false,
          typePayload.swimming_pool || false,
          typePayload.parking || false,
          typePayload.electricity || false,
          typePayload.water_supply || false,
          typePayload.suitable_for || null,
          typePayload.available_from_date || null,
          listingId,
        ]
      );
    }

    if (imagePaths.length > 0) {
      await client.query('DELETE FROM listing_images WHERE listing_id = $1', [listingId]);
      for (let i = 0; i < imagePaths.length; i++) {
        await client.query(
          'INSERT INTO listing_images (listing_id, image_path, sort_order) VALUES ($1, $2, $3)',
          [listingId, imagePaths[i], i]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'Listing updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

/**
 * DELETE /api/listings/:id - Delete own listing (auth, owner only)
 */
const deleteListing = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid listing id' });

    const userId = await getUserId(req.user?.email);
    if (!userId) return res.status(401).json({ message: 'User not found' });

    const r = await pool.query('SELECT id, user_id FROM listings WHERE id = $1', [id]);
    if (r.rows.length === 0) return res.status(404).json({ message: 'Listing not found' });
    if (r.rows[0].user_id !== userId) return res.status(403).json({ message: 'You can only delete your own listing' });

    await pool.query('DELETE FROM listings WHERE id = $1', [id]);
    res.json({ message: 'Listing deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { create, list, getById, reportAd, deleteListing, updateListing };
