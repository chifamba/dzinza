-- Abuse reports table
CREATE TABLE IF NOT EXISTS abuse_reports (
    id UUID PRIMARY KEY,
    reporter_id UUID NOT NULL,
    reported_user_id UUID NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(16) NOT NULL CHECK (status IN ('OPEN', 'RESOLVED', 'REJECTED')),
    created_at TIMESTAMP NOT NULL,
    resolved_at TIMESTAMP
);

-- Ban actions table
CREATE TABLE IF NOT EXISTS ban_actions (
    user_id UUID NOT NULL,
    banned_by UUID NOT NULL,
    reason TEXT NOT NULL,
    banned_at TIMESTAMP NOT NULL,
    PRIMARY KEY (user_id, banned_at)
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY,
    entity_type VARCHAR(64) NOT NULL,
    entity_id UUID NOT NULL,
    user_id UUID NOT NULL,
    action VARCHAR(8) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
    timestamp TIMESTAMP NOT NULL,
    details JSONB
);

-- Usage metrics table
CREATE TABLE IF NOT EXISTS usage_metrics (
    date DATE PRIMARY KEY,
    active_users INTEGER NOT NULL,
    new_persons INTEGER NOT NULL,
    new_relationships INTEGER NOT NULL,
    verification_events INTEGER NOT NULL
);

-- Contributor stats table
CREATE TABLE IF NOT EXISTS contributor_stats (
    user_id UUID PRIMARY KEY,
    username TEXT NOT NULL,
    trust_score FLOAT NOT NULL,
    contributions INTEGER NOT NULL
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    preferred_language TEXT,
    timezone TEXT,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_superuser BOOLEAN NOT NULL DEFAULT FALSE,
    roles TEXT[] NOT NULL DEFAULT ARRAY['user'],
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    preferences JSONB
);

-- Marketplace items table
CREATE TABLE IF NOT EXISTS marketplace_items (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    tags TEXT[],
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- Duplicate suggestions table
CREATE TABLE IF NOT EXISTS duplicate_suggestions (
    id UUID PRIMARY KEY,
    person1_id UUID NOT NULL,
    person2_id UUID NOT NULL,
    confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    status VARCHAR(16) NOT NULL CHECK (status IN ('PENDING', 'MERGED', 'REJECTED')),
    created_at TIMESTAMP NOT NULL
);
