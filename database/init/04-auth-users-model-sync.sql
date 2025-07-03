-- Migration: Add missing columns and enum for users table to match SQLAlchemy model

-- Create ENUM type for role if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'userrole') THEN
        CREATE TYPE userrole AS ENUM ('user', 'admin', 'moderator');
    END IF;
END$$;

-- Add missing columns if not exist
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_superuser BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS role userrole NOT NULL DEFAULT 'user',
    ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS mfa_secret VARCHAR(255),
    ADD COLUMN IF NOT EXISTS pending_mfa_secret VARCHAR(255),
    ADD COLUMN IF NOT EXISTS pending_mfa_secret_expires_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS mfa_backup_codes_hashed TEXT,
    ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(255),
    ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'en';

-- Migrate old language and is_admin fields to new columns, then drop them
DO $$
BEGIN
    -- Copy language to preferred_language if preferred_language is NULL
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='language') THEN
        UPDATE users SET preferred_language = language WHERE preferred_language IS NULL AND language IS NOT NULL;
    END IF;
    -- Copy is_admin to is_superuser if is_superuser is NULL
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_admin') THEN
        UPDATE users SET is_superuser = is_admin WHERE is_superuser IS NULL AND is_admin IS NOT NULL;
    END IF;
END$$;

-- Drop deprecated columns (safe to run repeatedly)
ALTER TABLE users DROP COLUMN IF EXISTS is_admin;
ALTER TABLE users DROP COLUMN IF EXISTS two_factor_enabled;
ALTER TABLE users DROP COLUMN IF EXISTS two_factor_secret;
ALTER TABLE users DROP COLUMN IF EXISTS backup_codes;
ALTER TABLE users DROP COLUMN IF EXISTS last_login;
ALTER TABLE users DROP COLUMN IF EXISTS language;
