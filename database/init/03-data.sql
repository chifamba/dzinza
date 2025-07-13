-- Dzinza Database Data Initialization Script
-- Initial seed data for Dzinza application

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
    email_verified_at = CURRENT_TIMESTAMP,
    role = 'ADMIN',
    is_superuser = true;

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
    email_verified_at = CURRENT_TIMESTAMP;

-- Create default family trees for users
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
    SELECT ft.id INTO default_tree_id 
    FROM family_trees ft 
    WHERE ft.owner_id = admin_user_id 
    LIMIT 1;
    
    IF admin_user_id IS NOT NULL AND default_tree_id IS NULL THEN
        INSERT INTO family_trees (
            name, 
            description, 
            owner_id, 
            privacy
        ) VALUES (
            'My Family Tree',
            'Default family tree created during initialization',
            admin_user_id,
            'private'
        )
        RETURNING id INTO default_tree_id;
        
        -- Add admin as a member with admin role
        INSERT INTO tree_members (
            tree_id,
            user_id,
            role
        ) VALUES (
            default_tree_id,
            admin_user_id,
            'admin'
        );
        
        RAISE NOTICE 'Created default family tree (ID: %) for admin user', default_tree_id;
    END IF;
    
    -- Create test user's family tree if it doesn't exist
    SELECT ft.id INTO default_tree_id 
    FROM family_trees ft 
    WHERE ft.owner_id = test_user_id 
    LIMIT 1;
    
    IF test_user_id IS NOT NULL AND default_tree_id IS NULL THEN
        INSERT INTO family_trees (
            name, 
            description, 
            owner_id, 
            privacy
        ) VALUES (
            'Test Family Tree',
            'Default family tree created for test user during initialization',
            test_user_id,
            'private'
        )
        RETURNING id INTO default_tree_id;
        
        -- Add test user as a member with admin role
        INSERT INTO tree_members (
            tree_id,
            user_id,
            role
        ) VALUES (
            default_tree_id,
            test_user_id,
            'admin'
        );
        
        RAISE NOTICE 'Created default family tree (ID: %) for test user', default_tree_id;
    END IF;
END $$;
