# System Architecture

## Overview

Dzinza is built using a modern, scalable architecture designed to handle millions of users and billions of genealogical records. The system follows microservices principles with clear separation of concerns.

## High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │    │  Mobile App     │    │   Admin Panel   │
│   (React/TS)    │    │   (React       │    │   (React/TS)    │
└─────────────────┘    │    Native)      │    └─────────────────┘
         │              └─────────────────┘             │
         │                        │                     │
         └────────────────────────┼─────────────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │      Load Balancer        │
                    │     (Nginx/CloudFlare)    │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │       API Gateway         │
                    │    (Express.js/Node.js)   │
                    └─────────────┬─────────────┘
                                  │
            ┌─────────────────────┼─────────────────────┐
            │                     │                     │
  ┌─────────▼─────────┐ ┌─────────▼─────────┐ ┌─────────▼─────────┐
  │   Auth Service    │ │   Core Service    │ │  Media Service    │
  │   (Node.js/JWT)   │ │   (Node.js/TS)    │ │   (Node.js/TS)    │
  └─────────┬─────────┘ └─────────┬─────────┘ └─────────┬─────────┘
            │                     │                     │
            │           ┌─────────▼─────────┐           │
            │           │   Search Service  │           │
            │           │ (Elasticsearch)   │           │
            │           └─────────┬─────────┘           │
            │                     │                     │
    ┌───────▼────────┐  ┌─────────▼─────────┐  ┌───────▼────────┐
    │   PostgreSQL   │  │      Redis        │  │   File Storage │
    │  (Primary DB)  │  │    (Cache/       │  │  (AWS S3/Local) │
    │                │  │     Sessions)     │  │                │
    └────────────────┘  └───────────────────┘  └────────────────┘
```

## Frontend Architecture

### React Application Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Basic UI components (Button, Input, etc.)
│   ├── forms/           # Form components
│   ├── charts/          # Data visualization components
│   └── layout/          # Layout components (Header, Sidebar, etc.)
├── pages/               # Page components
│   ├── auth/            # Authentication pages
│   ├── dashboard/       # Dashboard pages
│   ├── family-tree/     # Family tree pages
│   └── profile/         # User profile pages
├── hooks/               # Custom React hooks
├── services/            # API service layer
├── store/               # State management (Redux/Zustand)
├── utils/               # Utility functions
├── types/               # TypeScript definitions
└── styles/              # Global styles and themes
```

### State Management

- **Global State**: Redux Toolkit for complex state
- **Server State**: React Query for API data caching
- **Form State**: React Hook Form for form management
- **Local State**: React useState for component-specific state

### Key Libraries

- **React 18** - UI framework with concurrent features
- **TypeScript** - Type safety and developer experience
- **Tailwind CSS** - Utility-first styling
- **React Router** - Client-side routing
- **React Query** - Server state management
- **D3.js** - Data visualization for family trees
- **Framer Motion** - Animations and transitions

## Backend Architecture

### Microservices Design

#### 1. Authentication Service
- User registration and login
- JWT token management
- Password reset functionality
- OAuth integration (Google, Facebook)

#### 2. Core API Service
- Family tree management
- Individual profiles
- Relationship management
- User preferences

#### 3. Search Service
- Historical record search
- Full-text search capabilities
- Advanced filtering and sorting
- Search result ranking

#### 4. DNA Service
- DNA data processing
- Genetic matching algorithms
- Ethnicity estimation
- Health trait analysis

#### 5. Media Service
- Photo/document upload
- Image processing and enhancement
- File storage management
- Thumbnail generation

### Database Design

#### Primary Database (PostgreSQL)
- **Users**: User accounts and profiles
- **Families**: Family group management
- **Individuals**: Person records in family trees
- **Relationships**: Family connections
- **DNA Data**: Genetic information
- **Subscriptions**: Billing and plan management

#### Document Store (MongoDB)
- **Historical Records**: Birth certificates, census data
- **Media Metadata**: Photo and document information
- **Search Indexes**: Optimized search data
- **User Activities**: Audit logs and analytics

#### Cache Layer (Redis)
- Session storage
- API response caching
- Real-time notifications
- Rate limiting data

#### Search Engine (Elasticsearch)
- Full-text search across all records
- Advanced query capabilities
- Aggregations and analytics
- Real-time indexing

## Security Architecture

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- Multi-factor authentication (MFA)
- OAuth 2.0 integration

### Data Protection
- End-to-end encryption for sensitive data
- Data anonymization for analytics
- GDPR compliance measures
- Regular security audits

### Infrastructure Security
- SSL/TLS encryption
- API rate limiting
- DDoS protection
- Vulnerability scanning

## Deployment Architecture

### Containerization
- Docker containers for all services
- Multi-stage builds for optimization
- Health checks and monitoring
- Resource limits and requests

### Orchestration (Kubernetes)
```yaml
# Example pod specification
apiVersion: v1
kind: Pod
metadata:
  name: dzinza-api
spec:
  containers:
  - name: api
    image: dzinza/api:latest
    ports:
    - containerPort: 8000
    env:
    - name: NODE_ENV
      value: "production"
    resources:
      requests:
        memory: "256Mi"
        cpu: "250m"
      limits:
        memory: "512Mi"
        cpu: "500m"
```

### Cloud Infrastructure (AWS)
- **EKS** - Managed Kubernetes service
- **RDS** - Managed PostgreSQL database
- **ElastiCache** - Managed Redis service
- **S3** - Object storage for media files
- **CloudFront** - CDN for static assets
- **Route 53** - DNS management
- **Application Load Balancer** - Traffic distribution

## Performance Considerations

### Frontend Optimization
- Code splitting and lazy loading
- Image optimization and WebP format
- Service worker for offline functionality
- Bundle size optimization

### Backend Optimization
- Database query optimization
- Connection pooling
- Horizontal pod autoscaling
- CDN for static assets

### Monitoring & Observability
- **Prometheus** - Metrics collection
- **Grafana** - Metrics visualization
- **Jaeger** - Distributed tracing
- **ELK Stack** - Centralized logging

## Scalability Strategy

### Horizontal Scaling
- Stateless microservices
- Load balancing across pods
- Database read replicas
- Sharding for large datasets

### Vertical Scaling
- Resource-based pod scaling
- Database instance upgrades
- Memory optimization
- CPU utilization monitoring

### Global Distribution
- Multi-region deployment
- Geo-distributed CDN
- Regional database replicas
- Edge computing for search
