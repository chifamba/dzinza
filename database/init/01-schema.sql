-- Dzinza Database Schema Initialization Script
-- Consolidated schema definitions for all tables, types, functions, and indexes

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create user role enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'userrole') THEN
        CREATE TYPE userrole AS ENUM ('USER', 'ADMIN', 'MODERATOR');
    END IF;
END$$;

-----------------------------------------
-- Core Authentication & User Management
-----------------------------------------

-- Users table for authentication and profile data
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(20),
    profile_picture_url TEXT,
    bio TEXT,
    location JSONB, -- {country, state, city, coordinates}
    
    -- Authentication
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    email_verification_token VARCHAR(255),
    email_verification_expires TIMESTAMP WITH TIME ZONE,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    
    -- Security
    is_superuser BOOLEAN DEFAULT FALSE,
    role userrole NOT NULL DEFAULT 'USER',
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    pending_mfa_secret VARCHAR(255),
    pending_mfa_secret_expires_at TIMESTAMP WITH TIME ZONE,
    mfa_backup_codes_hashed TEXT,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_login_ip VARCHAR(255),
    last_login_user_agent TEXT,
    current_session_count INTEGER DEFAULT 0,
    max_concurrent_sessions INTEGER DEFAULT 5,
    
    -- Privacy & Preferences
    privacy_settings JSONB DEFAULT '{}',
    notification_preferences JSONB DEFAULT '{}',
    preferred_language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Subscription & Billing
    subscription_tier VARCHAR(50) DEFAULT 'free', -- free, basic, premium, enterprise
    subscription_status VARCHAR(20) DEFAULT 'active',
    subscription_expires TIMESTAMP WITH TIME ZONE,
    billing_info JSONB,
    
    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- User sessions for JWT token management
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_jti VARCHAR(255) NOT NULL, -- JWT ID for token invalidation
    refresh_token_hash VARCHAR(255),
    device_info JSONB, -- Browser, OS, IP, etc.
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Refresh Tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    token_jti VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP WITH TIME ZONE,
    ip_address VARCHAR(255),
    user_agent TEXT,
    session_id VARCHAR(255),
    device_fingerprint VARCHAR(255),
    location_info TEXT
);

-- User login attempts and security logs
CREATE TABLE IF NOT EXISTS user_security_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- login, failed_login, password_change, etc.
    ip_address INET,
    user_agent TEXT,
    location JSONB,
    success BOOLEAN DEFAULT TRUE,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    ip_address VARCHAR(100),
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    details JSONB
);

-----------------------------------------
-- DNA Testing & Matching
-----------------------------------------

-- DNA test results and matching
CREATE TABLE IF NOT EXISTS dna_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    test_provider VARCHAR(50) NOT NULL, -- 23andme, ancestrydna, myheritage, etc.
    test_type VARCHAR(50) NOT NULL, -- autosomal, Y-DNA, mtDNA
    raw_data_file_url TEXT,
    processed_data JSONB,
    ethnicity_estimates JSONB,
    health_data JSONB,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processing_status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, error
    privacy_level VARCHAR(20) DEFAULT 'private', -- private, family, public
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- DNA matches between users
CREATE TABLE IF NOT EXISTS dna_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user1_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user2_id UUID REFERENCES users(id) ON DELETE CASCADE,
    test1_id UUID REFERENCES dna_tests(id) ON DELETE CASCADE,
    test2_id UUID REFERENCES dna_tests(id) ON DELETE CASCADE,
    
    -- Match metrics
    shared_dna_cm DECIMAL(8,2), -- Centimorgans
    shared_dna_percentage DECIMAL(5,4),
    longest_segment_cm DECIMAL(8,2),
    estimated_relationship VARCHAR(100),
    confidence_score DECIMAL(3,2),
    
    -- Chromosomal data
    shared_segments JSONB, -- Array of chromosome segments
    
    -- Communication
    is_contacted BOOLEAN DEFAULT FALSE,
    contact_initiated_by UUID REFERENCES users(id),
    notes TEXT,
    
    -- Status
    match_status VARCHAR(20) DEFAULT 'new', -- new, reviewed, confirmed, disputed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user1_id, user2_id, test1_id, test2_id)
);

-----------------------------------------
-- Family Trees & Genealogy
-----------------------------------------

-- Family Trees table
CREATE TABLE IF NOT EXISTS family_trees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    privacy VARCHAR(50) DEFAULT 'private',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Family Members table
CREATE TABLE IF NOT EXISTS family_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    middle_name VARCHAR(100),
    last_name VARCHAR(100),
    nickname VARCHAR(100),
    gender VARCHAR(50) DEFAULT 'unknown',
    birth_date DATE,
    death_date DATE,
    place_of_birth VARCHAR(255),
    place_of_death VARCHAR(255),
    occupation VARCHAR(255),
    biography TEXT,
    notes TEXT,
    profile_image_url TEXT,
    parent_ids JSONB DEFAULT '[]'::jsonb,
    child_ids JSONB DEFAULT '[]'::jsonb,
    spouse_ids JSONB DEFAULT '[]'::jsonb,
    tree_id UUID NOT NULL REFERENCES family_trees(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Family Relationships table
CREATE TABLE IF NOT EXISTS family_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    relationship_type VARCHAR(50) NOT NULL CHECK (relationship_type IN ('SPOUSE', 'PARENT_CHILD', 'SIBLING')),
    person1_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    person2_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    tree_id UUID NOT NULL REFERENCES family_trees(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(person1_id, person2_id, relationship_type)
);

-- Tree Members table
CREATE TABLE IF NOT EXISTS tree_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tree_id UUID REFERENCES family_trees(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'viewer', -- viewer, editor, admin
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tree_id, user_id)
);

-- Family tree permissions and sharing
CREATE TABLE IF NOT EXISTS family_tree_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tree_id VARCHAR(255) NOT NULL, -- MongoDB ObjectId
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES users(id) ON DELETE CASCADE,
    permission_level VARCHAR(20) NOT NULL, -- view, edit, admin
    can_invite_others BOOLEAN DEFAULT FALSE,
    can_export BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-----------------------------------------
-- File Storage & Historical Records
-----------------------------------------

-- File storage metadata (synced with MongoDB)
CREATE TABLE IF NOT EXISTS file_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mongo_file_id VARCHAR(255) NOT NULL, -- MongoDB ObjectId
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    
    -- Storage info
    s3_key VARCHAR(500) NOT NULL,
    s3_bucket VARCHAR(100) NOT NULL,
    storage_class VARCHAR(50) DEFAULT 'STANDARD',
    
    -- Access control
    is_public BOOLEAN DEFAULT FALSE,
    access_level VARCHAR(20) DEFAULT 'private', -- private, family, public
    
    -- Processing status
    processing_status VARCHAR(20) DEFAULT 'pending',
    thumbnail_generated BOOLEAN DEFAULT FALSE,
    virus_scanned BOOLEAN DEFAULT FALSE,
    scan_result VARCHAR(20), -- clean, infected, unknown
    
    -- Genealogy context
    related_person_ids TEXT[], -- Array of person IDs
    family_tree_id VARCHAR(255), -- MongoDB ObjectId
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Historical records and sources
CREATE TABLE IF NOT EXISTS historical_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Record identification
    record_type VARCHAR(50) NOT NULL, -- birth, death, marriage, census, military, etc.
    source_type VARCHAR(50) NOT NULL, -- government, church, newspaper, etc.
    source_name VARCHAR(255),
    source_location VARCHAR(255),
    record_date DATE,
    record_location JSONB, -- {country, state, county, city}
    
    -- Content
    title VARCHAR(255) NOT NULL,
    description TEXT,
    transcription TEXT,
    
    -- People involved
    people_mentioned JSONB, -- Array of person objects
    primary_person_id VARCHAR(255), -- MongoDB ObjectId
    
    -- Files
    image_files TEXT[], -- S3 keys or URLs
    document_files TEXT[],
    
    -- Verification
    verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES users(id),
    verification_notes TEXT,
    
    -- Privacy
    is_public BOOLEAN DEFAULT FALSE,
    access_level VARCHAR(20) DEFAULT 'private',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-----------------------------------------
-- Billing & Subscriptions
-----------------------------------------

-- User subscriptions and billing
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Subscription details
    plan_name VARCHAR(50) NOT NULL,
    plan_type VARCHAR(20) NOT NULL, -- monthly, yearly
    status VARCHAR(20) NOT NULL, -- active, cancelled, expired, past_due
    
    -- Pricing
    amount_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Billing cycle
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    trial_start TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    
    -- External integration
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    
    -- Cancellation
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    cancellation_reason VARCHAR(255),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-----------------------------------------
-- Events
-----------------------------------------

-- Events table for storing life events related to family members
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    place JSONB, -- {name, country, state, city, coordinates}
    category VARCHAR(50), -- birth, marriage, death, migration, etc.
    related_person_ids JSONB DEFAULT '[]'::jsonb, -- Array of family member IDs
    family_tree_id UUID REFERENCES family_trees(id) ON DELETE CASCADE,
    privacy VARCHAR(20) DEFAULT 'private', -- private, family, public
    notes TEXT,
    source_ids JSONB DEFAULT '[]'::jsonb, -- Array of historical record IDs or references
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-----------------------------------------
-- Notifications
-----------------------------------------

-- Notifications table for user alerts and messages
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- system, family_tree_update, dna_match, etc.
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    related_entity_type VARCHAR(50), -- event, family_member, dna_match, etc.
    related_entity_id UUID, -- Reference to the related entity
    metadata JSONB DEFAULT '{}', -- Additional data about the notification
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-----------------------------------------
-- Comments
-----------------------------------------

-- Comments table for user comments on various entities
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- event, family_member, historical_record, etc.
    entity_id UUID NOT NULL, -- Reference to the entity being commented on
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- For threaded replies
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMP WITH TIME ZONE,
    is_flagged BOOLEAN DEFAULT FALSE,
    flagged_reason VARCHAR(255),
    privacy VARCHAR(20) DEFAULT 'public', -- public, family, private
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-----------------------------------------
-- Helper Functions
-----------------------------------------

-- Function to compute full name from name components
CREATE OR REPLACE FUNCTION get_full_name(first_name TEXT, middle_name TEXT, last_name TEXT, nickname TEXT)
RETURNS TEXT AS $$
DECLARE
    formal_name TEXT;
BEGIN
    -- Try to build formal name first
    formal_name := trim(concat_ws(' ', 
        NULLIF(first_name, ''), 
        NULLIF(middle_name, ''), 
        NULLIF(last_name, '')
    ));
    
    -- If formal name exists, return it; otherwise return nickname
    IF formal_name IS NOT NULL AND formal_name != '' THEN
        RETURN formal_name;
    ELSE
        RETURN NULLIF(nickname, '');
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger function for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update the name field from name components
CREATE OR REPLACE FUNCTION update_full_name()
RETURNS TRIGGER AS $$
BEGIN
    NEW.name = get_full_name(NEW.first_name, NEW.middle_name, NEW.last_name, NEW.nickname);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-----------------------------------------
-- Indexes
-----------------------------------------

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_jti ON user_sessions(token_jti);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Refresh Tokens
CREATE INDEX IF NOT EXISTS refresh_tokens_token_idx ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS refresh_tokens_token_jti_idx ON refresh_tokens(token_jti);
CREATE INDEX IF NOT EXISTS refresh_tokens_user_id_idx ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_session_id_idx ON refresh_tokens(session_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_device_fingerprint_idx ON refresh_tokens(device_fingerprint);


-- Security
CREATE INDEX IF NOT EXISTS idx_user_security_logs_user_id ON user_security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_security_logs_event_type ON user_security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_user_security_logs_created_at ON user_security_logs(created_at);

-- Audit Logs
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_timestamp_idx ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs(action);

-- DNA
CREATE INDEX IF NOT EXISTS idx_dna_tests_user_id ON dna_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_dna_tests_test_provider ON dna_tests(test_provider);
CREATE INDEX IF NOT EXISTS idx_dna_tests_processing_status ON dna_tests(processing_status);
CREATE INDEX IF NOT EXISTS idx_dna_matches_user1_id ON dna_matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_dna_matches_user2_id ON dna_matches(user2_id);
CREATE INDEX IF NOT EXISTS idx_dna_matches_shared_dna_cm ON dna_matches(shared_dna_cm);

-- Family Trees
CREATE INDEX IF NOT EXISTS idx_family_trees_owner_id ON family_trees(owner_id);
CREATE INDEX IF NOT EXISTS idx_family_members_tree_id ON family_members(tree_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_members_first_name ON family_members(first_name);
CREATE INDEX IF NOT EXISTS idx_family_members_last_name ON family_members(last_name);
CREATE INDEX IF NOT EXISTS idx_family_members_nickname ON family_members(nickname);
CREATE INDEX IF NOT EXISTS idx_family_members_place_of_birth ON family_members(place_of_birth);
CREATE INDEX IF NOT EXISTS idx_family_members_occupation ON family_members(occupation);
CREATE INDEX IF NOT EXISTS idx_family_relationships_tree_id ON family_relationships(tree_id);
CREATE INDEX IF NOT EXISTS idx_family_relationships_person1_id ON family_relationships(person1_id);
CREATE INDEX IF NOT EXISTS idx_family_relationships_person2_id ON family_relationships(person2_id);
CREATE INDEX IF NOT EXISTS idx_tree_members_tree_id ON tree_members(tree_id);
CREATE INDEX IF NOT EXISTS idx_tree_members_user_id ON tree_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_tree_permissions_tree_id ON family_tree_permissions(tree_id);
CREATE INDEX IF NOT EXISTS idx_family_tree_permissions_user_id ON family_tree_permissions(user_id);

-- Files
CREATE INDEX IF NOT EXISTS idx_file_metadata_user_id ON file_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_file_metadata_mongo_file_id ON file_metadata(mongo_file_id);
CREATE INDEX IF NOT EXISTS idx_file_metadata_category ON file_metadata(category);
CREATE INDEX IF NOT EXISTS idx_file_metadata_family_tree_id ON file_metadata(family_tree_id);

-- Historical Records
CREATE INDEX IF NOT EXISTS idx_historical_records_user_id ON historical_records(user_id);
CREATE INDEX IF NOT EXISTS idx_historical_records_record_type ON historical_records(record_type);
CREATE INDEX IF NOT EXISTS idx_historical_records_record_date ON historical_records(record_date);
CREATE INDEX IF NOT EXISTS idx_historical_records_primary_person_id ON historical_records(primary_person_id);

-- Subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);

-- Events
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_family_tree_id ON events(family_tree_id);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Comments
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_entity_type ON comments(entity_type);
CREATE INDEX IF NOT EXISTS idx_comments_entity_id ON comments(entity_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_comment_id ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);

-----------------------------------------
-- Triggers
-----------------------------------------

-- Update Triggers for updated_at timestamps
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dna_tests_updated_at BEFORE UPDATE ON dna_tests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dna_matches_updated_at BEFORE UPDATE ON dna_matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_family_trees_updated_at BEFORE UPDATE ON family_trees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_family_members_updated_at BEFORE UPDATE ON family_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tree_members_updated_at BEFORE UPDATE ON tree_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_family_tree_permissions_updated_at BEFORE UPDATE ON family_tree_permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_file_metadata_updated_at BEFORE UPDATE ON file_metadata
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_historical_records_updated_at BEFORE UPDATE ON historical_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Name update trigger
CREATE TRIGGER trigger_update_full_name
    BEFORE INSERT OR UPDATE OF first_name, middle_name, last_name, nickname
    ON family_members
    FOR EACH ROW
    EXECUTE FUNCTION update_full_name();

-- Add comments for documentation
COMMENT ON COLUMN users.last_login_user_agent IS 'User agent string from last login';
COMMENT ON COLUMN users.current_session_count IS 'Number of currently active sessions';
COMMENT ON COLUMN users.max_concurrent_sessions IS 'Maximum allowed concurrent sessions for this user';
COMMENT ON COLUMN refresh_tokens.session_id IS 'Redis session identifier for this token';
COMMENT ON COLUMN refresh_tokens.device_fingerprint IS 'Browser/device fingerprint for security';
COMMENT ON COLUMN refresh_tokens.location_info IS 'JSON string containing geolocation data';
COMMENT ON COLUMN family_members.first_name IS 'Given/first name of the family member';
COMMENT ON COLUMN family_members.middle_name IS 'Middle name of the family member';
COMMENT ON COLUMN family_members.last_name IS 'Family/surname of the family member';
COMMENT ON COLUMN family_members.nickname IS 'Nickname or informal name (useful for historical records)';
COMMENT ON COLUMN family_members.place_of_birth IS 'Place where the person was born';
COMMENT ON COLUMN family_members.place_of_death IS 'Place where the person died';
COMMENT ON COLUMN family_members.occupation IS 'Profession or occupation';
COMMENT ON COLUMN family_members.biography IS 'Biographical information';
COMMENT ON COLUMN family_members.notes IS 'Additional notes or research information';
