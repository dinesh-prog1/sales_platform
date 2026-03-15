-- Make email_logs.company_id nullable to support demo confirmation emails
-- sent to external (non-platform) companies that have no company record.
-- Wrapped in DO block so it is idempotent (safe to run on every restart).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_logs'
      AND column_name = 'company_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE email_logs ALTER COLUMN company_id DROP NOT NULL;
  END IF;
END $$;
