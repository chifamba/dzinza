-- Create TokenPayload class extension for auth service
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    ip_address VARCHAR(100),
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    details JSONB
);

-- Create index on user_id and timestamp for faster lookups
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_timestamp_idx ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs(action);

-- Fix token_payload schema to include 'jti' field
-- Note: This is a comment since we can't directly modify the schema class in SQL,
-- but documenting the issue for developers to address in the application code.
-- The Python class TokenPayload should include a 'jti' field.
