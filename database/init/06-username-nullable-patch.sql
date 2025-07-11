-- Patch to make username column nullable for user registration
-- This allows the auth service to generate usernames from email when not provided

ALTER TABLE users ALTER COLUMN username DROP NOT NULL;
