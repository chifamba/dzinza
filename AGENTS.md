# AI Agent Context for Dzinza Project

This document provides essential context for AI coding assistants (GitHub Copilot, Gemini, Claude, etc.) working with the Dzinza project.

## Project Overview

Dzinza is a decentralized, community-driven genealogy platform enabling users to collaboratively build and verify family trees. The platform emphasizes data privacy, integrity, and trustworthiness through a microservices architecture.

**Core Technology:** Graph database (Neo4j) modeling family trees, relationships, and user trust levels.

## Architecture

### Microservices Structure

#### Frontend

- **Technology:** React with TypeScript
- **Build Tool:** Vite
- **Testing:** Vitest, Playwright (E2E)
- **Location:** `frontend/`
- **Dev Commands:**
  ```bash
  npm run dev      # Development server
  npm run build    # Production build
  npm run test     # Run tests
  ```

#### Backend Services

- **Framework:** FastAPI (Python)
- **Primary Services:**
  - `auth-service` - Authentication and authorization
  - `backend-service` - Core business logic
  - `genealogy-service` - Family tree management
  - `search-service` - Search functionality
  - `storage-service` - File/media storage

#### Data Layer

- **Neo4j:** Primary genealogy data (graph structure)
- **PostgreSQL:** Relational data, user accounts
- **MongoDB:** Document storage
- **Redis:** Caching, session management
- **Elasticsearch:** Full-text search indexing

#### Infrastructure

- **Docker Compose:** Local orchestration
- **Prometheus & Grafana:** Monitoring and metrics
- **Garage:** S3-compatible object storage

## Development Workflow

### Quick Start

```bash
# Start full development environment
./scripts/start-dev.sh

# Stop all services
./scripts/stop-dev.sh

# Or use VS Code tasks (Cmd+Shift+P → "Run Task")
# 🚀 Start Full Development Environment
```

### Common Tasks (via VS Code)

- `🔧 Start Backend Service Only`
- `🎨 Start Frontend Only`
- `🗄️ Start Database Services`
- `🧪 Run All Tests`
- `✨ Lint All Code`

### Project Structure

```
dzinza/
├── frontend/              # React TypeScript SPA
├── auth-service/          # Authentication microservice
├── backend-service/       # Core API service
├── genealogy-service/     # Family tree logic
├── scripts/               # Development and deployment scripts
├── docs/                  # API documentation (OpenAPI specs)
├── k8s/                   # Kubernetes manifests
└── docker-compose.yml     # Local development orchestration
```

## Development Guidelines

### Code Style

- **Frontend:** ESLint + Prettier configuration in `eslint.config.js`
- **Backend:** Python type hints, FastAPI patterns
- **API Design:** RESTful conventions, OpenAPI 3.0 specifications

### Testing

- **Frontend:** Component tests (Vitest), E2E tests (Playwright)
- **Backend:** pytest with asyncio support
- **Coverage:** Aim for >80% coverage on critical paths

### API Documentation

OpenAPI specifications are in `docs/openapi/`. Each service maintains its own spec.

### Authentication Flow

- JWT-based authentication
- Session management via Redis
- Refer to `auth-service/SESSION_MANAGEMENT.md` for details

## Key Documentation Files

- `README.md` - Project overview
- `ARCHITECTURE.md` - Detailed architecture documentation
- `DATA_MODELS.md` - Database schemas and models
- `docs/API.md` - API endpoint documentation
- Service-specific READMEs in each service directory

## Environment Configuration

- Environment variables defined in `.env` files (not tracked)
- Sample configuration in `backup.env`
- Database connection strings in service config files

## CI/CD

- GitHub Actions workflows for automated testing and deployment
- Docker image building and registry pushing
- Scripts in `scripts/` for various automation tasks

## Working with This Codebase

### Before Making Changes

1. Check relevant documentation in `docs/`
2. Review existing tests for patterns
3. Ensure development environment is running
4. Check for TypeScript/Python type errors

### When Adding Features

1. Update OpenAPI specs if adding API endpoints
2. Add appropriate tests (unit + integration)
3. Update relevant documentation
4. Follow existing patterns in the codebase

### Common Pitfalls to Avoid

- Don't bypass authentication/authorization checks
- Always validate user input
- Maintain backward compatibility in APIs
- Keep database migrations reversible
- Don't commit sensitive credentials or keys

## Getting Help

- Check existing documentation in `docs/`
- Review similar implementations in the codebase
- Examine test files for usage examples
- Look for TODO comments for known issues
