# Environment Configuration Guide

## Overview

The Dzinza project uses a hierarchical environment configuration system that promotes consistency, security, and maintainability across all services.

## Configuration Structure

### 1. Main Configuration Files

#### Root Level (Project-wide)

- **`.env`** - Main development environment file with all shared configuration
- **`.env.development`** - Development-specific overrides
- **`.env.production`** - Production-specific overrides
- **`.env.example`** - Template file for new environments (DO NOT use directly)

#### Service Level (Service-specific)

Each service has its own `.env` file containing only service-specific configuration:

- `auth-service/.env` - Authentication service overrides
- `backend-service/.env` - Backend service overrides
- `genealogy-service/.env` - Genealogy service overrides
- `search-service/.env` - Search service overrides
- `storage-service/.env` - Storage service overrides

### 2. Configuration Hierarchy

Configuration is loaded in this order (later files override earlier ones):

1. **Root `.env`** - Base configuration shared across all services
2. **Service-specific `.env`** - Service-level overrides
3. **Environment-specific files** (`.env.development`, `.env.production`)
4. **System environment variables** - Highest priority

## Key Principles

### 1. **Centralized Shared Configuration**

All common settings (database credentials, JWT secrets, AWS keys) are defined once in the root `.env` file.

### 2. **Service-Specific Overrides**

Each service only defines configuration that is unique to that service (port numbers, service names, specific feature flags).

### 3. **Environment-Specific Overrides**

Development and production environments only override what's different from the base configuration.

### 4. **Consistent Variable Naming**

- Database: `DB_*`, `MONGODB_*`, `REDIS_*`, `ELASTICSEARCH_*`
- Authentication: `JWT_*`, `BCRYPT_*`, `API_KEY`
- Services: `*_SERVICE_*`, `*_PORT`, `*_URL`
- Frontend: `VITE_*`
- AWS: `AWS_*`, `S3_*`
- Features: `ENABLE_*`

### 5. **Security Best Practices**

- Sensitive values are base64 encoded where appropriate
- JWT secrets are unified across all services
- Example files contain placeholder values only
- Actual `.env` files are git-ignored

## Configuration Sections

### Database Configuration

```bash
# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dzinza_db
DB_USER=dzinza_user
DB_PASSWORD=dzinza_secure_password_123

# MongoDB
MONGODB_URI=mongodb://localhost:27017/dzinza
MONGO_PASSWORD=bW9uZ29fc2VjdXJlX3Bhc3N3b3JkXzQ1Ngo # base64 encoded

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=cmVkaXNfc2VjdXJlX3Bhc3N3b3JkXzc4OQo # base64 encoded
```

### Service Configuration

```bash
# Service Discovery
AUTH_SERVICE_URL=http://localhost:3002
GENEALOGY_SERVICE_URL=http://localhost:3004
STORAGE_SERVICE_URL=http://localhost:3005
SEARCH_SERVICE_URL=http://localhost:3003

# Service Ports
GATEWAY_PORT=3000
BACKEND_PORT=3001
AUTH_SERVICE_PORT=3002
SEARCH_SERVICE_PORT=3003
GENEALOGY_SERVICE_PORT=3004
STORAGE_SERVICE_PORT=3005
```

### Security Configuration

```bash
# JWT (unified across all services)
JWT_SECRET=your_unified_jwt_secret
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your_unified_refresh_secret
JWT_REFRESH_EXPIRES_IN=7d

# Password Security
BCRYPT_ROUNDS=12
BCRYPT_SALT_ROUNDS=12
```

### Frontend Configuration

```bash
# API Endpoints
VITE_API_BASE_URL=http://localhost:3001
VITE_AUTH_SERVICE_URL=http://localhost:3002

# Application Settings
VITE_APP_NAME=Dzinza
VITE_APP_VERSION=1.0.0
VITE_ENABLE_MFA=true
VITE_DEBUG_MODE=true # false in production
```

## Usage Guidelines

### Setting Up a New Environment

1. **Copy the example file:**

   ```bash
   cp .env.example .env
   ```

2. **Replace all placeholder values** with actual values appropriate for your environment

3. **Never commit `.env` files** to version control

### Adding New Configuration

1. **Shared configuration** → Add to root `.env` and `.env.example`
2. **Service-specific configuration** → Add to service's `.env` file
3. **Environment-specific configuration** → Add to `.env.development` or `.env.production`

### Best Practices

1. **Use descriptive variable names** following the established naming conventions
2. **Document new variables** in this guide when adding them
3. **Use base64 encoding** for passwords and sensitive data
4. **Group related variables** using comments and sections
5. **Test configuration changes** across all affected services

## Troubleshooting

### Common Issues

1. **Variable not found**: Check the configuration hierarchy - ensure the variable is defined in the right file
2. **Service can't connect**: Verify service URLs and ports match between configuration files
3. **Authentication failures**: Ensure JWT secrets are identical across all services
4. **Database connection issues**: Check that database credentials and connection strings are correct

### Debugging Configuration

1. **Check loaded values** using environment variable inspection in your application
2. **Verify file hierarchy** - ensure files are being loaded in the correct order
3. **Test with minimal configuration** - start with basic settings and add complexity gradually

## Security Considerations

1. **Never commit actual `.env` files** - only commit `.env.example` templates
2. **Use strong, unique passwords** for all services
3. **Rotate secrets regularly** in production environments
4. **Limit access** to environment files in production
5. **Use proper encryption** for sensitive data in transit and at rest

## Migration from Old Configuration

If upgrading from the previous configuration system:

1. **Backup existing `.env` files**
2. **Copy shared configuration** to root `.env`
3. **Move service-specific settings** to service `.env` files
4. **Remove duplicate variables** across files
5. **Update variable names** to follow new conventions
6. **Test all services** to ensure they load configuration correctly
