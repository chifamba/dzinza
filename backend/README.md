# Dzinza Genealogy Platform - Backend

A comprehensive microservices-based backend for the Dzinza genealogy platform, providing secure, scalable, and feature-rich APIs for family tree management, DNA matching, historical records search, and media storage.

## 🏗️ Architecture

The backend follows a microservices architecture with the following services:

### Core Services
- **API Gateway** (Port 3000) - Routes requests, handles authentication, rate limiting
- **Auth Service** (Port 3002) - User authentication, MFA, password management
- **Genealogy Service** (Port 3001) - Family tree management, person profiles, relationships
- **Storage Service** (Port 3005) - File uploads, media management, photo enhancement
- **Search Service** (Port 3003) - Advanced search, analytics, Elasticsearch integration

### Data Layer
- **MongoDB** - Primary database for all services
- **Redis** - Session management, caching, rate limiting
- **Elasticsearch** - Advanced search capabilities
- **AWS S3** - File storage and CDN

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- MongoDB (or use Docker)
- Redis (or use Docker)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/dzinza/backend.git
   cd dzinza/backend
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Install Dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install service dependencies
   cd services/auth && npm install && cd ../..
   cd services/genealogy && npm install && cd ../..
   cd services/storage && npm install && cd ../..
   cd services/search && npm install && cd ../..
   cd services/gateway && npm install && cd ../..
   ```

4. **Start Infrastructure (Docker)**
   ```bash
   # Start databases only
   docker-compose up -d mongodb redis elasticsearch
   
   # Or start with monitoring tools
   docker-compose --profile monitoring up -d
   ```

5. **Start Services (Development)**
   ```bash
   # Terminal 1 - Auth Service
   cd services/auth && npm run dev
   
   # Terminal 2 - Genealogy Service
   cd services/genealogy && npm run dev
   
   # Terminal 3 - Storage Service
   cd services/storage && npm run dev
   
   # Terminal 4 - Search Service
   cd services/search && npm run dev
   
   # Terminal 5 - API Gateway
   cd services/gateway && npm run dev
   ```

### Production Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Scale specific services
docker-compose up -d --scale genealogy-service=3
```

## 📋 API Documentation

Once running, access the comprehensive API documentation:
- **Swagger UI**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/health
- **Service Monitoring**: http://localhost:3000/monitor/health

### Key Endpoints

#### Authentication (`/api/auth`)
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - User logout

#### MFA (`/api/mfa`)
- `POST /api/mfa/setup` - Setup multi-factor authentication
- `POST /api/mfa/verify` - Verify MFA code
- `POST /api/mfa/disable` - Disable MFA

#### Password Management (`/api/password`)
- `POST /api/password/forgot` - Request password reset
- `POST /api/password/reset` - Reset password with token
- `POST /api/password/change` - Change password (authenticated)

#### Family Tree (`/api/genealogy`)
- `GET /api/genealogy/trees` - List family trees
- `POST /api/genealogy/trees` - Create family tree
- `GET /api/genealogy/trees/:id` - Get family tree details
- `POST /api/genealogy/trees/:id/persons` - Add person to tree
- `GET /api/genealogy/trees/:id/export` - Export family tree

#### Media Storage (`/api/storage`)
- `POST /api/storage/upload` - Upload files
- `GET /api/storage/files` - List user files
- `GET /api/storage/files/:id` - Get file details
- `POST /api/storage/enhance` - Enhance photos with AI

#### Search (`/api/search`)
- `GET /api/search/global` - Search across all data
- `GET /api/search/persons` - Search family members
- `GET /api/search/records` - Search historical records

## 🔧 Configuration

### Environment Variables

Key environment variables (see `.env.example` for complete list):

```bash
# Service Configuration
NODE_ENV=development
GATEWAY_PORT=3000

# Database URLs
MONGODB_URI=mongodb://localhost:27017/dzinza
REDIS_URL=redis://localhost:6379
ELASTICSEARCH_URL=http://localhost:9200

# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# AWS S3 Storage
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=dzinza-storage

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password
```

### Service-Specific Configuration

Each service can be configured independently:

- **Auth Service**: JWT settings, MFA configuration, email templates
- **Genealogy Service**: Family tree limits, privacy settings
- **Storage Service**: File size limits, allowed types, S3 configuration
- **Search Service**: Elasticsearch settings, search limits

## 🛡️ Security Features

- **JWT Authentication** with refresh tokens
- **Multi-Factor Authentication** (TOTP)
- **Rate Limiting** per endpoint and user
- **Input Validation** and sanitization
- **CORS** protection
- **Helmet.js** security headers
- **Account Locking** after failed attempts
- **Audit Logging** for all actions
- **Password Complexity** requirements

## 🔍 Monitoring & Observability

### Health Checks
- Individual service health: `http://localhost:{port}/health`
- Gateway aggregated health: `http://localhost:3000/monitor/health`
- Service discovery: `http://localhost:3000/monitor/services`

### Metrics
- Prometheus metrics: `http://localhost:3000/metrics`
- System metrics: `http://localhost:3000/monitor/metrics`

### Database Management
- MongoDB Express: http://localhost:8081 (admin/admin123)
- Redis Commander: http://localhost:8082
- Elasticsearch Head: http://localhost:9100

### Logging
- Structured JSON logging with Winston
- Correlation IDs for request tracing
- Different log levels per environment
- Centralized logging in production

## 📊 Database Schema

### Auth Service
- **users**: User accounts, preferences, security settings
- **refresh_tokens**: JWT refresh token management
- **audit_logs**: Security and action audit trail

### Genealogy Service
- **family_trees**: Family tree metadata and settings
- **persons**: Individual family member profiles
- **relationships**: Family relationships and connections
- **collaborations**: Shared family tree access

### Storage Service
- **files**: File metadata, S3 references, thumbnails
- **galleries**: Organized photo collections

### Search Service
- **search_logs**: Search query analytics
- **search_analytics**: Aggregated search insights

## 🧪 Testing

```bash
# Run all tests
npm test

# Run service-specific tests
cd services/auth && npm test
cd services/genealogy && npm test

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration
```

## 🚀 Deployment

### Docker Production

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy with production configuration
docker-compose -f docker-compose.prod.yml up -d

# View production logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Environment-Specific Deployments

- **Development**: Local development with hot reload
- **Staging**: Production-like environment for testing
- **Production**: Full production deployment with monitoring

### Scaling

```bash
# Scale specific services
docker-compose up -d --scale genealogy-service=3 --scale storage-service=2

# Load balancing handled by API Gateway
```

## 🔄 API Versioning

APIs use semantic versioning:
- `v1`: Current stable version
- `v2`: Next major version (backwards incompatible)
- `beta`: Preview features

Example: `/api/v1/genealogy/trees`

## 📈 Performance

### Optimization Features
- **Connection Pooling** for MongoDB
- **Redis Caching** for frequently accessed data
- **File Compression** with gzip
- **Image Optimization** for photos
- **Database Indexing** for fast queries
- **CDN Integration** for static assets

### Rate Limits
- General API: 1000 requests/15 minutes
- Authentication: 20 requests/15 minutes
- File uploads: 100 requests/hour
- Search queries: 100 requests/minute

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write comprehensive tests
- Update API documentation
- Use conventional commit messages
- Ensure all services pass health checks

## 📄 License

This project is proprietary software. All rights reserved.

## 📞 Support

- Email: support@dzinza.com
- Documentation: https://docs.dzinza.com
- Issues: https://github.com/dzinza/backend/issues

---

**Dzinza Genealogy Platform** - Connecting families, preserving heritage. 🌳
