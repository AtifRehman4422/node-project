-- ============================================================
-- LISTINGS: Main table (common fields) + type-specific tables
-- Run after init-db or add to your migration. User who saved = user_id.
-- ============================================================

-- Main listings table: common fields for all property types
CREATE TABLE IF NOT EXISTS listings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_type VARCHAR(50) NOT NULL,
  city VARCHAR(100) NOT NULL,
  address TEXT,
  latitude DECIMAL(12, 8),
  longitude DECIMAL(12, 8),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  area_size DECIMAL(12, 2),
  area_unit VARCHAR(20),
  rent DECIMAL(14, 2),
  advance_amount DECIMAL(14, 2),
  security_deposit DECIMAL(14, 2),
  is_negotiable BOOLEAN DEFAULT false,
  available_from DATE,
  available_from_time VARCHAR(20),
  contact_email VARCHAR(100),
  contact_phone VARCHAR(30),
  owner_name VARCHAR(100),
  whatsapp VARCHAR(30),
  sector VARCHAR(100),
  landmark VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_listings_user_id ON listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_property_type ON listings(property_type);
CREATE INDEX IF NOT EXISTS idx_listings_city ON listings(city);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at DESC);

-- Multiple images per listing
CREATE TABLE IF NOT EXISTS listing_images (
  id SERIAL PRIMARY KEY,
  listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  image_path VARCHAR(500) NOT NULL,
  sort_order INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_listing_images_listing_id ON listing_images(listing_id);

-- ========== TYPE-SPECIFIC TABLES (one row per listing of that type) ==========

-- Hostel
CREATE TABLE IF NOT EXISTS hostel_details (
  id SERIAL PRIMARY KEY,
  listing_id INTEGER NOT NULL UNIQUE REFERENCES listings(id) ON DELETE CASCADE,
  hostel_type VARCHAR(30),
  beds INT DEFAULT 1,
  room_type VARCHAR(30),
  attached_washroom BOOLEAN DEFAULT false,
  ac BOOLEAN DEFAULT false,
  study_table BOOLEAN DEFAULT false,
  wifi BOOLEAN DEFAULT false,
  laundry BOOLEAN DEFAULT false,
  water_24 BOOLEAN DEFAULT false,
  power_backup BOOLEAN DEFAULT false,
  security BOOLEAN DEFAULT false,
  food_included BOOLEAN DEFAULT false,
  preference VARCHAR(50),
  smoking_allowed BOOLEAN DEFAULT false,
  alcohol_allowed BOOLEAN DEFAULT false,
  in_time_rules TEXT,
  available_from_date DATE
);

-- House
CREATE TABLE IF NOT EXISTS house_details (
  id SERIAL PRIMARY KEY,
  listing_id INTEGER NOT NULL UNIQUE REFERENCES listings(id) ON DELETE CASCADE,
  portion VARCHAR(50),
  bhk VARCHAR(20),
  floor INT DEFAULT 1,
  furnished VARCHAR(30),
  balcony BOOLEAN DEFAULT false,
  modular_kitchen BOOLEAN DEFAULT false,
  lift BOOLEAN DEFAULT false,
  parking BOOLEAN DEFAULT false,
  water_24 BOOLEAN DEFAULT false,
  power_backup BOOLEAN DEFAULT false,
  security BOOLEAN DEFAULT false,
  gated_society BOOLEAN DEFAULT false,
  preference VARCHAR(30),
  pets_allowed BOOLEAN DEFAULT false,
  veg_non_veg BOOLEAN DEFAULT false,
  available_from_date DATE
);

-- Flat
CREATE TABLE IF NOT EXISTS flat_details (
  id SERIAL PRIMARY KEY,
  listing_id INTEGER NOT NULL UNIQUE REFERENCES listings(id) ON DELETE CASCADE,
  lift BOOLEAN DEFAULT false,
  balcony BOOLEAN DEFAULT false,
  furnished VARCHAR(30),
  generator BOOLEAN DEFAULT false,
  parking BOOLEAN DEFAULT false,
  modular_kitchen BOOLEAN DEFAULT false,
  water_24 BOOLEAN DEFAULT false,
  security BOOLEAN DEFAULT false,
  gated_society BOOLEAN DEFAULT false
);

-- Shop
CREATE TABLE IF NOT EXISTS shop_details (
  id SERIAL PRIMARY KEY,
  listing_id INTEGER NOT NULL UNIQUE REFERENCES listings(id) ON DELETE CASCADE,
  shop_location VARCHAR(50),
  front_width DECIMAL(10, 2),
  ceiling_height DECIMAL(10, 2),
  front_type VARCHAR(30),
  electricity BOOLEAN DEFAULT false,
  water BOOLEAN DEFAULT false,
  washroom BOOLEAN DEFAULT false,
  parking BOOLEAN DEFAULT false,
  suitable_for VARCHAR(50),
  available_from_date DATE
);

-- Office
CREATE TABLE IF NOT EXISTS office_details (
  id SERIAL PRIMARY KEY,
  listing_id INTEGER NOT NULL UNIQUE REFERENCES listings(id) ON DELETE CASCADE,
  floor INT DEFAULT 1,
  furnished VARCHAR(30),
  cabins INT DEFAULT 0,
  workstations INT DEFAULT 0,
  conference_room BOOLEAN DEFAULT false,
  reception BOOLEAN DEFAULT false,
  lift BOOLEAN DEFAULT false,
  parking BOOLEAN DEFAULT false,
  power_backup BOOLEAN DEFAULT false,
  internet_ready BOOLEAN DEFAULT false,
  security BOOLEAN DEFAULT false,
  suitable_for VARCHAR(50),
  available_from_date DATE
);

-- Hotel
CREATE TABLE IF NOT EXISTS hotel_details (
  id SERIAL PRIMARY KEY,
  listing_id INTEGER NOT NULL UNIQUE REFERENCES listings(id) ON DELETE CASCADE,
  rooms INT DEFAULT 1,
  ac_type VARCHAR(30),
  clean_beds BOOLEAN DEFAULT false,
  attached_bathroom BOOLEAN DEFAULT false,
  family_rooms BOOLEAN DEFAULT false,
  wifi BOOLEAN DEFAULT false,
  parking BOOLEAN DEFAULT false,
  breakfast BOOLEAN DEFAULT false,
  lunch_dinner BOOLEAN DEFAULT false,
  room_service BOOLEAN DEFAULT false,
  cctv BOOLEAN DEFAULT false,
  security_24 BOOLEAN DEFAULT false,
  safe_env BOOLEAN DEFAULT false,
  near_market BOOLEAN DEFAULT false,
  near_bus_stand BOOLEAN DEFAULT false,
  near_tourist BOOLEAN DEFAULT false,
  laundry BOOLEAN DEFAULT false,
  swimming_pool BOOLEAN DEFAULT false,
  gym BOOLEAN DEFAULT false,
  conference_hall BOOLEAN DEFAULT false,
  available_from_date DATE
);

-- Marquee / Banquet
CREATE TABLE IF NOT EXISTS marquee_details (
  id SERIAL PRIMARY KEY,
  listing_id INTEGER NOT NULL UNIQUE REFERENCES listings(id) ON DELETE CASCADE,
  max_guests INT DEFAULT 100,
  ac BOOLEAN DEFAULT false,
  stage BOOLEAN DEFAULT false,
  bridal_room BOOLEAN DEFAULT false,
  parking_capacity INT DEFAULT 0,
  generator BOOLEAN DEFAULT false,
  decoration BOOLEAN DEFAULT false,
  catering VARCHAR(30),
  suitable_for VARCHAR(50),
  rent_per_day DECIMAL(14, 2),
  rent_per_event DECIMAL(14, 2),
  advance_amount DECIMAL(14, 2),
  discount TEXT,
  maintenance DECIMAL(14, 2),
  security_deposit DECIMAL(14, 2)
);

-- Guest House
CREATE TABLE IF NOT EXISTS guest_house_details (
  id SERIAL PRIMARY KEY,
  listing_id INTEGER NOT NULL UNIQUE REFERENCES listings(id) ON DELETE CASCADE,
  rooms INT DEFAULT 1,
  ac BOOLEAN DEFAULT false,
  attached_bathroom BOOLEAN DEFAULT false,
  tv BOOLEAN DEFAULT false,
  wifi BOOLEAN DEFAULT false,
  room_service BOOLEAN DEFAULT false,
  parking BOOLEAN DEFAULT false,
  power_backup BOOLEAN DEFAULT false,
  preference VARCHAR(30),
  available_from_date DATE
);

-- Farm House
CREATE TABLE IF NOT EXISTS farm_house_details (
  id SERIAL PRIMARY KEY,
  listing_id INTEGER NOT NULL UNIQUE REFERENCES listings(id) ON DELETE CASCADE,
  land_size DECIMAL(12, 2),
  lawn BOOLEAN DEFAULT false,
  garden BOOLEAN DEFAULT false,
  rooms BOOLEAN DEFAULT false,
  hall BOOLEAN DEFAULT false,
  swimming_pool BOOLEAN DEFAULT false,
  parking BOOLEAN DEFAULT false,
  electricity BOOLEAN DEFAULT false,
  water_supply BOOLEAN DEFAULT false,
  suitable_for VARCHAR(50),
  available_from_date DATE
);

-- Common extra fields for event properties (laundry, mess used in form)
CREATE TABLE IF NOT EXISTS listing_extras (
  id SERIAL PRIMARY KEY,
  listing_id INTEGER NOT NULL UNIQUE REFERENCES listings(id) ON DELETE CASCADE,
  laundry VARCHAR(10),
  mess VARCHAR(10),
  rooms INT,
  bathrooms INT,
  kitchen INT,
  tv_lounge INT
);
