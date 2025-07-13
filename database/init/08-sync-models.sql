-- Migration: Sync database schema with SQLAlchemy models
-- Add missing columns to users, audit_logs, and refresh_tokens tables

-- USERS TABLE PATCHES
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- AUDIT_LOGS TABLE PATCHES
ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS id SERIAL PRIMARY KEY,
    ADD COLUMN IF NOT EXISTS user_id INTEGER,
    ADD COLUMN IF NOT EXISTS action VARCHAR(255) NOT NULL,
    ADD COLUMN IF NOT EXISTS entity_type VARCHAR(255) NOT NULL,
    ADD COLUMN IF NOT EXISTS entity_id INTEGER,
    ADD COLUMN IF NOT EXISTS details VARCHAR(255),
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- REFRESH_TOKENS TABLE PATCHES
ALTER TABLE refresh_tokens
    ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ADD COLUMN IF NOT EXISTS user_id UUID,
    ADD COLUMN IF NOT EXISTS token VARCHAR(255) NOT NULL UNIQUE,
    ADD COLUMN IF NOT EXISTS token_jti VARCHAR(255) NOT NULL UNIQUE,
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS ip_address VARCHAR(255),
    ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Add comments for documentation
COMMENT ON COLUMN users.is_verified IS 'Whether the user has been verified.';
COMMENT ON COLUMN users.is_active IS 'Whether the user is active.';
COMMENT ON COLUMN users.created_at IS 'Timestamp when the user was created.';
COMMENT ON COLUMN users.updated_at IS 'Timestamp when the user was last updated.';
COMMENT ON COLUMN audit_logs.action IS 'Action performed by the user.';
COMMENT ON COLUMN audit_logs.entity_type IS 'Type of entity affected.';
COMMENT ON COLUMN audit_logs.entity_id IS 'ID of the entity affected.';
COMMENT ON COLUMN audit_logs.details IS 'Additional details about the action.';
COMMENT ON COLUMN refresh_tokens.token IS 'Refresh token string.';
COMMENT ON COLUMN refresh_tokens.token_jti IS 'JWT ID for the token.';
COMMENT ON COLUMN refresh_tokens.expires_at IS 'Expiration timestamp for the token.';
COMMENT ON COLUMN refresh_tokens.created_at IS 'Timestamp when the token was created.';
COMMENT ON COLUMN refresh_tokens.revoked_at IS 'Timestamp when the token was revoked.';
COMMENT ON COLUMN refresh_tokens.ip_address IS 'IP address associated with the token.';
COMMENT ON COLUMN refresh_tokens.user_agent IS 'User agent string associated with the token.';
