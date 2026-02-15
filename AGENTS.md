# AI Agent Context for Dzinza Project

Context for AI coding assistants (GitHub Copilot, Gemini, Claude, etc.) working with the Dzinza project.

## Project Overview

Dzinza is a decentralized, community-driven genealogy platform. Users collaboratively build and verify family trees with emphasis on data privacy, integrity, and trust via a microservices architecture.

**Core Technology:** Graph database (Neo4j) modeling family trees, relationships, and user trust levels.

## Architecture

### Frontend

- **Stack:** React + TypeScript, Vite, Vitest, Playwright (E2E)
- **Location:** `frontend/`

### Backend Services (Go 1.26+)

- **Framework:** Gin  
- **Location:** `services/<service_name>/`
- **Layout:**
  ```
  services/<service_name>/
  ├── cmd/main.go                # Entry point
  ├── internal/
  │   ├── handlers/              # HTTP route handlers (thin, delegate to service)
  │   ├── models/                # Domain models, DTOs, custom error types
  │   ├── repository/            # Data access layer (interface + implementations)
  │   ├── service/               # Business logic (interface + implementations)
  │   └── middleware/             # Auth, logging, CORS
  ├── tests/{unit,integration}/
  ├── Dockerfile
  ├── .golangci.yml
  ├── go.mod / go.sum
  ```
- **Shared Code:** `services/pkg/` — Common logging, health checks, auth middleware, config, response helpers
- **Services:** `auth_service` (PostgreSQL, Redis), `genealogy_service` (Neo4j), `media_storage_service` (Garage S3), `search_discovery_service` (Elasticsearch), `notification_service` (PostgreSQL, Redis). See `docs/Full_Requirements_Spec.md` for the full 15-service inventory.

### Data Layer

| Store | Purpose |
|-------|---------|
| Neo4j | Primary genealogy data (graph) |
| PostgreSQL | Relational data, user accounts |
| MongoDB | Document storage (support tickets) |
| Redis | Caching, sessions, Pub/Sub |
| Elasticsearch | Full-text search indexing |

### Infrastructure

- **Docker Compose:** Local orchestration
- **Prometheus & Grafana:** Monitoring
- **Garage:** S3-compatible object storage (3-node cluster)
- **MailHog:** Local SMTP capture

### Project Structure

```
dzinza/
├── frontend/              # React TypeScript SPA
├── services/              # Go microservices
│   ├── pkg/               # Shared Go packages
│   └── <service_name>/    # Individual services
├── docs/                  # Requirements spec, OpenAPI specs
├── database/              # DB init scripts
├── scripts/               # Dev and deploy scripts
├── k8s/                   # Kubernetes manifests
├── secrets/               # Docker secrets (git-ignored)
└── docker-compose.yml
```

### Key Go Libraries

| Purpose | Library |
|---------|---------|
| HTTP | `github.com/gin-gonic/gin` |
| PostgreSQL ORM | `gorm.io/gorm` + `gorm.io/driver/postgres` |
| Neo4j | `github.com/neo4j/neo4j-go-driver/v5` |
| MongoDB | `go.mongodb.org/mongo-driver` |
| JWT | `github.com/golang-jwt/jwt/v5` |
| Redis | `github.com/redis/go-redis/v9` |
| Validation | `github.com/go-playground/validator/v10` |
| Config | `github.com/spf13/viper` or `github.com/caarlos0/env` |
| Logging | `log/slog` (stdlib) or `github.com/rs/zerolog` |
| OpenAPI | `github.com/swaggo/swag` |
| S3 | `github.com/aws/aws-sdk-go-v2` |
| Testing | `github.com/stretchr/testify`, `github.com/testcontainers/testcontainers-go` |

---

## ⚠️ MANDATORY: Container-Only Build & Test Policy

> [!CAUTION]
> **ALL builds, tests, linting, and verification MUST happen inside Docker containers.**
> NEVER run `go build`, `go test`, `npm test`, `golangci-lint`, or any build/test tool directly on the host system.
> Always use Docker Compose to build fresh images and run tests in containers.

### Required Workflow

```bash
# 1. Build fresh images (NEVER skip this step)
DOCKER_BUILDKIT=0 docker compose build

# 2. Start services
docker compose up -d

# 3. Verify health
docker compose ps
docker compose logs -f <service>

# 4. Run tests inside containers
docker compose exec <service> go test ./... -race -cover
# Or use multi-stage Dockerfile test target:
DOCKER_BUILDKIT=0 docker compose build --build-arg RUN_TESTS=true

# 5. Tear down
docker compose down

# One-liner: build + start
docker compose up --build -d
```

> [!IMPORTANT]
> Running `docker compose up` WITHOUT `docker compose build` (or `--build`) uses **stale images**
> that do not contain your latest code changes. Always rebuild first.

---

## Engineering Standards

### Go Services — Mandatory Requirements

#### Architecture Principles

- **Dependency Injection:** Constructor functions, interfaces for testability
- **Layered Architecture:** Handler → Service → Repository (no business logic in handlers)
- **Interface Segregation:** Small, focused interfaces per layer
- **Single Responsibility:** One clear purpose per file/package
- **Minimal `cmd/main.go`:** 5–30 lines, only wiring

#### Error Handling

- **Always** wrap errors with context: `fmt.Errorf("failed to create user: %w", err)`
- **Define** custom domain errors: `var ErrUserNotFound = errors.New("user not found")`
- **Use** structured logging with `slog`: include operation, table/entity, and error
- **Never** silently ignore errors (`result, _ := ...`), use generic messages, or `panic()` in production
- **Consistent error response struct:** `ErrorResponse{Error, Message, Code, Details}`
- **HTTP status mapping:** 400=bad input, 401=unauthenticated, 403=forbidden, 404=not found, 409=conflict, 422=semantic error, 500=internal

#### Input Validation (3 Layers)

1. **Struct tags** — `binding:"required,email"` (Gin automatic validation)
2. **Service layer** — Business rule checks (e.g., duplicate email, profanity)
3. **Database constraints** — UNIQUE, NOT NULL, CHECK (last line of defense)
- Always sanitize with `html.EscapeString()` and use parameterized queries (never string concatenation)

#### Database Operations

- **Transactions** for multi-step operations (`db.Transaction(...)`)
- **Context timeouts** on all queries (`context.WithTimeout`)
- **Eager loading** to prevent N+1 (`db.Preload(...)`)
- **Select only needed columns**, paginate large datasets
- **Connection pooling:** Set `MaxIdleConns`, `MaxOpenConns`, `ConnMaxLifetime`

#### Testing

- **Coverage targets:** Services ≥85%, Handlers ≥70%, Repositories ≥75%, Overall ≥80%
- **Table-driven tests** with `testify` assertions
- **Integration tests** use `testcontainers-go` (skip with `-short`)
- **All tests verified inside Docker containers** (see Container-Only Policy above)

#### Logging

- Use `log/slog` with structured key-value pairs
- Levels: Debug (dev only), Info, Warn, Error
- **Never** log sensitive data (passwords, tokens, PII)
- Include request logging middleware (method, path, status, latency, client IP)

#### Security

- Bcrypt password hashing (cost ≥12)
- JWT token validation with signing method check
- Rate limiting on public endpoints (`golang.org/x/time/rate`)
- CORS configured via `services/pkg/middleware`
- Secrets from environment or `/run/secrets/` — **never hardcoded**

#### Code Quality

- **Linting:** `golangci-lint` with: errcheck, gosimple, govet, staticcheck, unused, gofmt, goimports, misspell, gocritic, revive, gosec, bodyclose, cyclop, dupl, funlen, gocognit, nestif
- **Limits:** Functions ≤100 lines/50 statements, cyclomatic complexity ≤15, cognitive complexity ≤20
- **Documentation:** Godoc on all exported types/functions, package-level docs, inline comments for complex logic

#### Performance

- Connection pooling, context timeouts, errgroup for concurrency
- Redis caching for expensive operations

### Frontend (React/TypeScript) — Mandatory Requirements

- **Strict TypeScript:** `strict: true`, `noImplicitAny`, `strictNullChecks` — never use `any` (use `unknown`)
- **Functional components** with typed props (`FC<Props>`)
- **State management:** Context + custom hooks
- **Component structure:** `Component/{Component.tsx, Component.test.tsx, Component.module.css, index.ts}`
- **Coverage:** Components ≥75%, utilities ≥85%
- **Testing:** Vitest for unit/component tests, Playwright for E2E
- **Linting:** ESLint (typescript + react + prettier), `@typescript-eslint/no-explicit-any: "error"`
- **Formatting:** Prettier (semi, trailing comma, single quotes, 100 width, 2-tab)

### API Design

- **RESTful URLs:** `/api/v1/<resource>`, plural nouns, nested resources, POST for actions
- **Response format:** `{data, meta}` for success; `{error: {code, message, details}}` for errors
- **Pagination:** `{total, page, per_page, total_pages}` in `meta`
- **Standard HTTP status codes** (200, 201, 204, 400, 401, 403, 404, 409, 422, 429, 500, 503)
- **OpenAPI:** Every endpoint documented with `swaggo/swag` annotations. Generate with `swag init -g cmd/main.go -o docs/`

---

## Git & Version Control

- **Conventional Commits:** `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`, `style:`, `perf:`, `ci:`
- **Branches:** `main` → `develop` → `feature/*`, `bugfix/*`, `hotfix/*`
- **PR Requirements:** All tests passing, lint clean, coverage maintained, OpenAPI updated, conventional commits, no merge conflicts, code reviewed

---

## Development Checklists

### Before Making Changes

1. Check `docs/Full_Requirements_Spec.md` for requirements context
2. Review existing tests for patterns
3. Ensure Docker infrastructure is running
4. Never run builds/tests outside containers

### Adding a New Service

1. Create `services/<name>/` with `cmd/main.go`, `internal/`, `Dockerfile`, `go.mod`, `.golangci.yml`
2. Import shared packages from `services/pkg/`
3. Add service to `docker-compose.yml`
4. Add OpenAPI spec in `docs/openapi/`
5. Write comprehensive tests (unit + integration)
6. Add CI workflow and update docs

### Modifying Existing Code

1. Read existing tests first — understand expected behavior
2. Run tests before changes (via Docker) — start from green
3. Make incremental changes, update tests, run full suite in containers
4. Update documentation and maintain coverage

### Common Pitfalls

- ❌ Running builds/tests on the host instead of in Docker containers
- ❌ Skipping `docker compose build` (stale images)
- ❌ Bypassing auth/authz checks
- ❌ Ignoring lint errors
- ❌ Using `any` in TypeScript or `panic()` in Go
- ❌ Ignoring errors, logging sensitive data, hardcoding secrets
- ❌ SQL string concatenation, skipping input validation
- ❌ Committing without tests or code review
- ❌ Breaking backward compatibility without versioning

---

## Quick Reference (Container Commands)

```bash
# Build + start (MANDATORY before any testing)
docker compose up --build -d

# Check health
docker compose ps
docker compose logs -f <service>

# Service-specific
docker compose restart <service>
docker compose exec postgres psql -U dzinza

# Tear down
docker compose down
```

---

## Key Documentation

- `docs/Full_Requirements_Spec.md` — Complete requirements (source of truth)
- `docs/openapi/` — Per-service OpenAPI specs
- `DATA_MODELS.md` — Database schemas and models
- `docker-compose.yml` — Infrastructure configuration

## Environment Configuration

- Services read config from env vars and `/run/secrets/` files
- See `docs/Full_Requirements_Spec.md` Section 6.5 for secret inventory

---

## Final Checklist for AI Agents

Before generating or modifying code, **ALWAYS verify:**

- [ ] Follows standard project layout
- [ ] Error handling with `%w` wrapping
- [ ] Input validation at all layers
- [ ] Tests written (table-driven, ≥80% coverage)
- [ ] **All builds and tests run inside Docker containers** (`docker compose up --build`)
- [ ] Linting config present and passing
- [ ] Structured logging, no sensitive data in logs
- [ ] Parameterized queries, transactions for multi-step ops
- [ ] Context timeouts for external calls
- [ ] TypeScript strict mode, no `any` types (frontend)
- [ ] OpenAPI documentation for endpoints
- [ ] Conventional commit messages
- [ ] No hardcoded secrets
- [ ] Proper HTTP status codes, rate limiting, CORS

**Remember:** Quality over speed. Never build or test outside of containers.