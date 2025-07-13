-- Dzinza Database Data Initialization Script
-- Initial seed data for Dzinza application
-- REVIEW: This script has been updated to be fully idempotent.

-- Insert default admin user (password: AdminPassword123!)
-- This user is created for initial setup and should have password changed in production
-- Password hash generated with: bcrypt.hashSync('AdminPassword123!', 12)
INSERT INTO users (
    email, 
    username, 
    password_hash, 
    first_name, 
    last_name, 
    email_verified, 
    email_verified_at,
    role,
    is_superuser,
    is_active
) 
VALUES (
    'admin@dzinza.org',
    'admin',
    '$2a$12$RjWxsKktGGD9crf7VQwrzegIB4bFLx5t.sGCfYalaHa/4uUy15TVu',
    'Admin',
    'User',
    true,
    CURRENT_TIMESTAMP,
    'ADMIN',
    true,
    true
) ON CONFLICT (email) DO UPDATE 
SET 
    is_active = true, 
    email_verified = true,
    email_verified_at = COALESCE(users.email_verified_at, CURRENT_TIMESTAMP),
    role = 'ADMIN',
    is_superuser = true,
    updated_at = CURRENT_TIMESTAMP;

-- Insert a test user for development (password: TestPassword123!)
-- Password hash generated with: bcrypt.hashSync('TestPassword123!', 12)
INSERT INTO users (
    email, 
    username, 
    password_hash, 
    first_name, 
    last_name, 
    email_verified, 
    email_verified_at,
    role,
    is_superuser,
    is_active
) 
VALUES (
    'test@dzinza.com',
    'testuser',
    '$2a$12$c573zjncgdSPlXDn1CJtmuFQeHEGDAujGAvoQPx.KN7biTf5GGh2q',
    'Test',
    'User',
    true,
    CURRENT_TIMESTAMP,
    'USER',
    false,
    true
) ON CONFLICT (email) DO UPDATE 
SET 
    is_active = true, 
    email_verified = true,
    email_verified_at = COALESCE(users.email_verified_at, CURRENT_TIMESTAMP),
    updated_at = CURRENT_TIMESTAMP;


-- Ensure unique constraint exists for (owner_id, name) to support ON CONFLICT
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'family_trees' AND tc.constraint_type = 'UNIQUE'
        AND ccu.column_name = 'owner_id'
    ) THEN
        EXECUTE 'ALTER TABLE family_trees ADD CONSTRAINT unique_owner_name UNIQUE (owner_id, name)';
    END IF;
END;
$$;

DO $$ 
DECLARE
    admin_user_id UUID;
    test_user_id UUID;
    default_tree_id UUID;
BEGIN
    -- Get the admin and test user IDs
    SELECT id INTO admin_user_id FROM users WHERE email = 'admin@dzinza.org' LIMIT 1;
    SELECT id INTO test_user_id FROM users WHERE email = 'test@dzinza.com' LIMIT 1;
    
    -- Create admin user's family tree if it doesn't exist
    IF admin_user_id IS NOT NULL THEN
        INSERT INTO family_trees (name, description, owner_id, privacy)
        VALUES ('My Family Tree', 'Default family tree created during initialization', admin_user_id, 'private')
        ON CONFLICT (owner_id, name) DO NOTHING;

        SELECT id INTO default_tree_id FROM family_trees WHERE owner_id = admin_user_id AND name = 'My Family Tree' LIMIT 1;

        IF default_tree_id IS NOT NULL THEN
            INSERT INTO tree_members (tree_id, user_id, role)
            VALUES (default_tree_id, admin_user_id, 'admin')
            ON CONFLICT (tree_id, user_id) DO NOTHING;
        END IF;
    END IF;
    
    -- Create test user's family tree if it doesn't exist
    IF test_user_id IS NOT NULL THEN
        INSERT INTO family_trees (name, description, owner_id, privacy)
        VALUES ('Test Family Tree', 'Default family tree created for test user during initialization', test_user_id, 'private')
        ON CONFLICT (owner_id, name) DO NOTHING;

        SELECT id INTO default_tree_id FROM family_trees WHERE owner_id = test_user_id AND name = 'Test Family Tree' LIMIT 1;

        IF default_tree_id IS NOT NULL THEN
            INSERT INTO tree_members (tree_id, user_id, role)
            VALUES (default_tree_id, test_user_id, 'admin')
            ON CONFLICT (tree_id, user_id) DO NOTHING;
        END IF;
    END IF;
END $$;
