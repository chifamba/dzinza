# Dzinza Genealogy Platform - Database Schema Design

## Overview

This document outlines the complete database architecture for the Dzinza genealogy platform, designed to handle millions of users, billions of records, and complex genealogical relationships.

## Database Strategy

### Multi-Database Approach
- **PostgreSQL**: User data, family trees, relationships, DNA data
- **MongoDB**: Historical records, documents, images metadata
- **ElasticSearch**: Full-text search, advanced querying
- **Redis**: Caching, session management, real-time features
- **Neo4j**: Complex relationship analysis (optional future enhancement)

## PostgreSQL Schema (Primary Database)

### 1. User Management

```sql
-- Users table with comprehensive profile information
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    display_name VARCHAR(150),
    date_of_birth DATE,
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
    phone VARCHAR(20),
    address JSONB,
    profile_photo_url TEXT,
    bio TEXT,
    
    -- Internationalization
    preferred_language VARCHAR(10) DEFAULT 'en' CHECK (preferred_language IN ('en', 'sn', 'nd')),
    locale VARCHAR(10) DEFAULT 'en-US',
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Privacy and preferences
    privacy_settings JSONB DEFAULT '{}',
    notification_preferences JSONB DEFAULT '{}',
    research_interests TEXT[],
    
    -- Subscription and status
    subscription_tier VARCHAR(50) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'premium', 'family')),
    subscription_expires_at TIMESTAMP,
    account_status VARCHAR(20) DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'deleted')),
    email_verified BOOLEAN DEFAULT FALSE,
    
    -- Timestamps and tracking
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    last_activity TIMESTAMP,
    login_count INTEGER DEFAULT 0,
    
    -- GDPR compliance
    data_retention_until TIMESTAMP,
    deletion_requested_at TIMESTAMP,
    
    CONSTRAINT check_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- User sessions for security tracking
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE,
    device_info JSONB,
    ip_address INET,
    user_agent TEXT,
    location_info JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    last_used_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- User preferences and settings
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    preference_type VARCHAR(50) NOT NULL,
    preference_value JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, preference_type)
);
```

### 2. Family Trees Structure

```sql
-- Family trees
CREATE TABLE family_trees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Privacy and collaboration
    privacy_level VARCHAR(20) DEFAULT 'private' CHECK (privacy_level IN ('private', 'family', 'public')),
    collaboration_enabled BOOLEAN DEFAULT FALSE,
    invite_code VARCHAR(50) UNIQUE,
    
    -- Tree settings
    default_surname VARCHAR(100),
    home_person_id UUID, -- Will reference people(id)
    tree_style JSONB DEFAULT '{}',
    
    -- Statistics
    person_count INTEGER DEFAULT 0,
    generation_count INTEGER DEFAULT 0,
    photo_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_modified_by UUID REFERENCES users(id),
    
    -- Backup and versioning
    version INTEGER DEFAULT 1,
    backup_enabled BOOLEAN DEFAULT TRUE
);

-- Tree collaborators
CREATE TABLE tree_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tree_id UUID REFERENCES family_trees(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'contributor', 'viewer')),
    permissions JSONB DEFAULT '{}',
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMP DEFAULT NOW(),
    accepted_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'removed')),
    UNIQUE(tree_id, user_id)
);

-- Tree activity log
CREATE TABLE tree_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tree_id UUID REFERENCES family_trees(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    activity_type VARCHAR(50) NOT NULL,
    activity_data JSONB,
    ip_address INET,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. People and Biographical Data

```sql
-- People in family trees
CREATE TABLE people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tree_id UUID REFERENCES family_trees(id) ON DELETE CASCADE,
    
    -- Basic information
    first_name VARCHAR(100),
    middle_name VARCHAR(100),
    last_name VARCHAR(100),
    maiden_name VARCHAR(100),
    nickname VARCHAR(100),
    full_name VARCHAR(300) GENERATED ALWAYS AS (
        TRIM(CONCAT(first_name, ' ', COALESCE(middle_name, ''), ' ', last_name))
    ) STORED,
    
    -- Personal details
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other', 'unknown')),
    prefix VARCHAR(20), -- Mr., Mrs., Dr., etc.
    suffix VARCHAR(20), -- Jr., Sr., III, etc.
    
    -- Life events
    birth_date DATE,
    birth_date_precision VARCHAR(10) DEFAULT 'exact' CHECK (birth_date_precision IN ('exact', 'about', 'before', 'after', 'between')),
    birth_place VARCHAR(255),
    birth_place_coordinates POINT,
    
    death_date DATE,
    death_date_precision VARCHAR(10) DEFAULT 'exact' CHECK (death_date_precision IN ('exact', 'about', 'before', 'after', 'between')),
    death_place VARCHAR(255),
    death_place_coordinates POINT,
    cause_of_death TEXT,
    
    -- Additional information
    occupation VARCHAR(255),
    education TEXT,
    religion VARCHAR(100),
    ethnicity VARCHAR(100),
    nationality VARCHAR(100),
    languages_spoken TEXT[],
    
    -- Physical characteristics
    height VARCHAR(20),
    weight VARCHAR(20),
    eye_color VARCHAR(20),
    hair_color VARCHAR(20),
    
    -- Biography and notes
    biography TEXT,
    notes TEXT,
    research_notes TEXT,
    
    -- Media
    profile_photo_url TEXT,
    photos JSONB DEFAULT '[]',
    documents JSONB DEFAULT '[]',
    
    -- Status and privacy
    living_status VARCHAR(20) DEFAULT 'unknown' CHECK (living_status IN ('living', 'deceased', 'unknown')),
    privacy_level VARCHAR(20) DEFAULT 'family' CHECK (privacy_level IN ('private', 'family', 'public')),
    
    -- Research information
    research_priority INTEGER DEFAULT 0,
    confidence_level INTEGER DEFAULT 5 CHECK (confidence_level >= 1 AND confidence_level <= 10),
    sources JSONB DEFAULT '[]',
    
    -- System fields
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_modified_by UUID REFERENCES users(id),
    
    -- Indexing for search
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', 
            COALESCE(first_name, '') || ' ' ||
            COALESCE(middle_name, '') || ' ' ||
            COALESCE(last_name, '') || ' ' ||
            COALESCE(maiden_name, '') || ' ' ||
            COALESCE(nickname, '') || ' ' ||
            COALESCE(occupation, '') || ' ' ||
            COALESCE(birth_place, '') || ' ' ||
            COALESCE(death_place, '')
        )
    ) STORED
);

-- Add foreign key constraint after table creation
ALTER TABLE family_trees ADD CONSTRAINT fk_home_person 
    FOREIGN KEY (home_person_id) REFERENCES people(id);

-- Alternative names for people (aliases, married names, etc.)
CREATE TABLE person_names (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID REFERENCES people(id) ON DELETE CASCADE,
    name_type VARCHAR(50) NOT NULL, -- birth, married, nickname, professional, etc.
    first_name VARCHAR(100),
    middle_name VARCHAR(100),
    last_name VARCHAR(100),
    prefix VARCHAR(20),
    suffix VARCHAR(20),
    date_from DATE,
    date_to DATE,
    is_primary BOOLEAN DEFAULT FALSE,
    source VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Life events for people
CREATE TABLE life_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID REFERENCES people(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- birth, death, marriage, graduation, employment, etc.
    event_date DATE,
    event_date_precision VARCHAR(10) DEFAULT 'exact',
    event_place VARCHAR(255),
    event_place_coordinates POINT,
    description TEXT,
    participants JSONB, -- Other people involved in the event
    sources JSONB DEFAULT '[]',
    privacy_level VARCHAR(20) DEFAULT 'family',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 4. Relationships

```sql
-- Relationships between people
CREATE TABLE relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person1_id UUID REFERENCES people(id) ON DELETE CASCADE,
    person2_id UUID REFERENCES people(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL,
    
    -- Relationship details
    start_date DATE,
    start_date_precision VARCHAR(10) DEFAULT 'exact',
    end_date DATE,
    end_date_precision VARCHAR(10) DEFAULT 'exact',
    end_reason VARCHAR(50), -- death, divorce, separation, etc.
    
    -- Marriage specific fields
    marriage_place VARCHAR(255),
    marriage_place_coordinates POINT,
    divorce_date DATE,
    divorce_place VARCHAR(255),
    
    -- Parent-child specific fields
    biological BOOLEAN DEFAULT TRUE,
    adoption_date DATE,
    
    -- Research information
    confidence_level INTEGER DEFAULT 5 CHECK (confidence_level >= 1 AND confidence_level <= 10),
    sources JSONB DEFAULT '[]',
    notes TEXT,
    
    -- System fields
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure no self-relationships
    CONSTRAINT no_self_relationship CHECK (person1_id != person2_id),
    
    -- Ensure unique relationships (prevent duplicates)
    UNIQUE(person1_id, person2_id, relationship_type)
);

-- Family groups (for complex family structures)
CREATE TABLE family_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tree_id UUID REFERENCES family_trees(id) ON DELETE CASCADE,
    family_name VARCHAR(255),
    family_type VARCHAR(50), -- nuclear, extended, adoptive, etc.
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Members of family groups
CREATE TABLE family_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_group_id UUID REFERENCES family_groups(id) ON DELETE CASCADE,
    person_id UUID REFERENCES people(id) ON DELETE CASCADE,
    role VARCHAR(50), -- parent, child, guardian, etc.
    joined_date DATE,
    left_date DATE,
    UNIQUE(family_group_id, person_id)
);
```

### 5. DNA and Genetic Data

```sql
-- DNA profiles
CREATE TABLE dna_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    person_id UUID REFERENCES people(id), -- Optional link to family tree person
    
    -- DNA kit information
    kit_number VARCHAR(100),
    testing_company VARCHAR(100) NOT NULL,
    test_type VARCHAR(50), -- autosomal, Y-DNA, mtDNA, X-DNA
    collection_date DATE,
    results_date DATE,
    
    -- Raw data storage
    raw_data_url TEXT,
    raw_data_hash VARCHAR(255), -- For integrity verification
    processed_data JSONB,
    
    -- Ethnicity breakdown
    ethnicity_breakdown JSONB,
    ethnicity_confidence JSONB,
    
    -- Haplogroups
    paternal_haplogroup VARCHAR(50),
    maternal_haplogroup VARCHAR(50),
    
    -- Analysis results
    analysis_version VARCHAR(20),
    analysis_date TIMESTAMP,
    quality_score DECIMAL(5,2),
    
    -- Privacy and sharing
    sharing_enabled BOOLEAN DEFAULT TRUE,
    research_participation BOOLEAN DEFAULT FALSE,
    
    -- System fields
    upload_date TIMESTAMP DEFAULT NOW(),
    processing_status VARCHAR(50) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    processing_log JSONB DEFAULT '[]',
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- DNA matches between profiles
CREATE TABLE dna_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile1_id UUID REFERENCES dna_profiles(id) ON DELETE CASCADE,
    profile2_id UUID REFERENCES dna_profiles(id) ON DELETE CASCADE,
    
    -- Match statistics
    shared_dna_cm DECIMAL(8,2) NOT NULL,
    shared_segments INTEGER,
    largest_segment_cm DECIMAL(8,2),
    total_segments INTEGER,
    
    -- Relationship estimation
    estimated_relationship VARCHAR(100),
    relationship_confidence DECIMAL(5,2),
    estimated_generations DECIMAL(3,1),
    
    -- Additional analysis
    x_dna_shared_cm DECIMAL(8,2),
    chromosome_browser_data JSONB,
    triangulation_groups JSONB,
    
    -- Match management
    match_status VARCHAR(20) DEFAULT 'new' CHECK (match_status IN ('new', 'reviewed', 'confirmed', 'disputed', 'ignored')),
    notes TEXT,
    tags TEXT[],
    starred BOOLEAN DEFAULT FALSE,
    
    -- Communication
    contact_attempted BOOLEAN DEFAULT FALSE,
    contact_successful BOOLEAN DEFAULT FALSE,
    shared_tree_access BOOLEAN DEFAULT FALSE,
    
    -- Discovery information
    discovered_at TIMESTAMP DEFAULT NOW(),
    algorithm_version VARCHAR(20),
    last_updated TIMESTAMP DEFAULT NOW(),
    
    -- Ensure no self-matches and no duplicate matches
    CONSTRAINT no_self_match CHECK (profile1_id != profile2_id),
    UNIQUE(profile1_id, profile2_id)
);

-- Shared segments between DNA matches
CREATE TABLE dna_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES dna_matches(id) ON DELETE CASCADE,
    chromosome INTEGER NOT NULL CHECK (chromosome >= 1 AND chromosome <= 23),
    start_position BIGINT NOT NULL,
    end_position BIGINT NOT NULL,
    length_cm DECIMAL(8,2) NOT NULL,
    snp_count INTEGER,
    half_identical BOOLEAN DEFAULT TRUE,
    fully_identical BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT valid_positions CHECK (start_position < end_position)
);

-- DNA research groups and collaborations
CREATE TABLE dna_research_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    ancestor_name VARCHAR(255),
    estimated_ancestor_birth_year INTEGER,
    estimated_ancestor_location VARCHAR(255),
    group_type VARCHAR(50), -- surname, geographic, haplogroup, etc.
    admin_user_id UUID REFERENCES users(id),
    privacy_level VARCHAR(20) DEFAULT 'public',
    member_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Members of DNA research groups
CREATE TABLE dna_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES dna_research_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES dna_profiles(id),
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
    joined_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'pending', 'suspended')),
    UNIQUE(group_id, user_id)
);
```

### 6. Research and Sources

```sql
-- Sources and citations
CREATE TABLE sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Source identification
    title TEXT NOT NULL,
    author VARCHAR(255),
    publisher VARCHAR(255),
    publication_date DATE,
    publication_place VARCHAR(255),
    
    -- Source details
    source_type VARCHAR(50), -- book, website, document, interview, etc.
    repository VARCHAR(255),
    call_number VARCHAR(100),
    url TEXT,
    isbn VARCHAR(20),
    
    -- Quality and reliability
    reliability_rating INTEGER CHECK (reliability_rating >= 1 AND reliability_rating <= 5),
    completeness_rating INTEGER CHECK (completeness_rating >= 1 AND completeness_rating <= 5),
    
    -- Content information
    description TEXT,
    notes TEXT,
    language VARCHAR(50),
    subjects TEXT[],
    
    -- Media attachments
    images JSONB DEFAULT '[]',
    documents JSONB DEFAULT '[]',
    
    -- System fields
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Full-text search
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', title || ' ' || COALESCE(author, '') || ' ' || COALESCE(description, ''))
    ) STORED
);

-- Citations linking sources to people/events/facts
CREATE TABLE citations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES sources(id) ON DELETE CASCADE,
    
    -- What this citation supports
    cited_entity_type VARCHAR(50) NOT NULL, -- person, relationship, event, fact
    cited_entity_id UUID NOT NULL,
    
    -- Citation details
    page_number VARCHAR(50),
    detail TEXT, -- Specific information found in source
    confidence_level INTEGER DEFAULT 5 CHECK (confidence_level >= 1 AND confidence_level <= 10),
    
    -- Transcription
    transcription TEXT,
    translation TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Research tasks and to-dos
CREATE TABLE research_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tree_id UUID REFERENCES family_trees(id),
    person_id UUID REFERENCES people(id),
    
    -- Task information
    title VARCHAR(255) NOT NULL,
    description TEXT,
    task_type VARCHAR(50), -- research, verify, contact, digitize, etc.
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
    due_date DATE,
    completed_date DATE,
    
    -- Organization
    tags TEXT[],
    category VARCHAR(50),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Research notes and findings
CREATE TABLE research_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Associated entities
    tree_id UUID REFERENCES family_trees(id),
    person_id UUID REFERENCES people(id),
    task_id UUID REFERENCES research_tasks(id),
    
    -- Note content
    title VARCHAR(255),
    content TEXT NOT NULL,
    note_type VARCHAR(50), -- finding, hypothesis, question, contact_log, etc.
    
    -- Organization
    tags TEXT[],
    category VARCHAR(50),
    
    -- Attachments
    attachments JSONB DEFAULT '[]',
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Full-text search
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', COALESCE(title, '') || ' ' || content)
    ) STORED
);
```

### 7. Media and Documents

```sql
-- Media files (photos, documents, audio, video)
CREATE TABLE media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- File information
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255),
    file_type VARCHAR(50) NOT NULL, -- image, document, audio, video
    mime_type VARCHAR(100),
    file_size BIGINT,
    
    -- Storage information
    storage_provider VARCHAR(50), -- s3, gcs, azure, local
    storage_path TEXT NOT NULL,
    thumbnail_path TEXT,
    preview_path TEXT,
    
    -- Media metadata
    width INTEGER,
    height INTEGER,
    duration INTEGER, -- for audio/video
    resolution VARCHAR(20),
    color_space VARCHAR(20),
    
    -- Content information
    title VARCHAR(255),
    description TEXT,
    caption TEXT,
    keywords TEXT[],
    location VARCHAR(255),
    location_coordinates POINT,
    
    -- Dates
    date_taken TIMESTAMP,
    date_created TIMESTAMP,
    date_uploaded TIMESTAMP DEFAULT NOW(),
    
    -- Privacy and sharing
    privacy_level VARCHAR(20) DEFAULT 'family' CHECK (privacy_level IN ('private', 'family', 'public')),
    download_allowed BOOLEAN DEFAULT TRUE,
    
    -- Processing status
    processing_status VARCHAR(20) DEFAULT 'pending',
    ocr_text TEXT, -- For documents
    face_recognition_data JSONB, -- For photos
    enhancement_data JSONB, -- For enhanced photos
    
    -- System fields
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Full-text search
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', 
            COALESCE(title, '') || ' ' || 
            COALESCE(description, '') || ' ' || 
            COALESCE(caption, '') || ' ' || 
            COALESCE(ocr_text, '')
        )
    ) STORED
);

-- Link media to people
CREATE TABLE person_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID REFERENCES people(id) ON DELETE CASCADE,
    media_id UUID REFERENCES media(id) ON DELETE CASCADE,
    
    -- Relationship details
    media_role VARCHAR(50), -- profile_photo, document, certificate, etc.
    is_primary BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    
    -- Face recognition data (for photos with multiple people)
    face_region JSONB, -- Coordinates of person's face in photo
    
    -- Dates and context
    relationship_date DATE,
    context TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(person_id, media_id)
);

-- Link media to events
CREATE TABLE event_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES life_events(id) ON DELETE CASCADE,
    media_id UUID REFERENCES media(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    caption TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(event_id, media_id)
);

-- Media collections/albums
CREATE TABLE media_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    collection_type VARCHAR(50), -- album, archive, research, etc.
    privacy_level VARCHAR(20) DEFAULT 'family',
    cover_media_id UUID REFERENCES media(id),
    item_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Items in media collections
CREATE TABLE collection_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID REFERENCES media_collections(id) ON DELETE CASCADE,
    media_id UUID REFERENCES media(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    added_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(collection_id, media_id)
);
```

### 8. Notifications and Communication

```sql
-- Notifications system
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Notification content
    notification_type VARCHAR(50) NOT NULL, -- dna_match, collaboration_invite, hint, etc.
    title VARCHAR(255) NOT NULL,
    message TEXT,
    action_url TEXT,
    
    -- Notification data
    data JSONB DEFAULT '{}',
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- Status
    read_at TIMESTAMP,
    archived_at TIMESTAMP,
    clicked_at TIMESTAMP,
    
    -- Delivery tracking
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP,
    push_sent BOOLEAN DEFAULT FALSE,
    push_sent_at TIMESTAMP,
    
    -- System fields
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);

-- Messages between users
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES users(id),
    recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Message content
    subject VARCHAR(255),
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'direct', -- direct, dna_inquiry, collaboration, etc.
    
    -- Related entities
    related_entity_type VARCHAR(50), -- dna_match, person, tree, etc.
    related_entity_id UUID,
    
    -- Status
    read_at TIMESTAMP,
    replied_at TIMESTAMP,
    archived_by_sender BOOLEAN DEFAULT FALSE,
    archived_by_recipient BOOLEAN DEFAULT FALSE,
    
    -- Attachments
    attachments JSONB DEFAULT '[]',
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Prevent self-messaging
    CONSTRAINT no_self_message CHECK (sender_id != recipient_id)
);

-- DNA match contact requests
CREATE TABLE dna_contact_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES dna_matches(id) ON DELETE CASCADE,
    requester_id UUID REFERENCES users(id),
    recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Request details
    message TEXT,
    shared_ancestor_info TEXT,
    tree_sharing_offered BOOLEAN DEFAULT FALSE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
    response_message TEXT,
    responded_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '30 days')
);
```

### 9. System and Analytics

```sql
-- User activity tracking
CREATE TABLE user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Activity details
    activity_type VARCHAR(50) NOT NULL,
    activity_category VARCHAR(50), -- genealogy, dna, media, social, etc.
    activity_data JSONB,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    device_type VARCHAR(50),
    browser VARCHAR(50),
    
    -- Location (if available)
    country VARCHAR(2),
    region VARCHAR(100),
    city VARCHAR(100),
    
    -- Timing
    session_id UUID,
    duration_seconds INTEGER,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- System performance metrics
CREATE TABLE system_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4),
    metric_unit VARCHAR(20),
    tags JSONB DEFAULT '{}',
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Feature usage analytics
CREATE TABLE feature_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_name VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    usage_count INTEGER DEFAULT 1,
    first_used TIMESTAMP DEFAULT NOW(),
    last_used TIMESTAMP DEFAULT NOW(),
    date DATE DEFAULT CURRENT_DATE,
    
    UNIQUE(feature_name, user_id, date)
);

-- Error logs
CREATE TABLE error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    error_type VARCHAR(100),
    error_message TEXT,
    stack_trace TEXT,
    request_data JSONB,
    user_agent TEXT,
    ip_address INET,
    severity VARCHAR(20) DEFAULT 'error' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 13. Internationalization Support

```sql
-- Language support table
CREATE TABLE languages (
    code VARCHAR(10) PRIMARY KEY, -- ISO 639-1 codes (en, sn, nd)
    name VARCHAR(100) NOT NULL,
    native_name VARCHAR(100) NOT NULL,
    direction VARCHAR(3) DEFAULT 'ltr' CHECK (direction IN ('ltr', 'rtl')),
    enabled BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert supported languages
INSERT INTO languages (code, name, native_name, sort_order) VALUES
('en', 'English', 'English', 1),
('sn', 'Shona', 'chiShona', 2),
('nd', 'Ndebele', 'isiNdebele', 3);

-- Translation keys for dynamic content
CREATE TABLE translation_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_name VARCHAR(255) UNIQUE NOT NULL, -- e.g., 'relationship.father'
    namespace VARCHAR(100) NOT NULL, -- e.g., 'genealogy', 'common', 'forms'
    description TEXT,
    context TEXT, -- Additional context for translators
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Translations for each language
CREATE TABLE translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    translation_key_id UUID NOT NULL REFERENCES translation_keys(id) ON DELETE CASCADE,
    language_code VARCHAR(10) NOT NULL REFERENCES languages(code) ON DELETE CASCADE,
    translation_text TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT FALSE,
    translator_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(translation_key_id, language_code)
);

-- Localized content for user-generated content
CREATE TABLE localized_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL, -- 'person', 'event', 'place', etc.
    entity_id UUID NOT NULL,
    field_name VARCHAR(100) NOT NULL, -- 'name', 'description', 'notes', etc.
    language_code VARCHAR(10) NOT NULL REFERENCES languages(code),
    content TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE, -- Primary language for this content
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    INDEX(entity_type, entity_id, field_name),
    INDEX(language_code)
);

-- Cultural and regional preferences
CREATE TABLE cultural_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    language_code VARCHAR(10) NOT NULL REFERENCES languages(code),
    region_code VARCHAR(10), -- ISO 3166-1 codes (ZW, US, etc.)
    date_format VARCHAR(50) DEFAULT 'DD/MM/YYYY',
    time_format VARCHAR(50) DEFAULT '24h',
    number_format JSONB DEFAULT '{"decimal": ".", "thousand": ","}',
    currency_code VARCHAR(3) DEFAULT 'USD',
    calendar_system VARCHAR(20) DEFAULT 'gregorian',
    cultural_preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default cultural settings
INSERT INTO cultural_settings (language_code, region_code, date_format, currency_code) VALUES
('en', 'US', 'MM/DD/YYYY', 'USD'),
('en', 'ZW', 'DD/MM/YYYY', 'USD'),
('sn', 'ZW', 'DD/MM/YYYY', 'USD'),
('nd', 'ZW', 'DD/MM/YYYY', 'USD');
```

## MongoDB Schema (Historical Records)

### Historical Records Collection

```javascript
// historical_records collection
{
  _id: ObjectId,
  
  // Record identification
  recordType: String, // birth, death, marriage, census, immigration, military, etc.
  subType: String, // federal_census, state_census, passenger_list, etc.
  title: String,
  description: String,
  
  // Dates (flexible dating system)
  dates: {
    original: String, // Original date as written in record
    standardized: {
      year: Number,
      month: Number,
      day: Number,
      exact: Boolean,
      circa: Boolean,
      before: Boolean,
      after: Boolean,
      between: {
        start: Date,
        end: Date
      }
    }
  },
  
  // Location information
  location: {
    original: String, // Original location as written
    standardized: {
      country: String,
      countryCode: String,
      state: String,
      stateCode: String,
      county: String,
      city: String,
      parish: String,
      township: String,
      address: String,
      coordinates: {
        type: "Point",
        coordinates: [Number, Number] // [longitude, latitude]
      }
    }
  },
  
  // People mentioned in the record
  people: [{
    _id: ObjectId,
    role: String, // primary, spouse, parent, child, witness, etc.
    names: [{
      first: String,
      middle: String,
      last: String,
      maiden: String,
      suffix: String,
      prefix: String,
      fullName: String,
      type: String // birth, married, alias, etc.
    }],
    demographics: {
      gender: String,
      age: {
        value: Number,
        unit: String, // years, months, days
        estimated: Boolean
      },
      birthYear: Number,
      birthPlace: String,
      maritalStatus: String,
      occupation: String,
      education: String,
      immigration: {
        year: Number,
        country: String,
        ship: String
      },
      military: {
        service: String,
        rank: String,
        unit: String,
        war: String
      }
    },
    relationships: [{
      relatedPersonId: ObjectId,
      relationship: String,
      confirmed: Boolean
    }]
  }],
  
  // Source information
  source: {
    name: String,
    type: String, // government, church, newspaper, family, commercial
    subType: String, // vital_records, census, immigration, etc.
    repository: String,
    archive: String,
    collection: String,
    series: String,
    volume: String,
    page: String,
    reference: String,
    url: String,
    microfilmNumber: String,
    digitalCollectionId: String,
    accessRestrictions: String,
    copyright: String
  },
  
  // Digital assets
  images: [{
    _id: ObjectId,
    url: String,
    thumbnailUrl: String,
    title: String,
    description: String,
    pageNumber: Number,
    imageType: String, // original, enhanced, transcription
    dimensions: {
      width: Number,
      height: Number
    },
    fileSize: Number,
    format: String,
    quality: String,
    ocrText: String,
    ocrConfidence: Number
  }],
  
  // Text content
  transcription: {
    fullText: String,
    confidence: Number, // 0-100
    transcriber: String,
    transcriptionDate: Date,
    verified: Boolean,
    verifiedBy: String,
    verificationDate: Date,
    language: String
  },
  
  // Search and indexing
  searchableText: String, // Combined text for full-text search
  keywords: [String],
  tags: [String],
  
  // Quality and verification
  quality: {
    legibility: Number, // 1-5 scale
    completeness: Number, // 1-5 scale
    accuracy: Number, // 1-5 scale
    verificationStatus: String, // unverified, verified, disputed
    verifiedBy: ObjectId, // User ID
    verificationDate: Date,
    verificationNotes: String
  },
  
  // Research information
  research: {
    hints: [{
      type: String, // name_match, date_match, location_match
      confidence: Number,
      personId: ObjectId,
      treeId: ObjectId,
      userId: ObjectId,
      created: Date,
      status: String // new, reviewed, accepted, rejected
    }],
    savedBy: [ObjectId], // User IDs who saved this record
    citedBy: [ObjectId], // Citation IDs referencing this record
    relatedRecords: [{
      recordId: ObjectId,
      relationshipType: String, // same_person, family_member, same_event
      confidence: Number
    }]
  },
  
  // System metadata
  metadata: {
    created: Date,
    updated: Date,
    createdBy: String, // System, import batch, user ID
    source: String, // batch_import, user_submission, api_sync
    batchId: String,
    importDate: Date,
    lastModified: Date,
    modifiedBy: ObjectId,
    version: Number,
    status: String, // active, archived, deleted, pending_review
    flags: [String] // duplicate, needs_review, high_quality, etc.
  },
  
  // Indexes for MongoDB
  indexes: [
    { "searchableText": "text" },
    { "people.names.last": 1, "people.names.first": 1 },
    { "dates.standardized.year": 1 },
    { "location.standardized.country": 1, "location.standardized.state": 1 },
    { "recordType": 1, "source.type": 1 },
    { "location.standardized.coordinates": "2dsphere" }
  ]
}
```

### Collections Structure

```javascript
// DNA processing queue
{
  _id: ObjectId,
  userId: ObjectId,
  profileId: ObjectId,
  processingType: String, // initial, reprocess, match_update
  status: String, // queued, processing, completed, failed
  priority: Number,
  data: {
    rawDataUrl: String,
    parameters: Object,
    progress: Number
  },
  started: Date,
  completed: Date,
  error: String,
  retryCount: Number,
  created: Date
}

// Smart hints collection
{
  _id: ObjectId,
  userId: ObjectId,
  treeId: ObjectId,
  personId: ObjectId,
  hintType: String, // record_match, dna_connection, missing_parent, etc.
  confidence: Number, // 0-100
  data: {
    recordId: ObjectId,
    matchScore: Number,
    evidence: [Object],
    suggestedAction: String
  },
  status: String, // new, reviewed, accepted, dismissed
  created: Date,
  reviewedAt: Date,
  expiresAt: Date
}

// Research logs
{
  _id: ObjectId,
  userId: ObjectId,
  sessionId: String,
  searches: [{
    timestamp: Date,
    query: Object,
    filters: Object,
    results: Number,
    clicked: [ObjectId] // Record IDs clicked
  }],
  duration: Number,
  created: Date
}
```

## ElasticSearch Schema

### Records Index

```json
{
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "analyzer": "standard",
        "fields": {
          "keyword": { "type": "keyword" }
        }
      },
      "people": {
        "type": "nested",
        "properties": {
          "names": {
            "type": "nested",
            "properties": {
              "first": {
                "type": "text",
                "analyzer": "name_analyzer",
                "fields": {
                  "exact": { "type": "keyword" },
                  "soundex": { "type": "text", "analyzer": "soundex_analyzer" }
                }
              },
              "last": {
                "type": "text",
                "analyzer": "name_analyzer",
                "fields": {
                  "exact": { "type": "keyword" },
                  "soundex": { "type": "text", "analyzer": "soundex_analyzer" }
                }
              }
            }
          },
          "demographics": {
            "properties": {
              "age": { "type": "integer" },
              "birthYear": { "type": "integer" },
              "occupation": {
                "type": "text",
                "analyzer": "standard"
              }
            }
          }
        }
      },
      "dates": {
        "properties": {
          "standardized": {
            "properties": {
              "year": { "type": "integer" },
              "month": { "type": "integer" },
              "day": { "type": "integer" },
              "exact": { "type": "boolean" }
            }
          }
        }
      },
      "location": {
        "properties": {
          "standardized": {
            "properties": {
              "country": { "type": "keyword" },
              "state": { "type": "keyword" },
              "county": { "type": "keyword" },
              "city": { "type": "keyword" },
              "coordinates": { "type": "geo_point" }
            }
          }
        }
      },
      "recordType": { "type": "keyword" },
      "searchableText": {
        "type": "text",
        "analyzer": "genealogy_analyzer"
      },
      "quality": {
        "properties": {
          "legibility": { "type": "float" },
          "completeness": { "type": "float" },
          "accuracy": { "type": "float" }
        }
      }
    }
  },
  "settings": {
    "analysis": {
      "analyzer": {
        "name_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "name_synonyms", "edge_ngram"]
        },
        "soundex_analyzer": {
          "type": "custom",
          "tokenizer": "keyword",
          "filter": ["lowercase", "soundex"]
        },
        "genealogy_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "genealogy_synonyms", "stemmer"]
        }
      },
      "filter": {
        "name_synonyms": {
          "type": "synonym",
          "synonyms": [
            "john,jon,johnny,jack",
            "william,bill,billy,will,willie",
            "robert,bob,bobby,rob,robbie",
            "michael,mike,mick,mickey"
          ]
        },
        "genealogy_synonyms": {
          "type": "synonym",
          "synonyms": [
            "born,birth,b.",
            "died,death,d.",
            "married,marriage,m.",
            "father,papa,dad,daddy",
            "mother,mama,mom,mommy"
          ]
        },
        "edge_ngram": {
          "type": "edge_ngram",
          "min_gram": 2,
          "max_gram": 10
        }
      }
    }
  }
}
```

## Redis Schema

### Session Storage
```redis
# User sessions
user:session:{session_id} = {
  "userId": "uuid",
  "deviceInfo": {},
  "loginTime": "timestamp",
  "lastActivity": "timestamp",
  "ipAddress": "ip"
}

# User preferences cache
user:preferences:{user_id} = {
  "theme": "light",
  "notifications": {},
  "privacy": {}
}
```

### Caching Strategy
```redis
# Family tree cache
tree:{tree_id} = {
  "treeData": {},
  "lastModified": "timestamp",
  "memberCount": 123
}

# DNA match cache
dna:matches:{profile_id} = [
  {
    "matchId": "uuid",
    "sharedCM": 127.5,
    "relationship": "3rd cousin"
  }
]

# Search result cache
search:{query_hash} = {
  "results": [],
  "totalCount": 1234,
  "timestamp": "timestamp"
}
```

### Real-time Features
```redis
# Active users in family tree
tree:active:{tree_id} = {
  "user1": "timestamp",
  "user2": "timestamp"
}

# Notification queues
notifications:{user_id} = [
  {
    "type": "dna_match",
    "data": {},
    "timestamp": "timestamp"
  }
]
```

## Indexing Strategy

### PostgreSQL Indexes

```sql
-- Performance indexes for users
CREATE INDEX CONCURRENTLY idx_users_email ON users (email);
CREATE INDEX CONCURRENTLY idx_users_subscription ON users (subscription_tier, account_status);
CREATE INDEX CONCURRENTLY idx_users_last_activity ON users (last_activity);

-- Family tree indexes
CREATE INDEX CONCURRENTLY idx_family_trees_owner ON family_trees (owner_id);
CREATE INDEX CONCURRENTLY idx_tree_collaborators_user ON tree_collaborators (user_id);
CREATE INDEX CONCURRENTLY idx_tree_collaborators_tree ON tree_collaborators (tree_id);

-- People indexes
CREATE INDEX CONCURRENTLY idx_people_names ON people (first_name, last_name);
CREATE INDEX CONCURRENTLY idx_people_dates ON people (birth_date, death_date);
CREATE INDEX CONCURRENTLY idx_people_tree ON people (tree_id);
CREATE INDEX CONCURRENTLY idx_people_search ON people USING gin(search_vector);

-- Relationship indexes
CREATE INDEX CONCURRENTLY idx_relationships_person1 ON relationships (person1_id);
CREATE INDEX CONCURRENTLY idx_relationships_person2 ON relationships (person2_id);
CREATE INDEX CONCURRENTLY idx_relationships_type ON relationships (relationship_type);

-- DNA indexes
CREATE INDEX CONCURRENTLY idx_dna_profiles_user ON dna_profiles (user_id);
CREATE INDEX CONCURRENTLY idx_dna_matches_profile1 ON dna_matches (profile1_id);
CREATE INDEX CONCURRENTLY idx_dna_matches_profile2 ON dna_matches (profile2_id);
CREATE INDEX CONCURRENTLY idx_dna_matches_score ON dna_matches (shared_dna_cm DESC);

-- Media indexes
CREATE INDEX CONCURRENTLY idx_media_user ON media (user_id);
CREATE INDEX CONCURRENTLY idx_media_type ON media (file_type, privacy_level);
CREATE INDEX CONCURRENTLY idx_media_search ON media USING gin(search_vector);
CREATE INDEX CONCURRENTLY idx_person_media_person ON person_media (person_id);

-- Activity and analytics indexes
CREATE INDEX CONCURRENTLY idx_user_activities_user_date ON user_activities (user_id, created_at);
CREATE INDEX CONCURRENTLY idx_user_activities_type ON user_activities (activity_type, created_at);
CREATE INDEX CONCURRENTLY idx_notifications_user_unread ON notifications (user_id, read_at) WHERE read_at IS NULL;

-- Geographic indexes
CREATE INDEX CONCURRENTLY idx_people_birth_location ON people USING gist(birth_place_coordinates);
CREATE INDEX CONCURRENTLY idx_people_death_location ON people USING gist(death_place_coordinates);
```

### Partitioning Strategy

```sql
-- Partition large tables by date
CREATE TABLE user_activities_y2024 PARTITION OF user_activities
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE user_activities_y2025 PARTITION OF user_activities
FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- Partition DNA matches by discovery date
CREATE TABLE dna_matches_2024 PARTITION OF dna_matches
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

This comprehensive database schema provides the foundation for a scalable genealogy platform that can handle millions of users, complex family relationships, DNA analysis, and billions of historical records while maintaining performance and data integrity.