-- 003: Allow trials without a company record (for external/public demo bookers)

-- Make company_id nullable in trials
ALTER TABLE trials ALTER COLUMN company_id DROP NOT NULL;

-- Add booker fields so we can track external trial contacts
ALTER TABLE trials
  ADD COLUMN IF NOT EXISTS demo_id        UUID REFERENCES demo_bookings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS booker_name    VARCHAR(255),
  ADD COLUMN IF NOT EXISTS booker_email   VARCHAR(255),
  ADD COLUMN IF NOT EXISTS booker_company VARCHAR(255);

-- Allow no_trial as a demo status (when rep clicks "No")
ALTER TABLE demo_bookings DROP CONSTRAINT IF EXISTS demo_bookings_status_check;
ALTER TABLE demo_bookings ADD CONSTRAINT demo_bookings_status_check
  CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show', 'no_trial'));
