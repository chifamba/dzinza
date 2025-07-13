-- Dzinza Database Patch Script
-- This script contains all necessary schema modifications and data migrations.

-- Patch to make username column nullable for user registration
-- This allows the auth service to generate usernames from email when not provided
ALTER TABLE users ALTER COLUMN username DROP NOT NULL;

-- Dzinza Database Cleanup & Migration Script
-- This script handles cleanup of deprecated columns, fixes data inconsistencies,
-- and ensures data migration between schema versions

-- Function to help with safe migrations
CREATE OR REPLACE FUNCTION safe_migrate()
RETURNS VOID AS $$
BEGIN
    -- Drop deprecated columns from users table (safe to run repeatedly)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_admin') THEN
        ALTER TABLE users DROP COLUMN is_admin;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='two_factor_enabled') THEN
        ALTER TABLE users DROP COLUMN two_factor_enabled;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='two_factor_secret') THEN
        ALTER TABLE users DROP COLUMN two_factor_secret;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='backup_codes') THEN
        ALTER TABLE users DROP COLUMN backup_codes;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_login') THEN
        ALTER TABLE users DROP COLUMN last_login;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='language') THEN
        ALTER TABLE users DROP COLUMN language;
    END IF;

    -- Drop any temporary columns created during migrations
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='role_new') THEN
        ALTER TABLE users DROP COLUMN role_new;
    END IF;

    -- Process any data migrations for existing family members
    -- This updates the name field for any records with name components but no computed name
    UPDATE family_members 
    SET name = get_full_name(first_name, middle_name, last_name, nickname)
    WHERE name IS NULL OR name = '' 
    AND (first_name IS NOT NULL OR middle_name IS NOT NULL OR last_name IS NOT NULL OR nickname IS NOT NULL);

    -- Ensure all timestamp columns use the current timezone setting
    UPDATE users SET updated_at = updated_at WHERE updated_at IS NOT NULL;
    UPDATE family_trees SET updated_at = updated_at WHERE updated_at IS NOT NULL;
    UPDATE family_members SET updated_at = updated_at WHERE updated_at IS NOT NULL;
    
    -- If we're missing any enum values for userrole, fix them here
    -- This is a common issue when models and database get out of sync
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'USER' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'userrole')) THEN
            ALTER TYPE userrole ADD VALUE 'USER' BEFORE 'ADMIN';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ADMIN' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'userrole')) THEN
            ALTER TYPE userrole ADD VALUE 'ADMIN';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'MODERATOR' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'userrole')) THEN
            ALTER TYPE userrole ADD VALUE 'MODERATOR';
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
            CASE user_record.role::text
                WHEN 'user' THEN
                    UPDATE users SET role = 'USER' WHERE id = user_record.id;
                WHEN 'admin' THEN
                    UPDATE users SET role = 'ADMIN' WHERE id = user_record.id;
                WHEN 'moderator' THEN
                    UPDATE users SET role = 'MODERATOR' WHERE id = user_record.id;
                ELSE
                    -- Do nothing
            END CASE;
        END LOOP;
    END;
    $$;
END;
$$ LANGUAGE plpgsql;

-- Execute the safe migration function
SELECT safe_migrate();

-- Drop the migration function (cleanup)
DROP FUNCTION IF EXISTS safe_migrate();

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
