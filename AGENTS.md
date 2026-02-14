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
  ```

#### Backend Services

- **Language:** Go 1.26+
- **HTTP Framework:** Gin
- **Location:** `services/<service_name>/`
- **Project Layout:**
  ```
  services/<service_name>/
  ├── cmd/
  │   └── main.go           # Entry point
  ├── internal/
  │   ├── handlers/         # HTTP route handlers
  │   ├── models/           # Data models (GORM structs, DTOs)
  │   ├── repository/       # Database access layer
  │   ├── service/          # Business logic
  │   └── middleware/       # Auth, logging, CORS middleware
  ├── Dockerfile
  ├── go.mod
  └── go.sum
  ```
- **Shared Code:** `services/pkg/` — Common logging, health checks, auth middleware, config, response helpers
- **Primary Services:**
  - `auth_service` — Authentication and authorization (PostgreSQL, Redis)
  - `genealogy_service` — Family tree management (Neo4j)
  - `media_storage_service` — File/media storage (Garage S3)
  - `search_discovery_service` — Search functionality (Elasticsearch)
  - `notification_service` — User notifications (PostgreSQL, Redis)
  - See `docs/Full_Requirements_Spec.md` for the complete service inventory (15 services)

#### Data Layer

- **Neo4j:** Primary genealogy data (graph structure)
- **PostgreSQL:** Relational data, user accounts
- **MongoDB:** Document storage (support tickets)
- **Redis:** Caching, session management, Pub/Sub event bus
- **Elasticsearch:** Full-text search indexing

#### Infrastructure

- **Docker Compose:** Local orchestration
- **Prometheus & Grafana:** Monitoring and metrics
- **Garage:** S3-compatible object storage (3-node cluster)
- **MailHog:** Local SMTP capture for email testing

## Development Workflow

### Quick Start

```bash
# Start infrastructure services (databases, cache, storage)
docker compose up -d

# Start frontend dev server
cd frontend && npm install && npm run dev

# Run a Go service locally (example: auth)
cd services/auth_service && go run cmd/main.go
```

### Key Libraries (Go)

| Purpose | Library |
|---------|---------|
| HTTP Framework | `github.com/gin-gonic/gin` |
| PostgreSQL ORM | `gorm.io/gorm` + `gorm.io/driver/postgres` (pgx) |
| Neo4j Driver | `github.com/neo4j/neo4j-go-driver/v5` |
| MongoDB Driver | `go.mongodb.org/mongo-driver` |
| JWT | `github.com/golang-jwt/jwt/v5` |
| Redis | `github.com/redis/go-redis/v9` |
| Validation | `github.com/go-playground/validator/v10` |
| Config | `github.com/spf13/viper` or `github.com/caarlos0/env` |
| Logging | `log/slog` (stdlib) or `github.com/rs/zerolog` |
| OpenAPI | `github.com/swaggo/swag` |
| S3 Client | `github.com/aws/aws-sdk-go-v2` |
| Testing | `github.com/stretchr/testify` |

### Project Structure

```
dzinza/
├── frontend/              # React TypeScript SPA
├── services/              # Go microservices
│   ├── pkg/               # Shared Go packages (logging, auth, config)
│   ├── auth_service/      # Authentication service
│   ├── genealogy_service/ # Family tree logic
│   └── .../               # Other services
├── docs/                  # Requirements spec, OpenAPI specs
│   ├── Full_Requirements_Spec.md
│   └── openapi/           # Per-service OpenAPI YAML files
├── database/              # DB init scripts
├── scripts/               # Development and deployment scripts
├── k8s/                   # Kubernetes manifests
├── secrets/               # Docker secrets (git-ignored)
└── docker-compose.yml     # Local development orchestration
```

## Development Guidelines

### Code Style

- **Go:** Follow standard Go conventions (`gofmt`, `golint`), use struct tags for validation and JSON
- **Frontend:** ESLint + Prettier
- **API Design:** RESTful conventions, OpenAPI 3.0 specifications

### Testing

- **Go:** `go test ./...` with `testify` for assertions, `testcontainers-go` for integration tests
- **Frontend:** Component tests (Vitest), E2E tests (Playwright)
- **Coverage:** Aim for >80% coverage on business logic

### API Documentation

OpenAPI specifications are in `docs/openapi/`. Each service maintains its own spec, generated via `swaggo/swag` annotations or maintained manually.

### Authentication Flow

- JWT-based authentication (access + refresh tokens)
- Session management via Redis
- Middleware in `services/pkg/auth/` for token validation

## Key Documentation Files

- `docs/Full_Requirements_Spec.md` — Complete requirements specification (source of truth)
- `docs/openapi/` — Per-service OpenAPI specs
- `DATA_MODELS.md` — Database schemas and models
- `docker-compose.yml` — Infrastructure services configuration

## Environment Configuration

- Environment variables and Docker secrets (files in `/secrets/`)
- Services read config from env vars and `/run/secrets/` files
- See `docs/Full_Requirements_Spec.md` Section 6.5 for secret inventory

## Working with This Codebase

### Before Making Changes

1. Check `docs/Full_Requirements_Spec.md` for requirements context
2. Review existing tests for patterns
3. Ensure Docker infrastructure is running (`docker compose up -d`)
4. Check for Go build errors (`go build ./...`)

### When Adding a New Service

1. Create directory: `services/<service_name>/cmd/main.go`, `internal/`, `Dockerfile`, `go.mod`
2. Import shared packages from `services/pkg/`
3. Add service to `docker-compose.yml`
4. Add/update OpenAPI spec in `docs/openapi/`
5. Add appropriate tests

### Common Pitfalls to Avoid

- Don't bypass authentication/authorization checks
- Always validate user input via struct tags
- Maintain backward compatibility in APIs
- Don't commit sensitive credentials or keys
- Use the shared `pkg/` packages for consistency (logging, health, auth)
