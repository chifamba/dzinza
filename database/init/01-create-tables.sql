
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table for authentication and profile data
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
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
    email_verification_token VARCHAR(255),
    email_verification_expires TIMESTAMP WITH TIME ZONE,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    
    -- Security
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    backup_codes TEXT[], -- Array of backup codes
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    
    -- Privacy & Preferences
    privacy_settings JSONB DEFAULT '{}',
    notification_preferences JSONB DEFAULT '{}',
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Subscription & Billing
    subscription_tier VARCHAR(50) DEFAULT 'free', -- free, basic, premium, enterprise
    subscription_status VARCHAR(20) DEFAULT 'active',
    subscription_expires TIMESTAMP WITH TIME ZONE,
    billing_info JSONB,
    
    -- Metadata
    is_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_jti ON user_sessions(token_jti);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_user_security_logs_user_id ON user_security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_security_logs_event_type ON user_security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_user_security_logs_created_at ON user_security_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_dna_tests_user_id ON dna_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_dna_tests_test_provider ON dna_tests(test_provider);
CREATE INDEX IF NOT EXISTS idx_dna_tests_processing_status ON dna_tests(processing_status);

CREATE INDEX IF NOT EXISTS idx_dna_matches_user1_id ON dna_matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_dna_matches_user2_id ON dna_matches(user2_id);
CREATE INDEX IF NOT EXISTS idx_dna_matches_shared_dna_cm ON dna_matches(shared_dna_cm);

CREATE INDEX IF NOT EXISTS idx_family_tree_permissions_tree_id ON family_tree_permissions(tree_id);
CREATE INDEX IF NOT EXISTS idx_family_tree_permissions_user_id ON family_tree_permissions(user_id);

CREATE INDEX IF NOT EXISTS idx_file_metadata_user_id ON file_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_file_metadata_mongo_file_id ON file_metadata(mongo_file_id);
CREATE INDEX IF NOT EXISTS idx_file_metadata_category ON file_metadata(category);
CREATE INDEX IF NOT EXISTS idx_file_metadata_family_tree_id ON file_metadata(family_tree_id);

CREATE INDEX IF NOT EXISTS idx_historical_records_user_id ON historical_records(user_id);
CREATE INDEX IF NOT EXISTS idx_historical_records_record_type ON historical_records(record_type);
CREATE INDEX IF NOT EXISTS idx_historical_records_record_date ON historical_records(record_date);
CREATE INDEX IF NOT EXISTS idx_historical_records_primary_person_id ON historical_records(primary_person_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);

-- Functions and triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dna_tests_updated_at BEFORE UPDATE ON dna_tests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dna_matches_updated_at BEFORE UPDATE ON dna_matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_family_tree_permissions_updated_at BEFORE UPDATE ON family_tree_permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_file_metadata_updated_at BEFORE UPDATE ON file_metadata
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_historical_records_updated_at BEFORE UPDATE ON historical_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
