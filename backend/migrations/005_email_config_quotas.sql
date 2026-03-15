-- Add per-size daily quota columns to email_configs.
-- small_quota / medium_quota / large_quota define how many outreach
-- emails go to each company size bucket each day.
-- All default to 0 (= no quota set; scheduler falls back to emails_per_day / target_size).
-- Wrapped in a DO block so the migration is idempotent (safe to re-run on every restart).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_configs' AND column_name = 'small_quota'
  ) THEN
    ALTER TABLE email_configs
      ADD COLUMN small_quota  INT NOT NULL DEFAULT 0,
      ADD COLUMN medium_quota INT NOT NULL DEFAULT 0,
      ADD COLUMN large_quota  INT NOT NULL DEFAULT 0;
  END IF;
END $$;
