-- Dzinza Database Patch Script
-- REVIEW: This script has been updated to be fully idempotent and more robust.

-- Dzinza Database Cleanup & Migration Script
-- This script handles cleanup of deprecated columns, fixes data inconsistencies,
-- and ensures data migration between schema versions

-- Function to help with safe migrations

DO $$
BEGIN
    -- Patch to make username column nullable for user registration
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='users' AND column_name='username' AND is_nullable = 'NO'
    ) THEN
        RAISE NOTICE 'Making users.username nullable';
        EXECUTE 'ALTER TABLE users ALTER COLUMN username DROP NOT NULL';
    END IF;

    -- Drop deprecated columns from users table (safe to run repeatedly)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_admin') THEN
        EXECUTE 'ALTER TABLE users DROP COLUMN is_admin';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='two_factor_enabled') THEN
        EXECUTE 'ALTER TABLE users DROP COLUMN two_factor_enabled';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='two_factor_secret') THEN
        EXECUTE 'ALTER TABLE users DROP COLUMN two_factor_secret';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='backup_codes') THEN
        EXECUTE 'ALTER TABLE users DROP COLUMN backup_codes';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_login') THEN
        EXECUTE 'ALTER TABLE users DROP COLUMN last_login';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='language') THEN
        EXECUTE 'ALTER TABLE users DROP COLUMN language';
    END IF;

    -- Drop any temporary columns created during migrations
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='role_new') THEN
        EXECUTE 'ALTER TABLE users DROP COLUMN role_new';
    END IF;

    -- Process any data migrations for existing family members
    UPDATE family_members 
    SET name = get_full_name(first_name, middle_name, last_name, nickname)
    WHERE (name IS NULL OR name = '') 
    AND (first_name IS NOT NULL OR middle_name IS NOT NULL OR last_name IS NOT NULL OR nickname IS NOT NULL);
END;
$$;

-- If we're missing any enum values for userrole, fix them here
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'USER' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'userrole')) THEN
        EXECUTE 'ALTER TYPE userrole ADD VALUE ''USER''';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ADMIN' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'userrole')) THEN
        EXECUTE 'ALTER TYPE userrole ADD VALUE ''ADMIN''';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'MODERATOR' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'userrole')) THEN
        EXECUTE 'ALTER TYPE userrole ADD VALUE ''MODERATOR''';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Enum value already exists, skipping.';
END;
$$;

-- Convert any lowercase enum values to uppercase if they exist
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN 
        SELECT id, role FROM users 
        WHERE role::text IN ('user', 'admin', 'moderator')
    LOOP
        UPDATE users 
        SET role = UPPER(user_record.role::text)::userrole 
        WHERE id = user_record.id;
    END LOOP;
END;
$$;

-- Verify critical schema elements
DO $$
BEGIN
    -- Check if important columns exist, add if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email_verified_at') THEN
        RAISE NOTICE 'Adding missing column email_verified_at to users table';
        ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMP WITH TIME ZONE;
        
        -- Update existing values
        UPDATE users SET email_verified_at = created_at WHERE email_verified = true AND email_verified_at IS NULL;
    END IF;
    
    -- Other checks can be added here
END $$;
