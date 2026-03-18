-- Migration 008: Support multiple templates per email type
-- Each type can have up to 5 templates. Exactly one must be active per type.
-- The old UNIQUE(type) constraint is replaced with a name+type unique pair.

-- Step 1: Add a "name" column to identify template variants within a type.
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS name VARCHAR(100) NOT NULL DEFAULT 'Default';

-- Step 2: Drop the old UNIQUE constraint on type so we can have multiple rows per type.
-- The constraint name from 001_init.sql is the auto-generated one: email_templates_type_key
ALTER TABLE email_templates DROP CONSTRAINT IF EXISTS email_templates_type_key;

-- Step 3: Add a new UNIQUE constraint on (type, name) to prevent duplicate names within a type.
DO $$ BEGIN
    ALTER TABLE email_templates ADD CONSTRAINT email_templates_type_name_key UNIQUE (type, name);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- Step 4: Create a partial unique index so at most ONE active template exists per type.
-- This is the database-level guarantee for "only one active template per section".
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_templates_active_per_type
  ON email_templates (type) WHERE is_active = TRUE;
