-- 002: Demo booking enhancements + company search index

-- Add booker fields to demo_bookings (for public/external bookings)
ALTER TABLE demo_bookings
  ADD COLUMN IF NOT EXISTS booker_name    VARCHAR(255),
  ADD COLUMN IF NOT EXISTS booker_email   VARCHAR(255),
  ADD COLUMN IF NOT EXISTS booker_company VARCHAR(255),
  ADD COLUMN IF NOT EXISTS time_slot      VARCHAR(50);

-- Add time_slot check constraint safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'demo_bookings_time_slot_check'
  ) THEN
    ALTER TABLE demo_bookings
      ADD CONSTRAINT demo_bookings_time_slot_check
      CHECK (time_slot IN ('morning', 'afternoon', 'evening'));
  END IF;
END $$;

-- Allow NULL company_id for external/public bookings (company not in DB)
ALTER TABLE demo_bookings ALTER COLUMN company_id DROP NOT NULL;

-- Unique index: prevent double-booking same date+slot (ignore cancelled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_demo_bookings_date_slot'
  ) THEN
    CREATE UNIQUE INDEX idx_demo_bookings_date_slot
      ON demo_bookings (DATE(scheduled_at AT TIME ZONE 'UTC'), time_slot)
      WHERE status NOT IN ('cancelled');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_demo_bookings_scheduled_date
  ON demo_bookings (DATE(scheduled_at AT TIME ZONE 'UTC'));

-- Index for company name search (trigram-style via ILIKE)
CREATE INDEX IF NOT EXISTS idx_companies_name_lower
  ON companies (LOWER(name));

-- Add cron_schedule_hour column to email_configs (default 9 = 9 AM)
ALTER TABLE email_configs
  ADD COLUMN IF NOT EXISTS cron_hour INT NOT NULL DEFAULT 9
    CHECK (cron_hour >= 0 AND cron_hour <= 23);

-- Add department (normalized industry category) column to companies
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS department VARCHAR(100);

-- Backfill department from industry (will be kept in sync via app layer)
UPDATE companies SET department = industry WHERE department IS NULL;
