# Dzinza Platform — Master Task List

> **Generated:** 2026-02-13  
> **Source:** [Full_Requirements_Spec.md](./Full_Requirements_Spec.md)  
> **Legend:** `[ ]` = Todo · `[/]` = In Progress · `[x]` = Done

---

## Current State Assessment

| Area | Status |
|------|--------|
| **Infrastructure (Docker Compose)** | ✅ All databases & tooling configured (Postgres, Neo4j, MongoDB, Redis, ES, Garage, Prometheus, Grafana) |
| **Go Services** | 🔴 None exist — `services/` contains only a README.md |
| **Shared Go Library (`services/pkg/`)** | 🔴 Not started |
| **Frontend** | ⚠️ Minimal — basic Login, Register, FamilyTree components (no routing, no styling, no tests) |
| **OpenAPI Specs** | ✅ All 15 service specs exist in `docs/openapi/` |
| **Secrets** | ✅ All secret files present |
| **CI/CD** | ⚠️ GitHub Actions workflow exists but targets old Python stack |
| **`.env`** | ⚠️ Port numbers (3000–3005) don't match spec ports (8000–8014) |

---

## Phase 0: Project Scaffolding & Configuration Fixes

> **Goal:** Fix configuration mismatches and set up the Go project foundation so all other agents can build on it.

### 0.1 Fix Environment & Configuration

- [x] **T-0.1.1** — Update `.env` service ports to match spec (auth=8003, genealogy=8006, media=8009, etc.)
  - File: `.env`
  - Done when: All `*_SERVICE_PORT` and `*_SERVICE_URL` values match `Full_Requirements_Spec.md` §4.2

- [x] **T-0.1.2** — Update `.env` SMTP settings from Ethereal to MailHog (`SMTP_HOST=mailhog`, `SMTP_PORT=1025`)
  - File: `.env`
  - Done when: SMTP_HOST=mailhog and SMTP_PORT=1025

- [x] **T-0.1.3** — Add MailHog container to `docker-compose.yml`
  - File: `docker-compose.yml`
  - Done when: `mailhog` service is defined with ports `1025:1025` (SMTP) and `8025:8025` (Web UI) on `dzinza-network`

- [x] **T-0.1.4** — Update `docker-compose.yml` to read Redis password from secret file instead of hardcoded command
  - File: `docker-compose.yml`
  - Done when: Redis `command` reads password from `/run/secrets/redis_password` or env var referencing secret

- [x] **T-0.1.5** — Update frontend Vite dev port from `3000` to `5173` to match spec
  - File: `frontend/vite.config.ts`
  - Done when: `server.port` is `5173`

- [x] **T-0.1.6** — Update `.env` frontend VITE_* URLs to match spec port numbers
  - Files: `.env`
  - Done when: `VITE_API_URL`, `VITE_AUTH_SERVICE_URL`, etc. use ports 8003, 8006, etc.

### 0.2 GitHub Actions CI Update

- [x] **T-0.2.1** — Rewrite `.github/workflows/dzinza.yml` for Go services
  - File: `.github/workflows/dzinza.yml`
  - Done when: CI runs `go build`, `go test`, `golangci-lint` for all services under `services/`

---

## Phase 1: Foundation (P0 — Core Services)

> **Goal:** Get core services working end-to-end with real database integrations.
> **Dependency graph:** `pkg/` → `auth_service` → `genealogy_service` → frontend pages

### 1.1 Shared Go Library (`services/pkg/`)

> **Agent scope:** One agent owns all of `pkg/`. No service can start until this is done.

- [x] **T-1.1.1** — Initialize Go module at `services/pkg/`
  - Run: `cd services/pkg && go mod init github.com/chifamba/dzinza/services/pkg`
  - Done when: `services/pkg/go.mod` exists with correct module path

- [x] **T-1.1.2** — Implement `pkg/config/` — Configuration loader
  - Read env vars + Docker secrets from `/run/secrets/`
  - Use `spf13/viper` or `caarlos0/env`
  - Done when: `LoadConfig()` returns a typed struct with DB, Redis, JWT, SMTP settings; unit tests pass

- [x] **T-1.1.3** — Implement `pkg/logging/` — Structured logging setup
  - Use `log/slog` with JSON output handler
  - Provide `NewLogger(serviceName string) *slog.Logger`
  - Done when: Logger produces structured JSON; unit tests pass

- [x] **T-1.1.4** — Implement `pkg/health/` — Health check handler
  - Return `GET /health` → `{"status": "ok", "service": "<name>"}`
  - Done when: Handler returns correct JSON; unit test passes

- [x] **T-1.1.5** — Implement `pkg/auth/` — JWT middleware
  - Validate Bearer tokens, extract claims (user_id, roles)
  - Use `golang-jwt/jwt/v5`
  - Done when: Middleware correctly validates tokens and rejects expired/invalid ones; unit tests pass

- [x] **T-1.1.6** — Implement `pkg/response/` — JSON response helpers
  - Provide `Success()`, `Error()`, `Paginated()` response constructors
  - Match error format: `{"detail": "Human-readable message"}`
  - Done when: Helpers produce correct JSON structures; unit tests pass

### 1.2 Auth Service (`services/auth_service/`)

> **Agent scope:** One agent owns this entire service. Depends on `pkg/` being complete.
> **Spec refs:** §3.1, §9.2, `docs/openapi/auth-service.yaml`

- [ ] **T-1.2.1** — Scaffold `auth_service` directory structure
  - Create: `cmd/main.go`, `internal/{handlers,models,repository,service,middleware}/`, `Dockerfile`, `go.mod`, `.golangci.yml`
  - Done when: Directory structure matches AGENTS.md §1 template; `go build ./...` succeeds

- [ ] **T-1.2.2** — Implement user models and DTOs
  - GORM models: `User` (id, email, hashed_password, roles, created_at, updated_at)
  - DTOs: `RegisterRequest`, `LoginRequest`, `TokenResponse`, `RefreshRequest`
  - Done when: Models compile; struct tags include `json`, `binding` (validation), `gorm` tags

- [ ] **T-1.2.3** — Implement user repository (PostgreSQL via GORM)
  - Methods: `CreateUser`, `GetByEmail`, `GetByID`, `EmailExists`
  - Done when: Repository interface defined; GORM implementation compiles; unit tests with mocks pass

- [ ] **T-1.2.4** — Implement auth service layer (business logic)
  - Registration: validate input, check duplicate email, hash password (bcrypt cost 12), create user
  - Login: verify credentials, generate JWT access (30min) + refresh (7d) tokens
  - Token refresh: validate refresh token, issue new pair
  - Token blacklist: add token to `token_blacklist` table
  - Password policy: min 8 chars, uppercase, lowercase, digit, special char
  - Done when: All business logic unit tests pass with mocked repository

- [ ] **T-1.2.5** — Implement auth HTTP handlers + routes
  - Endpoints: `POST /register`, `POST /login`, `POST /refresh_token`, `POST /blacklist_token`
  - Wire Gin router, CORS middleware, request logging
  - Done when: All endpoints match `docs/openapi/auth-service.yaml`; handler tests pass

- [ ] **T-1.2.6** — Implement RBAC (role assignment/revocation)
  - Models: `Role`, `UserTreeRole` (many-to-many: user ↔ role ↔ tree)
  - Endpoints: `POST /assign_role`, `POST /revoke_role`
  - Platform roles: Admin, Moderator, User; Tree roles: Admin, Editor, Viewer
  - Done when: Roles persist in PostgreSQL; endpoint tests pass

- [ ] **T-1.2.7** — Implement Redis rate limiting middleware
  - Limit: 5 login attempts per 10 minutes per IP
  - Use `go-redis/redis/v9`
  - Done when: Rate limiting blocks excess requests; integration test passes

- [ ] **T-1.2.8** — Write multi-stage Dockerfile for `auth_service`
  - Build: `golang:1.26-alpine`; Runtime: `alpine:3.19`
  - Done when: `docker build` produces a working image; container starts and responds on `/health`

- [ ] **T-1.2.9** — Add `auth_service` to `docker-compose.yml`
  - Port: `8003:8000`; depends_on: postgres (healthy), redis (healthy)
  - Mount secrets: `db_password`, `jwt_secret`, `jwt_refresh_secret`, `redis_password`
  - Done when: `docker compose up auth_service` starts and `/health` returns OK

- [ ] **T-1.2.10** — Write integration tests for auth service
  - Use `testcontainers-go` for PostgreSQL + Redis
  - Test flows: register → login → use token → refresh → blacklist
  - Done when: `go test ./... -run Integration` passes

### 1.3 Genealogy Service (`services/genealogy_service/`)

> **Agent scope:** One agent owns this entire service. Depends on `pkg/` being complete.
> **Spec refs:** §3.2, `docs/openapi/genealogy-service.yaml`

- [ ] **T-1.3.1** — Scaffold `genealogy_service` directory structure
  - Create: `cmd/main.go`, `internal/{handlers,models,repository,service,middleware}/`, `Dockerfile`, `go.mod`, `.golangci.yml`
  - Done when: Directory structure matches AGENTS.md template; `go build ./...` succeeds

- [ ] **T-1.3.2** — Implement Neo4j person models and DTOs
  - Person node: all attributes from spec §3.2.2 (names, gender, dates, places, privacy, facts, etc.)
  - FamilyTree node: owner_id, root_person_id, description, privacy_level
  - DTOs: create/update requests and responses
  - Done when: Models compile with proper struct tags

- [ ] **T-1.3.3** — Implement Neo4j repository layer
  - Use `neo4j/neo4j-go-driver/v5`
  - Methods: CRUD for Person, FamilyTree; create/delete relationships (PARENT_OF, SPOUSE_OF, SIBLING_OF, MEMBER_OF, HAS_PERMISSION)
  - Circular reference detection on relationship creation
  - Done when: Repository compiles; unit tests with mocked driver pass

- [ ] **T-1.3.4** — Implement genealogy service layer
  - Tree management: create tree, list user's trees, get tree details, update, delete
  - Person management: add person to tree, update, delete, list persons in tree
  - Relationship management: create, delete, validate (no circular refs)
  - Done when: All business logic tests pass

- [ ] **T-1.3.5** — Implement genealogy HTTP handlers + routes
  - Endpoints from spec: `/familytrees` (CRUD), `/persons` (CRUD), `/relationships` (CRUD)
  - Auth middleware on all endpoints (require valid JWT)
  - Tree permission checks (Admin/Editor/Viewer)
  - Done when: All endpoints match `docs/openapi/genealogy-service.yaml`

- [ ] **T-1.3.6** — Implement GEDCOM import
  - Parse GEDCOM 5.5 and 5.5.1 files
  - Convert individuals → Person nodes, families → relationship edges
  - Handle malformed records gracefully (log warnings, skip invalid)
  - Return import summary: persons imported, relationships created, warnings
  - Done when: Import endpoint works; test with sample GEDCOM file passes

- [ ] **T-1.3.7** — Implement GEDCOM export
  - Serialize graph sub-trees to GEDCOM 5.5.1 format
  - Fix known bug: duplicate FAM records for children
  - Done when: Export endpoint works; exported file is valid GEDCOM; no duplicate FAM records

- [ ] **T-1.3.8** — Write multi-stage Dockerfile for `genealogy_service`
  - Done when: Image builds and container responds on `/health`

- [ ] **T-1.3.9** — Add `genealogy_service` to `docker-compose.yml`
  - Port: `8006:8000`; depends_on: neo4j (healthy)
  - Done when: `docker compose up genealogy_service` starts and `/health` returns OK

- [ ] **T-1.3.10** — Write integration tests for genealogy service
  - Use `testcontainers-go` for Neo4j
  - Test flows: create tree → add persons → create relationships → export GEDCOM → reimport
  - Done when: `go test ./... -run Integration` passes

### 1.4 Audit History Service (`services/audit_history_service/`)

> **Agent scope:** One agent. Depends on `pkg/`.
> **Spec refs:** §4.2 (Status: Partial), `docs/openapi/audit-history-service.yaml`

- [ ] **T-1.4.1** — Scaffold `audit_history_service` directory structure
  - Done when: Matches AGENTS.md template; compiles

- [ ] **T-1.4.2** — Implement audit log models (PostgreSQL via GORM)
  - Fields: id, user_id, action, entity_type, entity_id, old_value (JSON), new_value (JSON), timestamp, ip_address
  - Done when: Model compiles with GORM tags

- [ ] **T-1.4.3** — Implement audit repository + service layer
  - Methods: `LogAction`, `GetAuditLog` (with pagination and filters)
  - Done when: Unit tests pass

- [ ] **T-1.4.4** — Implement audit HTTP handlers + routes
  - Endpoints: `POST /audit` (internal), `GET /audit` (admin only, paginated, filterable)
  - Done when: Endpoints match `docs/openapi/audit-history-service.yaml`

- [ ] **T-1.4.5** — Write Dockerfile + add to `docker-compose.yml`
  - Port: `8002:8000`
  - Done when: Container starts and `/health` returns OK

### 1.5 Media Storage Service (`services/media_storage_service/`)

> **Agent scope:** One agent. Depends on `pkg/`.
> **Spec refs:** §3.5, `docs/openapi/media-storage-service.yaml`

- [ ] **T-1.5.1** — Scaffold `media_storage_service` directory structure
  - Done when: Matches AGENTS.md template; compiles

- [ ] **T-1.5.2** — Implement media models
  - Fields: id, user_id, person_id, filename, content_type, size, s3_key, metadata (EXIF JSON), created_at
  - PostgreSQL for metadata; Garage (S3) for files
  - Done when: Models compile

- [ ] **T-1.5.3** — Implement S3 upload/download via `aws-sdk-go-v2`
  - Upload to Garage bucket `dzinza-media`
  - Download/presigned URLs
  - Supported types: JPEG, PNG, TIFF, WebP, PDF, MP3, WAV, MP4, WebM
  - Size limit: 50 MB
  - Done when: Unit tests pass with mocked S3 client

- [ ] **T-1.5.4** — Implement EXIF metadata extraction on upload
  - Extract resolution, file size, MIME type
  - Store as JSON in PostgreSQL
  - Done when: Metadata extracted and persisted for image uploads

- [ ] **T-1.5.5** — Implement media HTTP handlers + routes
  - Endpoints: `POST /media/upload`, `GET /media/{id}`, `DELETE /media/{id}`
  - Auth required; file type + size validation
  - Done when: Endpoints match `docs/openapi/media-storage-service.yaml`

- [ ] **T-1.5.6** — Write Dockerfile + add to `docker-compose.yml`
  - Port: `8009:8000`; depends_on: postgres, garage1
  - Done when: Container starts and `/health` returns OK

### 1.6 Notification Service (`services/notification_service/`)

> **Agent scope:** One agent. Depends on `pkg/`.
> **Spec refs:** §3.7, `docs/openapi/notification-service.yaml`

- [ ] **T-1.6.1** — Scaffold `notification_service` directory structure
  - Done when: Matches AGENTS.md template; compiles

- [ ] **T-1.6.2** — Implement notification models (PostgreSQL)
  - Fields: id, user_id, type, title, message, read, created_at
  - Done when: Models compile with GORM tags

- [ ] **T-1.6.3** — Implement pluggable email backend
  - Interface: `EmailSender` with `Send(to, subject, body)` method
  - SMTP implementation reading `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` from config
  - Local dev: send to MailHog (`mailhog:1025`)
  - Done when: Emails sent via MailHog appear in MailHog Web UI (port 8025); unit tests pass

- [ ] **T-1.6.4** — Implement notification HTTP handlers + routes
  - Endpoints: `GET /notifications`, `PUT /notifications/{id}/read`
  - Done when: Endpoints match `docs/openapi/notification-service.yaml`

- [ ] **T-1.6.5** — Write Dockerfile + add to `docker-compose.yml`
  - Port: `8010:8000`; depends_on: postgres, redis, mailhog
  - Done when: Container starts and `/health` returns OK

### 1.7 Frontend — Phase 1 Pages

> **Agent scope:** One agent owns the frontend. Can work in parallel with backend agents.

- [ ] **T-1.7.1** — Add React Router, set up page routing
  - Install: `react-router-dom`
  - Routes: `/login`, `/register`, `/dashboard`, `/trees/:id`
  - Done when: Navigation works between all routes

- [ ] **T-1.7.2** — Add design system / base styles
  - Import a modern font (e.g., Inter from Google Fonts)
  - Create CSS files with color palette, typography, spacing tokens
  - Done when: All pages use consistent design tokens; app looks polished

- [ ] **T-1.7.3** — Implement Login page (functional with auth_service)
  - Refactor existing `Login.tsx` to call `POST http://localhost:8003/login`
  - Store JWT in localStorage; redirect to dashboard on success
  - Display error messages on failure
  - Done when: Login flow works end-to-end with running auth_service

- [ ] **T-1.7.4** — Implement Registration page (functional with auth_service)
  - Refactor existing `Register.tsx` to call `POST http://localhost:8003/register`
  - Client-side validation matching password policy
  - Done when: Registration flow works end-to-end

- [ ] **T-1.7.5** — Implement Dashboard page
  - Show list of user's family trees
  - Button to create new tree
  - Done when: Dashboard displays trees fetched from `GET http://localhost:8006/familytrees`

- [ ] **T-1.7.6** — Implement Tree Viewer page
  - Interactive family tree visualization (Canvas/SVG)
  - Display person nodes with names, dates
  - Click to expand/collapse branches
  - Done when: Tree viewer renders a family tree from genealogy_service data

- [ ] **T-1.7.7** — Add Vite proxy config for API routing
  - Proxy `/api/auth/*` → `http://localhost:8003`
  - Proxy `/api/genealogy/*` → `http://localhost:8006`
  - Proxy `/api/media/*` → `http://localhost:8009`
  - Proxy `/api/notifications/*` → `http://localhost:8010`
  - Done when: Frontend fetches from `/api/*` paths and receives backend responses

- [ ] **T-1.7.8** — Add TypeScript types matching backend DTOs
  - Types for: User, FamilyTree, Person, Relationship, Notification
  - Done when: No `any` types in API call code

- [ ] **T-1.7.9** — Add Vitest unit test setup + basic component tests
  - Install: `vitest`, `@testing-library/react`
  - Write tests for Login, Register components
  - Done when: `npm run test` passes

### 1.8 Docker Compose — Service Wiring

> **Agent scope:** Whoever completes a service should wire it, but this section tracks the overall state.

- [ ] **T-1.8.1** — Create `scripts/setup-secrets.sh`
  - Generate default secret files if they don't exist
  - Reference in docs/README
  - Done when: Script runs and creates all required secret files from spec §6.5

- [ ] **T-1.8.2** — Verify all Phase 1 services start together
  - Run: `docker compose up -d`
  - Done when: `postgres`, `neo4j`, `redis`, `mailhog`, `auth_service`, `genealogy_service` all healthy

---

## Phase 2: Core Features (P0/P1)

> **Goal:** Add search, trust, verification, deduplication, admin, and event bus.
> **Depends on:** Phase 1 complete.

### 2.1 Search & Discovery Service (`services/search_discovery_service/`)

> **Spec refs:** §3.6, `docs/openapi/search-discovery-service.yaml`

- [ ] **T-2.1.1** — Scaffold `search_discovery_service`
- [ ] **T-2.1.2** — Implement Elasticsearch index management
  - Define person index mapping (primary_name, alternate_names, birth_place, death_place, biography, clan, tribe)
  - Done when: Index is created in ES with correct mapping

- [ ] **T-2.1.3** — Implement Neo4j → Elasticsearch sync
  - Subscribe to Redis Pub/Sub events: `person.created`, `person.updated`
  - On event: fetch person from Neo4j, index/update in Elasticsearch
  - Done when: Creating a person in genealogy_service results in ES document within 5s

- [ ] **T-2.1.4** — Implement search endpoint
  - `GET /search/person` with query, filters (date range, location, gender), pagination
  - Privacy-aware: exclude private nodes, redact fields per requester's permissions
  - Match scoring + highlighted fields in response
  - Done when: Search returns relevant results; privacy filtering works

- [ ] **T-2.1.5** — Write Dockerfile + add to `docker-compose.yml`
  - Port: `8012:8000`; depends_on: elasticsearch, redis

### 2.2 Trust & Access Control Service (`services/trust_access_control_service/`)

> **Spec refs:** §3.3, `docs/openapi/trust-access-control-service.yaml`

- [ ] **T-2.2.1** — Scaffold `trust_access_control_service`
- [ ] **T-2.2.2** — Implement Trust Score calculation engine
  - Factors: Accepted Contributions (40%), Rejection Rate (20%), Account Longevity (15%), Activity Level (15%), Verification Participation (10%)
  - Trust Decay: -1 point/month after 90 days inactivity
  - Done when: Score calculation returns correct values for test cases

- [ ] **T-2.2.3** — Implement trust score storage (Neo4j User node + Redis cache)
  - Done when: Scores persist in Neo4j; Redis cache hit/miss works

- [ ] **T-2.2.4** — Implement trust HTTP endpoints
  - `GET /trust-levels/{user_id}`, `GET /access-requests`
  - Done when: Endpoints match OpenAPI spec

- [ ] **T-2.2.5** — Write Dockerfile + add to `docker-compose.yml`
  - Port: `8013:8000`

### 2.3 Relationship Verification Service (`services/relationship_verification_service/`)

> **Spec refs:** §3.3.2, `docs/openapi/relationship-verification-service.yaml`

- [ ] **T-2.3.1** — Scaffold `relationship_verification_service`
- [ ] **T-2.3.2** — Implement Suggestion model and workflow
  - States: PENDING → CONFIRMED / REJECTED
  - Unverified nodes: apply immediately, mark Pending Verification
  - Verified nodes: require N confirmations from Trust ≥ 50 users OR 1 from Trust > 90
  - Full audit trail
  - Done when: Workflow state machine works; tests pass

- [ ] **T-2.3.3** — Implement verification HTTP endpoints
  - Done when: Endpoints match OpenAPI spec

- [ ] **T-2.3.4** — Write Dockerfile + add to `docker-compose.yml`
  - Port: `8011:8000`

### 2.4 Deduplication Service (`services/deduplication_service/`)

> **Spec refs:** §3.4, `docs/openapi/deduplication-service.yaml`

- [ ] **T-2.4.1** — Scaffold `deduplication_service`
- [ ] **T-2.4.2** — Implement duplicate detection algorithm
  - Levenshtein distance on names, date proximity, relative topology overlap
  - Confidence score (0–100) for each pair
  - Done when: Algorithm detects known duplicates in test data

- [ ] **T-2.4.3** — Implement merge logic
  - Combine relationships from both nodes onto surviving node
  - Store `merged_from_ids` on survivor, `merged_into_id` on merged node
  - Reversible: maintain merge history log
  - Done when: Merge + undo-merge works; tests pass

- [ ] **T-2.4.4** — Implement deduplication HTTP endpoints
  - Done when: Endpoints match OpenAPI spec

- [ ] **T-2.4.5** — Write Dockerfile + add to `docker-compose.yml`
  - Port: `8005:8000`

### 2.5 Admin & Moderation Service (`services/admin_moderation_service/`)

> **Spec refs:** §3.1.3, `docs/openapi/admin-moderation-service.yaml`

- [ ] **T-2.5.1** — Scaffold `admin_moderation_service`
- [ ] **T-2.5.2** — Implement user banning/unbanning
  - Publish `user.banned` event to Redis Pub/Sub
  - Done when: Ban persists and event is published

- [ ] **T-2.5.3** — Implement content moderation (flag/review/remove)
  - Done when: Endpoints match OpenAPI spec

- [ ] **T-2.5.4** — Write Dockerfile + add to `docker-compose.yml`
  - Port: `8000:8000`

### 2.6 Redis Pub/Sub Event Bus

> **Spec refs:** §4.6

- [ ] **T-2.6.1** — Implement event publisher in `pkg/events/`
  - Publish to topics: `person.created`, `person.updated`, `person.merged`, `relationship.created`, `relationship.verified`, `user.banned`, `media.uploaded`, `trust.updated`
  - Payload format: JSON with `event_type`, `timestamp`, and domain-specific fields
  - Done when: Publisher unit tests pass

- [ ] **T-2.6.2** — Wire event publishing into `genealogy_service`
  - Publish `person.created`, `person.updated`, `relationship.created` on mutations
  - Done when: Events appear on Redis Pub/Sub after genealogy operations

- [ ] **T-2.6.3** — Wire event consumers into `search_discovery_service`, `notification_service`, `trust_access_control_service`
  - Done when: Each service reacts to relevant events

### 2.7 Notification Service — Full Implementation

- [ ] **T-2.7.1** — Add in-app notification storage + retrieval
  - Store in PostgreSQL; fetch via `GET /notifications`; mark as read
  - Done when: In-app notifications work end-to-end

- [ ] **T-2.7.2** — Wire notification triggers from event bus
  - Events: `relationship.verified` → notify involved users, `media.uploaded` → notify tree members, `trust.updated` → notify user
  - Done when: Notifications are created when events fire

### 2.8 Frontend — Phase 2 Pages

- [ ] **T-2.8.1** — Implement Person Detail page
  - Display all person attributes, life events, relationships
  - Edit capability for tree editors/admins
  - Done when: Page renders person data from genealogy_service

- [ ] **T-2.8.2** — Implement Search page
  - Search bar + faceted filters (date range, location, gender)
  - Results list with match highlights
  - Done when: Search works against search_discovery_service

- [ ] **T-2.8.3** — Implement Notifications UI
  - Bell icon with unread count
  - Dropdown/page showing notification list
  - Mark as read
  - Done when: Notifications display from notification_service

- [ ] **T-2.8.4** — Implement Admin Dashboard page
  - User management, content moderation queue, platform stats
  - Only visible to platform Admin role
  - Done when: Dashboard fetches from admin_moderation_service

---

## Phase 3: Enhanced Features (P1/P2)

> **Goal:** Add GraphQL, analytics, marketplace, localization, help, media thumbnails.
> **Depends on:** Phase 2 complete.

### 3.1 Graph Query Service (`services/graph_query_service/`)

- [ ] **T-3.1.1** — Scaffold `graph_query_service`
- [ ] **T-3.1.2** — Implement GraphQL schema for complex traversals (ancestors, descendants, cousins)
- [ ] **T-3.1.3** — Write Dockerfile + add to `docker-compose.yml` (port 8007)

### 3.2 Analytics Service (`services/analytics_service/`)

- [ ] **T-3.2.1** — Scaffold `analytics_service`
- [ ] **T-3.2.2** — Implement platform metrics collection + storage
- [ ] **T-3.2.3** — Implement analytics HTTP endpoints
- [ ] **T-3.2.4** — Write Dockerfile + add to `docker-compose.yml` (port 8001)

### 3.3 Community Marketplace Service (`services/community_marketplace_service/`)

- [ ] **T-3.3.1** — Scaffold `community_marketplace_service`
- [ ] **T-3.3.2** — Implement resource sharing endpoints
- [ ] **T-3.3.3** — Write Dockerfile + add to `docker-compose.yml` (port 8004)

### 3.4 Localization Service (`services/localization_service/`)

- [ ] **T-3.4.1** — Scaffold `localization_service`
- [ ] **T-3.4.2** — Implement UI translation endpoints + cultural name parsing
- [ ] **T-3.4.3** — Write Dockerfile + add to `docker-compose.yml` (port 8008)

### 3.5 Help & Support Service (`services/help_support_service/`)

- [ ] **T-3.5.1** — Scaffold `help_support_service`
- [ ] **T-3.5.2** — Implement ticket CRUD (MongoDB)
  - Categories: Bug Report, Feature Request, Account Issue, Data Dispute, General
  - Done when: Tickets persist in MongoDB; endpoints match OpenAPI spec

- [ ] **T-3.5.3** — Write Dockerfile + add to `docker-compose.yml` (port 8014)

### 3.6 Media Thumbnails

- [ ] **T-3.6.1** — Add thumbnail generation to `media_storage_service`
  - Generate thumbnails on upload for image types
  - Done when: Thumbnail URL returned alongside original

### 3.7 Frontend — Phase 3 Pages

- [ ] **T-3.7.1** — Implement GEDCOM import/export UI
- [ ] **T-3.7.2** — Implement media gallery on Person Detail page
- [ ] **T-3.7.3** — Implement help/support ticket form
- [ ] **T-3.7.4** — Add i18n support (English, Shona, Ndebele)

---

## Phase 4: Advanced Features (P2/P3)

> **Goal:** DNA, AI moderation, mobile, backups, integrations, production deployment.
> **Depends on:** Phase 3 complete.

### 4.1 DNA Integration

- [ ] **T-4.1.1** — Design DNA data model on Person nodes
- [ ] **T-4.1.2** — Implement DNA data storage + retrieval endpoints

### 4.2 Content Moderation AI Service

- [ ] **T-4.2.1** — Implement AI content review service
- [ ] **T-4.2.2** — Wire into admin moderation workflow

### 4.3 Backup & Recovery Service

- [ ] **T-4.3.1** — Implement automated daily Neo4j dumps (`neo4j-admin dump`)
- [ ] **T-4.3.2** — Implement automated daily PostgreSQL dumps (`pg_dump`)
- [ ] **T-4.3.3** — Store backups in Garage S3 bucket

### 4.4 Integration Service

- [ ] **T-4.4.1** — Implement external API integration framework
- [ ] **T-4.4.2** — Add FamilySearch / Ancestry API connectors

### 4.5 Production Deployment

- [ ] **T-4.5.1** — Update Kubernetes manifests in `k8s/` for all Go services
- [ ] **T-4.5.2** — Add TLS termination (cert-manager / Let's Encrypt)
- [ ] **T-4.5.3** — Add API gateway (Nginx/Traefik) with path-based routing
- [ ] **T-4.5.4** — Configure Neo4j and PostgreSQL replication for HA

### 4.6 Mobile Strategy

- [ ] **T-4.6.1** — Decide: PWA vs React Native (see Open Question #4)
- [ ] **T-4.6.2** — Implement chosen mobile approach

---

## Cross-Cutting Concerns (Ongoing)

> These tasks can be done by any agent at any time.

### Testing & Quality

- [ ] **T-X.1** — Set up `golangci-lint` in CI for all services
- [ ] **T-X.2** — Achieve >80% unit test coverage on all service layers
- [ ] **T-X.3** — Implement Playwright E2E tests for critical frontend flows (login, register, create tree, add person)
- [ ] **T-X.4** — Add API contract tests validating endpoints against OpenAPI specs

### Documentation

- [ ] **T-X.5** — Generate OpenAPI specs from Go code using `swaggo/swag` annotations
- [ ] **T-X.6** — Write `secrets/README.md` documenting all secret files and default values
- [ ] **T-X.7** — Update root `README.md` with Quick Start guide matching spec §6.2

### Observability

- [ ] **T-X.8** — Add Prometheus `/metrics` endpoint to all services (use `promhttp`)
- [ ] **T-X.9** — Create Grafana dashboards for service health, request latency, error rates
- [ ] **T-X.10** — Configure Prometheus scrape targets in `prometheus/prometheus.yml` for all services
