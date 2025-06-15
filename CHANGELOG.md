# Changelog

All notable changes to the Dzinza Genealogy Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0-beta.1] - 2025-06-14

### Added
- Initial beta release of Dzinza Genealogy Platform
- Complete development environment setup with Docker Compose
- Backend API Gateway with health checks and Swagger documentation
- Frontend React application with Vite build system
- Database support for PostgreSQL, MongoDB, Redis, and Elasticsearch
- Comprehensive logging and error handling middleware
- Environment configuration management
- API documentation available at `/api/docs`

### Development Environment
- **Frontend**: React + TypeScript + Vite running on port 5173
- **Backend**: Node.js + Express + TypeScript running on port 3001
- **Databases**: PostgreSQL (5432), MongoDB (27017), Redis (6379), Elasticsearch (9200)
- **Development Tools**: Hot reload, TypeScript compilation, ESLint, Prettier

### Infrastructure
- Docker Compose configuration for all services
- Automated development environment startup script
- Environment variable management with .env files
- Shared utilities and middleware across services

### Fixed
- Environment variable loading path issues in backend services
- Missing shared utilities and configuration files
- Database connection and authentication setup
- TypeScript compilation errors across all services
- Swagger API documentation configuration
- Vite configuration for frontend path aliases

### Technical Features
- Complete database abstraction layer with transaction support
- Health check endpoints for monitoring
- Error handling middleware with structured logging
- OpenTelemetry tracing integration ready
- JWT authentication utilities
- Metrics collection utilities for monitoring

### Getting Started
1. Clone the repository
2. Run `./scripts/start-dev.sh` to start the development environment
3. Access frontend at http://localhost:5173
4. Access API documentation at http://localhost:3001/api/docs
5. Check health status at http://localhost:3001/health

### Notes
This is a beta release focused on establishing the core development infrastructure. 
The application is ready for development work with a fully operational environment.
