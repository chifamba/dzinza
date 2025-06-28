#!/bin/bash
# Dzinza: Start Full Development Environment
# This script starts all databases and backend/frontend services for local development.

set -e

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/.."
cd "$PROJECT_ROOT"

# Colors for output
export GREEN='\033[0;32m'
export YELLOW='\033[1;33m'
export NC='\033[0m' # No Color

# ========================.  Set the environment variables ==============================


# =================================================================
# DATABASE CONFIGURATION
# =================================================================
# PostgreSQL - Main relational database
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=dzinza_db
export DB_USER=dzinza_user
export DB_PASSWORD=dzinza_secure_password_123
export DB_POOL_SIZE=20

# MongoDB - For certain services (auth, storage)
export MONGODB_URI=mongodb://localhost:27017/dzinza
export MONGO_PASSWORD=mongo_secure_password_456
export MONGODB_AUTH_DB=dzinza_auth
export MONGODB_GENEALOGY_DB=dzinza_genealogy
export MONGODB_STORAGE_DB=dzinza_storage
export MONGODB_SEARCH_DB=dzinza_search

# Redis - Session management and caching
export REDIS_URL=redis://localhost:6379
export REDIS_HOST=localhost
export REDIS_PORT=6379
#REDIS_PASSWORD=cmVkaXNfc2VjdXJlX3Bhc3N3b3JkXzc4OQo
export REDIS_PASSWORD=redis_secure_password_789
export REDIS_DB=0

# Elasticsearch - Advanced search capabilities
export ELASTICSEARCH_URL=http://localhost:9200
export ELASTICSEARCH_USERNAME=elasticsearch_user
export ELASTICSEARCH_PASSWORD='Admin123!_elasticsearch'

# =================================================================
# SERVICE CONFIGURATION
# =================================================================
export NODE_ENV=development
export API_BASE_URL=http://localhost:3000

# Service Ports
export GATEWAY_PORT=3000
export BACKEND_PORT=3001
export AUTH_SERVICE_PORT=3002
export SEARCH_SERVICE_PORT=3003
export GENEALOGY_SERVICE_PORT=3004
export STORAGE_SERVICE_PORT=3005

# Service URLs (for service discovery)
export AUTH_SERVICE_URL=http://localhost:3002
export GENEALOGY_SERVICE_URL=http://localhost:3004
export STORAGE_SERVICE_URL=http://localhost:3005
export SEARCH_SERVICE_URL=http://localhost:3003

# =================================================================
# AUTHENTICATION & SECURITY
# =================================================================
# JWT Configuration - Unified across all services
export JWT_SECRET=eW91cl8yNTZfYml0X2p3dF9zZWNyZXRfa2V5X2Zvcl9kZXZlbG9wbWVudF9jaGFuZ2VfaW5fcHJvZHVjdGlvbgobaead50ba4dee391c494e5a692ff9619e0ed00400c9bcd4809794c841308413c
export JWT_EXPIRES_IN=24h
export JWT_REFRESH_SECRET=e874ninW91cl8yNTZfYml0X2p3dF9zZWNyZXRfa2V5X2Zvcl9kZXZlbG9wbWVudF9jaGFuZ2VfaW5fcHJvZHVjdGlvbgobaead50ba4dee391c494e5a692ff9619e0ed00400c9bcd4809794c841308413c
export JWT_REFRESH_EXPIRES_IN=7d

# Password Security
export BCRYPT_ROUNDS=12
export BCRYPT_SALT_ROUNDS=12

# API Keys
export API_KEY=dev_api_key_123

# CORS Configuration
export ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:3001

# =================================================================
# CLOUD STORAGE & AWS CONFIGURATION
# =================================================================
export AWS_ACCESS_KEY_ID=dev_access_key
export AWS_SECRET_ACCESS_KEY=dev_secret_key
export AWS_REGION=us-east-1
export S3_BUCKET=dzinza-dev-bucket
export S3_BUCKET_NAME=dzinza-dev-bucket
export S3_BUCKET_REGION=us-east-1

# =================================================================
# EMAIL CONFIGURATION
# =================================================================
export SMTP_HOST=smtp.ethereal.email
export SMTP_PORT=587
export SMTP_SECURE=false
export SMTP_USER=
export SMTP_PASS=
export FROM_EMAIL=noreply@dzinza.org
export FROM_NAME='Dzinza Genealogy Platform'
export SUPPORT_EMAIL=support@dzinza.org

# =================================================================
# MONITORING & LOGGING
# =================================================================
export GRAFANA_PASSWORD=P@dmin123
export LOG_LEVEL=info
export LOG_FORMAT=json
export ENABLE_METRICS=true
export METRICS_PORT=9090

# OpenTelemetry Tracing Configuration
export ENABLE_TRACING=true
export OTEL_SERVICE_NAME=dzinza-platform
export JAEGER_ENDPOINT=http://localhost:4318/v1/traces

# =================================================================
# RATE LIMITING
# =================================================================
export RATE_LIMIT_WINDOW_MS=900000
export RATE_LIMIT_MAX_REQUESTS=1000
export AUTH_RATE_LIMIT_WINDOW_MS=900000
export AUTH_RATE_LIMIT_MAX_REQUESTS=20

# =================================================================
# FILE UPLOAD CONFIGURATION
# =================================================================
export MAX_FILE_SIZE=104857600
export MAX_IMAGE_SIZE=52428800
export MAX_DOCUMENT_SIZE=104857600
export ALLOWED_IMAGE_TYPES=jpg,jpeg,png,gif,webp,tiff,bmp
export ALLOWED_DOCUMENT_TYPES=pdf,doc,docx,txt,rtf

# =================================================================
# FRONTEND CONFIGURATION
# =================================================================
export VITE_API_URL=http://localhost:3001
export VITE_API_BASE_URL=http://localhost:3001
export VITE_AUTH_SERVICE_URL=http://localhost:3002
export VITE_GENEALOGY_SERVICE_URL=http://localhost:3004
export VITE_SEARCH_SERVICE_URL=http://localhost:3003
export VITE_STORAGE_SERVICE_URL=http://localhost:3005
export VITE_APP_NAME=Dzinza
export VITE_APP_VERSION=1.0.0
export VITE_JWT_STORAGE_KEY=dzinza_access_token
export VITE_REFRESH_TOKEN_KEY=dzinza_refresh_token
export VITE_SESSION_TIMEOUT=3600000
export VITE_ENABLE_MFA=true
export VITE_ENABLE_SOCIAL_LOGIN=false
export VITE_ENABLE_EMAIL_VERIFICATION=true
export VITE_DEFAULT_LANGUAGE=en
export VITE_SUPPORTED_LANGUAGES=en,sn,nd
export VITE_DEBUG_MODE=true
export VITE_LOG_LEVEL=debug

# =================================================================
# FEATURE FLAGS
# =================================================================
export ENABLE_DNA_MATCHING=true
export ENABLE_PHOTO_ENHANCEMENT=true
export ENABLE_AI_SUGGESTIONS=true
export ENABLE_REAL_TIME_COLLABORATION=true
export ENABLE_ADVANCED_SEARCH=true
export ENABLE_SOCIAL_FEATURES=true
export ENABLE_SWAGGER=true
export ENABLE_DEBUG_ROUTES=true
export ENABLE_SEED_DATA=false

# =================================================================
# GENEALOGY SPECIFIC CONFIGURATION
# =================================================================
export DEFAULT_TREE_PRIVACY=private
export MAX_TREE_SIZE=10000
export MAX_FAMILY_MEMBERS_PER_USER=5000
export DNA_MATCH_THRESHOLD=7.0
export MAX_DNA_MATCHES_DISPLAYED=1000

# =================================================================
# SEARCH CONFIGURATION
# =================================================================
export MAX_SEARCH_RESULTS=100
export SEARCH_TIMEOUT_MS=30000
export ES_INDEX_PREFIX=dzinza
export ES_MAX_RESULT_WINDOW=10000

# =================================================================
# RATE LIMITING (UPLOAD SPECIFIC)
# =================================================================
export UPLOAD_RATE_LIMIT_WINDOW_MS=3600000
export UPLOAD_RATE_LIMIT_MAX_REQUESTS=100

# =================================================================
# EXTERNAL APIS
# =================================================================
export ANCESTRY_API_KEY=
export FAMILYSEARCH_API_KEY=
export GOOGLE_MAPS_API_KEY=
export OPENAI_API_KEY=
export DNA_API_KEY=
export PHOTO_ENHANCEMENT_API_KEY=

# =================================================================
# LOCALIZATION
# =================================================================
export SUPPORTED_LANGUAGES=en,sn,nd
export DEFAULT_LANGUAGE=en
export DEFAULT_TIMEZONE=UTC

# 1. Start Databases (Postgres, MongoDB, Redis, Elasticsearch)
echo -e "${YELLOW}Starting database services with Docker Compose...${NC}"
docker-compose up -d postgres redis mongodb elasticsearch

# Wait for services to be ready
echo -e "${YELLOW}Waiting for database services to initialize...${NC}"
sleep 15

# 2. Start Backend and Python Microservices (Docker Compose)
echo -e "${YELLOW}Building all service containers with Docker Compose...${NC}"
docker-compose build

echo -e "${YELLOW}Starting all backend and microservices with Docker Compose...${NC}"
docker-compose up -d backend-service auth-service genealogy-service search-service storage-service

# 3. Start Frontend (Vite dev server, if not containerized)
if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
  echo -e "${YELLOW}Installing frontend dependencies...${NC}"
  (cd frontend && npm install)
  echo -e "${YELLOW}Starting frontend (Vite dev server) on port 5173...${NC}"
  (cd frontend && npm run dev &)
fi

# 4. Print status
sleep 2
echo -e "\n${GREEN}All services started!${NC}"
echo -e "${YELLOW}Service URLs:${NC}"
echo "  Frontend:         http://localhost:5173"
echo "  API Gateway:      http://localhost:3001"
echo "  Auth Service:     http://localhost:3002"
echo "  Search Service:   http://localhost:3003"
echo "  Genealogy Service:http://localhost:3004"
echo "  Storage Service:  http://localhost:3005"
echo "  Postgres:         localhost:5432"
echo "  MongoDB:          localhost:27017"
echo "  Redis:            localhost:6379"
echo "  Elasticsearch:    localhost:9200"

echo -e "\n${YELLOW}To stop all dev services, use:${NC}"
echo "  ./scripts/stop-dev.sh"

# Trap to kill all background jobs on exit
trap 'echo -e "\n${YELLOW}Stopping all dev services...${NC}"; ./scripts/stop-dev.sh; exit 0' SIGINT SIGTERM
wait