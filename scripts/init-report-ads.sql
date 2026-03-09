-- ============================================================
-- REPORT_ADS: User reports for listings (abuse / incorrect info)
-- Run after init-listings.sql so listings & users tables exist.
-- ============================================================

CREATE TABLE IF NOT EXISTS report_ads (
  id SERIAL PRIMARY KEY,
  listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  reported_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_by_email VARCHAR(150),
  reason TEXT NOT NULL,
  details TEXT,
  reporter_contact VARCHAR(150),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_report_ads_listing_id ON report_ads(listing_id);
CREATE INDEX IF NOT EXISTS idx_report_ads_user_id ON report_ads(reported_by_user_id);

