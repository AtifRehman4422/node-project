-- Add advance_amount and security_deposit to listings (rent & financials).
-- Run this on existing DBs that were created before these columns existed.
ALTER TABLE listings ADD COLUMN IF NOT EXISTS advance_amount DECIMAL(14, 2);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS security_deposit DECIMAL(14, 2);
