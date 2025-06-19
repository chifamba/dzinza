-- Dzinza Database Initialization Script
-- This script creates seed data for the Dzinza application

-- Enable necessary extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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
    is_admin,
    is_active
) 
VALUES (
    'admin@dzinza.com',
    'admin',
    '$2a$12$RjWxsKktGGD9crf7VQwrzegIB4bFLx5t.sGCfYalaHa/4uUy15TVu',
    'Admin',
    'User',
    true,
    true,
    true
) ON CONFLICT (email) DO NOTHING; -- Don't overwrite if user already exists

-- Insert a test user for development (password: TestPassword123!)
-- Password hash generated with: bcrypt.hashSync('TestPassword123!', 12)
INSERT INTO users (
    email, 
    username, 
    password_hash, 
    first_name, 
    last_name, 
    email_verified, 
    is_admin,
    is_active
) 
VALUES (
    'test@dzinza.com',
    'testuser',
    '$2a$12$c573zjncgdSPlXDn1CJtmuFQeHEGDAujGAvoQPx.KN7biTf5GGh2q',
    'Test',
    'User',
    true,
    false,
    true
) ON CONFLICT (email) DO NOTHING;
