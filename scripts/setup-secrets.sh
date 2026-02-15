#!/bin/bash

# setup-secrets.sh
# Generates default secret files for local development if they don't exist.
# WARNING: These secrets are for LOCAL DEVELOPMENT ONLY. Do not use in production.

SECRETS_DIR="./secrets"
mkdir -p "$SECRETS_DIR"

# Helper function to create a secret file if it doesn't exist
create_secret() {
    local filename=$1
    local default_value=$2
    local filepath="${SECRETS_DIR}/${filename}"

    if [ ! -f "$filepath" ]; then
        echo "$default_value" > "$filepath"
        echo "Created $filename"
    else
        echo "$filename already exists, skipping."
    fi
}

echo "Setting up local development secrets in $SECRETS_DIR..."

# Database Passwords
create_secret "db_password.txt" "postgres"
create_secret "mongo_password.txt" "mongo"
create_secret "redis_password.txt" "redis"

# JWT Secrets (using random strings for better simulation)
create_secret "jwt_secret.txt" "local-dev-jwt-secret-key-change-me"
create_secret "jwt_refresh_secret.txt" "local-dev-jwt-refresh-secret-key-change-me"

# Email / SMTP
# For MailHog, password is usually ignored/empty, but we create the file
create_secret "smtp_pass.txt" ""

# Grafana
create_secret "grafana_password.txt" "admin"

# OAuth (Placeholders)
create_secret "google_client_id.txt" "placeholder-google-client-id"
create_secret "google_client_secret.txt" "placeholder-google-client-secret"

# Object Storage (Garage / S3)
create_secret "aws_access_key_id.txt" "garage_access_key"
create_secret "aws_secret_access_key.txt" "garage_secret_key"

# Initial Admin
create_secret "seed_admin_password.txt" "Admin123!"

echo "Done! Secrets are ready in $SECRETS_DIR."
