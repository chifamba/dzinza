-- Create a default family tree for the default admin user
-- This script assumes the users table has been initialized and the admin user exists

-- Check if family_trees table exists, create it if not
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'family_trees'
    ) THEN
        -- Create a basic family_trees table if it doesn't exist
        -- The actual schema might be more complex, but this is for initialization only
        CREATE TABLE family_trees (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL,
            description TEXT,
            owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
            privacy VARCHAR(50) DEFAULT 'private',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Create a table for tree members if it doesn't exist
        CREATE TABLE IF NOT EXISTS tree_members (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            tree_id UUID REFERENCES family_trees(id) ON DELETE CASCADE,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            role VARCHAR(50) DEFAULT 'viewer', -- viewer, editor, admin
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(tree_id, user_id)
        );
    END IF;
END $$;

-- Insert a default family tree for the admin user if one doesn't exist yet
DO $$ 
DECLARE
    admin_user_id UUID;
    default_tree_id UUID;
BEGIN
    -- Get the admin user ID
    SELECT id INTO admin_user_id FROM users WHERE email = 'admin@dzinza.org' LIMIT 1;
    
    -- Check if the user already has a family tree
    SELECT ft.id INTO default_tree_id 
    FROM family_trees ft 
    WHERE ft.owner_id = admin_user_id 
    LIMIT 1;
    
    -- If admin user exists and doesn't have a tree yet, create one
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
    ELSIF default_tree_id IS NOT NULL THEN
        RAISE NOTICE 'Admin user already has a family tree (ID: %)', default_tree_id;
    ELSIF admin_user_id IS NULL THEN
        RAISE NOTICE 'Admin user not found. No default tree created.';
    END IF;
    
    -- Do the same for the test user
    SELECT id INTO admin_user_id FROM users WHERE email = 'test@dzinza.com' LIMIT 1;
    
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
            'Test Family Tree',
            'Default family tree created for test user during initialization',
            admin_user_id,
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
            admin_user_id,
            'admin'
        );
        
        RAISE NOTICE 'Created default family tree (ID: %) for test user', default_tree_id;
    ELSIF default_tree_id IS NOT NULL THEN
        RAISE NOTICE 'Test user already has a family tree (ID: %)', default_tree_id;
    ELSIF admin_user_id IS NULL THEN
        RAISE NOTICE 'Test user not found. No default tree created.';
    END IF;
END $$;
