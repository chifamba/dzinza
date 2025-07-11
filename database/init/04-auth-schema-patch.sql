-- Create refresh_tokens table for the auth service
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

-- Create index on token for faster lookups
CREATE INDEX IF NOT EXISTS refresh_tokens_token_idx ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS refresh_tokens_token_jti_idx ON refresh_tokens(token_jti);
CREATE INDEX IF NOT EXISTS refresh_tokens_user_id_idx ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_session_id_idx ON refresh_tokens(session_id);
CREATE INDEX IF NOT EXISTS refresh_tokens_device_fingerprint_idx ON refresh_tokens(device_fingerprint);

-- Add session tracking fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_login_user_agent TEXT,
ADD COLUMN IF NOT EXISTS current_session_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_concurrent_sessions INTEGER DEFAULT 5;

-- Update user_agent column type to TEXT for longer user agent strings
ALTER TABLE refresh_tokens 
ALTER COLUMN user_agent TYPE TEXT;

-- Add comments for documentation
COMMENT ON COLUMN users.last_login_user_agent IS 'User agent string from last login';
COMMENT ON COLUMN users.current_session_count IS 'Number of currently active sessions';
COMMENT ON COLUMN users.max_concurrent_sessions IS 'Maximum allowed concurrent sessions for this user';

COMMENT ON COLUMN refresh_tokens.session_id IS 'Redis session identifier for this token';
COMMENT ON COLUMN refresh_tokens.device_fingerprint IS 'Browser/device fingerprint for security';
COMMENT ON COLUMN refresh_tokens.location_info IS 'JSON string containing geolocation data';
