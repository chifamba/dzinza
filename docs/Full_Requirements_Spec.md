# Full Requirements Specification: Dzinza Genealogy Platform

**Version:** 3.1  
**Status:** Living Specification  
**Last Updated:** February 13, 2026

---

## 1. Executive Summary

**Dzinza** is a decentralized, community-driven genealogy platform designed to address the limitations of traditional, centralized ancestry services. It leverages a graph database architecture to model complex family relationships and employs a unique "Trust Model" to verify data accuracy through community consensus rather than centralized authority.

The platform's primary innovation lies in its ability to merge disparate family trees into a single, global "World Tree" while maintaining granular privacy controls and rigorous data verification standards. By decoupling data ownership from a single entity and empowering users to verify relationships, Dzinza aims to create the world's most accurate and interconnected repository of human history.

---

## 2. Product Vision & Goals

### 2.1 Vision

To create a democratized, verifiable, and interconnected digital heritage platform where family history is preserved, validated, and owned by the community.

### 2.2 Core Goals

1. **Interconnectivity:** Eliminate data silos by architecting the system to identify and merge duplicate person records across different user-created trees into a unified "World Tree."
2. **Trust & Verification:** Implement a calculated "Trust Score" (0–100) for every user, derived from the quality of their contributions and peer validations, to weight the reliability of genealogical data.
3. **Privacy:** Provide granular, field-level privacy controls (e.g., hiding birth dates while showing names) that respect the sensitivities of living and deceased individuals.
4. **Decentralization:** Utilize S3-compatible decentralized storage (Garage) for media assets to ensure data durability and reduce reliance on centralized cloud providers.
5. **Extensibility:** Build a microservices-based API ecosystem that allows third-party developers, researchers, and cultural institutions to build tools on top of the Dzinza graph.

---

## 3. Application Functionality (Functional Requirements)

### 3.1 Authentication & User Management

#### 3.1.1 Registration & Login

- **Registration:** Users register via email and password. Credentials are stored in PostgreSQL with bcrypt-hashed passwords (`golang.org/x/crypto/bcrypt`).
- **OAuth (Future):** Google OAuth is partially implemented (placeholder). Facebook, Apple, and LinkedIn OAuth integrations are deferred to a later phase.
- **Identity Management:** The system issues JWT tokens (Access Token: 30-min expiry; Refresh Token: 7-day expiry) for session management. Token blacklisting is supported via a `token_blacklist` table in PostgreSQL.

#### 3.1.2 Security Features

- **MFA:** Email-based Multi-Factor Authentication is stubbed and will be implemented in Phase 2. SMS-based MFA (e.g., Twilio) is deferred to a later phase.
- **Rate Limiting:** Redis-based rate limiting (5 login attempts per 10 minutes).
- **Password Policy:** Minimum 8 characters, must include uppercase, lowercase, digit, and special character.

#### 3.1.3 Roles & Permissions (RBAC)

The system uses a two-tier role model:

| Tier | Roles | Scope |
|------|-------|-------|
| **Platform Roles** | `Admin`, `Moderator`, `User` | System-wide. `Admin` can create/manage tree admins, settle disputes, and moderate content globally. |
| **Tree Roles** | `Admin`, `Editor`, `Viewer` | Per-family-tree. A user can hold different roles on different trees (e.g., `Admin` on their own tree, `Viewer` on another). |

- Roles are stored as a many-to-many relationship (user ↔ roles ↔ tree).
- Platform `Admin` has the highest privilege and can override tree-level permissions.
- Endpoints: `POST /assign_role`, `POST /revoke_role`.

### 3.2 Genealogy & Graph Management

#### 3.2.1 Tree Creation

- Users can create isolated family trees, initially set as `PUBLIC`, `FAMILY_TREE_ONLY`, or `PRIVATE`.
- Each tree has an owner (`owner_id`), a configurable root person (`root_person_id`), and a description.
- Collaborator management: tree `Admin` can invite users and assign tree-level roles.

#### 3.2.2 Person Nodes

| Attribute | Type | Required | Notes |
|-----------|------|----------|-------|
| `id` | UUID | Auto | Globally unique identifier |
| `primary_name` | JSON | Yes | `{given_name, surname, prefix, suffix, nickname}` |
| `alternate_names` | JSON[] | No | Supports birth, married, nicknames |
| `gender` | Enum | Yes | `MALE`, `FEMALE`, `OTHER`, `UNKNOWN` |
| `birth_date_string` | String | No | Flexible format (e.g., "about 1920") |
| `birth_date_exact` | Date | No | ISO date if known exactly |
| `birth_place` | String | No | Free-text location |
| `death_date_string` / `death_date_exact` | String / Date | No | Same flexible format as birth |
| `is_living` | Boolean | Yes | Controls privacy defaults |
| `biography` | String | No | Freeform text |
| `clan` | String | No | Cultural attribute |
| `tribe` | String | No | Cultural attribute |
| `traditional_titles` | String[] | No | Cultural attribute |
| `privacy_settings` | JSON | No | Per-field visibility controls |
| `facts` | JSON[] | No | Life events (see below) |
| `dna_data` | JSON | No | Store DNA test info (Phase 4) |
| `historical_records` | JSON[] | No | Linked source citations |

**Facts / Life Events:**  
Each fact has: `type` (Birth, Death, Marriage, Immigration, etc.), `date`, `place`, `description`, `sources[]`, and `privacy_level`.

#### 3.2.3 Relationship Edges

| Relationship | Properties | Notes |
|-------------|------------|-------|
| `PARENT_OF` | `type` (Biological, Adoptive, Step), `start_date` | Directed: from parent to child |
| `SPOUSE_OF` | `status` (Married, Divorced, Widowed), `start_date`, `end_date` | Multiple marriages supported |
| `SIBLING_OF` | — | Bidirectional |
| `MEMBER_OF` | — | Person → FamilyTree membership |
| `HAS_PERMISSION` | `level` (Admin, Editor, Viewer) | User → FamilyTree access |
| `TRUSTS` | `score` (Float) | User → User trust (Phase 2) |

**Constraints:**
- All relationship creation must validate against circular reference violations (e.g., a person cannot be their own ancestor).
- Each relationship requires both `person1_id` and `person2_id` to exist in the same `FamilyTree`.

#### 3.2.4 GEDCOM Integration

- **Import:** Parse GEDCOM 5.5 and 5.5.1 files. Convert individuals to `Person` nodes and families to `PARENT_OF` / `SPOUSE_OF` edges. Gracefully handle malformed records (log warnings, skip invalid entries).
- **Export:** Serialize graph sub-trees back into GEDCOM 5.5.1 format for download. **Known bug:** Duplicate FAM records for children — must be resolved in Phase 1.
- **Validation:** System must report import summary (persons imported, relationships created, warnings/errors).

### 3.3 Trust & Verification System

> **Note:** This entire subsystem is currently **stubbed**. Full implementation is scheduled for Phase 2.

#### 3.3.1 Trust Score Engine

A dedicated `trust_access_control_service` calculates user Trust Scores (0–100) based on:

| Factor | Weight | Description |
|--------|--------|-------------|
| Accepted Contributions | 40% | Edits/additions accepted by the community |
| Rejection Rate | 20% | Inverse of rejected suggestions (lower = better) |
| Account Longevity | 15% | Time since registration |
| Activity Level | 15% | Consistent engagement over time |
| Verification Participation | 10% | Confirming/reviewing others' suggestions |

- **Trust Decay:** Inactive users (>90 days no activity) lose 1 point per month (configurable).
- Trust scores are stored on the `User` node in Neo4j and cached in Redis.

#### 3.3.2 Verification Workflow

```
User A proposes change → System creates "Suggestion"
  ├── If target node is "Unverified": Apply immediately, mark as "Pending Verification"
  ├── If target node is "Verified":
  │     ├── Requires N confirmations from users with Trust Score ≥ 50 (configurable)
  │     └── OR 1 confirmation from user with Trust Score > 90 (configurable)
  └── Suggestion states: PENDING → CONFIRMED / REJECTED
```

- All suggestions are stored with full audit trail (who proposed, who confirmed/rejected, timestamps).

### 3.4 Deduplication & Merging

> **Note:** Currently **stubbed**. Full implementation is scheduled for Phase 2.

- **Detection:** Background jobs use graph algorithms and string similarity (Levenshtein distance on names, date proximity, relative topology overlap) to detect potential duplicates.
- **Confidence Score:** Each duplicate pair receives a 0–100 confidence score.
- **Merge UI:** Users are presented with a side-by-side comparison to select winning attributes for each field.
- **Merge Rules:**
    - Merging combines all relationships from both nodes onto the surviving node.
    - The merged-away node's UUID is stored in `merged_from_ids` on the surviving node for traceability.
    - `merged_into_id` on the merged-away node points to the survivor.
- **Reversibility:** All merges must be reversible. The system maintains a merge history log.

### 3.5 Media Management

- **Storage Backend:** Garage (S3-compatible object storage), running as a 3-node cluster in Docker Compose.
- **Upload Flow:** Client → `media_storage_service` (port 8009) → Garage. Files are stored with namespace `dzinza-media`.
- **Association:** Media assets are linked to `Person` nodes or source citations via metadata stored in PostgreSQL.
- **Metadata Extraction:** On upload, extract EXIF data, resolution, file size, and MIME type. Store as JSON alongside the media record.
- **Supported Types:** Images (JPEG, PNG, TIFF, WebP), Documents (PDF), Audio (MP3, WAV), Video (MP4, WebM).
- **Size Limits:** 50 MB per file (configurable).
- **Thumbnail Generation:** Deferred to Phase 3. Initial implementation returns original files only.

### 3.6 Search & Discovery

> **Note:** Currently **stubbed**. Full implementation is scheduled for Phase 2.

- **Indexing:** Person data must be synchronized from Neo4j to Elasticsearch for high-performance text search. Sync is triggered via events when person records are created/updated.
- **Search Fields:** `primary_name`, `alternate_names`, `birth_place`, `death_place`, `biography`, `clan`, `tribe`.
- **Filters:** Faceted filtering (e.g., "Born between 1900–1920", "Location: Zimbabwe", "Gender: Male").
- **Privacy Awareness:** Search results must exclude private nodes or redact fields based on the requestor's permission level and the person's privacy settings.
- **Response Format:** Results include match score, highlighted matching fields, and basic person summary.

### 3.7 Notifications

- **In-App:** Notification objects stored in PostgreSQL, fetched via `GET /notifications`. Supports marking as read.
- **Email (Local Development):** Use **MailHog** (or MailPit) as a local SMTP capture server. All outgoing emails are trapped and viewable via MailHog's web UI (port 8025). No real emails are sent during development.
- **Email (Production):** Swap to a transactional email provider (e.g., Amazon SES, SendGrid, or Mailgun) via environment variable configuration. The `notification_service` must use a pluggable email backend that reads `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` from environment/secrets.
- **Push / SMS:** Deferred to Phase 4.

### 3.8 Help & Support

- **Ticket System:** Users can submit support tickets stored in MongoDB (unstructured, flexible schema).
- **Categories:** Bug Report, Feature Request, Account Issue, Data Dispute, General.
- **Service:** `help_support_service` (port 8014).

---

## 4. Technical Architecture

### 4.1 Architecture Style: Microservices

The application is split into 15 domain-specific services, each running as an independent Docker container. Each service is a Go module with a standard project layout:

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

> **Migration Note:** The existing codebase has Python/FastAPI stubs for these services. Phase 1 includes rewriting core services (auth, genealogy) in Go. Remaining stubs will be migrated in subsequent phases.

**Rationale:**
- **Performance:** Go's compiled binaries, goroutine-based concurrency, and low memory footprint make it ideal for microservices that need high throughput and low latency.
- **Technology Fit:** Allows using Neo4j for graph data and PostgreSQL for relational data where each is appropriate.
- **Independent Scaling:** Read-heavy services (Search) can scale separately from write-heavy services (Genealogy).
- **Resilience:** Failure in the `media` service does not crash the core `genealogy` browsing experience.
- **Agentic Development:** Each service is self-contained with clear boundaries, making it ideal for AI-assisted development (one service per task).
- **Single Binary Deployment:** Each Go service compiles to a single static binary, simplifying Docker images (can use `scratch` or `alpine` base).

### 4.2 Service Inventory

| Service | Port | Primary DB | Status | Dependencies |
|---------|------|-----------|--------|--------------|
| `admin_moderation_service` | 8000 | PostgreSQL | Stub | postgres, mongodb, redis, neo4j |
| `analytics_service` | 8001 | PostgreSQL, ES | Stub | postgres, mongodb, redis |
| `audit_history_service` | 8002 | PostgreSQL | Partial | postgres, mongodb, redis |
| `auth_service` | 8003 | PostgreSQL, Redis | Stub | postgres, mongodb, redis |
| `community_marketplace_service` | 8004 | PostgreSQL | Stub | postgres, mongodb, redis |
| `deduplication_service` | 8005 | Neo4j, PostgreSQL | Stub | postgres, mongodb, redis |
| `genealogy_service` | 8006 | Neo4j | Functional | postgres, mongodb, redis |
| `graph_query_service` | 8007 | Neo4j | Not Started | postgres, mongodb, redis |
| `localization_service` | 8008 | PostgreSQL | Stub | postgres, mongodb, redis |
| `media_storage_service` | 8009 | Garage, PostgreSQL | Partial | postgres, mongodb, redis |
| `notification_service` | 8010 | PostgreSQL, Redis | Partial | postgres, mongodb, redis |
| `relationship_verification_service` | 8011 | Neo4j, PostgreSQL | Stub | postgres, mongodb, redis |
| `search_discovery_service` | 8012 | Elasticsearch | Stub | postgres, mongodb, redis |
| `trust_access_control_service` | 8013 | Neo4j, PostgreSQL | Stub | postgres, mongodb, redis |
| `help_support_service` | 8014 | PostgreSQL, MongoDB | Stub | postgres, mongodb, redis |

**Status Legend:**
- **Functional:** Core endpoints work end-to-end with real DB (currently Python; to be rewritten in Go).
- **Partial:** Some endpoints work; others are placeholder (currently Python; to be rewritten in Go).
- **Stub (Python):** Existing Python/FastAPI stub, returns mock data. Will be replaced with Go implementation.
- **Not Started:** No running service yet; will be implemented directly in Go.

### 4.3 Shared Code

All services import a shared Go module at `services/pkg/` containing:
- `pkg/logging/` — Structured logging setup using `log/slog` (Go 1.21+ structured logger) or `zerolog`.
- `pkg/health/` — Standardized `GET /health` handler returning `{"status": "ok", "service": "<name>"}`.
- `pkg/auth/` — JWT verification middleware (validates access tokens, extracts user claims).
- `pkg/config/` — Configuration loader reading from environment variables and Docker secrets (`/run/secrets/`).
- `pkg/response/` — Standardized JSON response helpers (success, error, paginated).

Services import this as a Go module dependency (e.g., `require github.com/chifamba/dzinza/services/pkg`).

### 4.4 Primary Database: Neo4j (Graph DB)

- **Decision:** Neo4j is the source of truth for all genealogical data (persons, relationships, trees).
- **Rationale:** Genealogy is inherently a graph problem. Traversals (e.g., "Find all 3rd cousins") are O(k) on edge count in a graph DB, whereas they require complex recursive joins in SQL.
- **Version:** Neo4j 5.18 with APOC plugin enabled.
- **Node Labels:** `Person`, `FamilyTree`, `User`.
- **Relationships:** `PARENT_OF`, `SPOUSE_OF`, `SIBLING_OF`, `MEMBER_OF`, `HAS_PERMISSION`, `TRUSTS`.

### 4.5 Object Storage: Garage (S3-Compatible)

- **Decision:** Use Garage for object storage.
- **Rationale:** Lightweight, self-hostable, distributed storage that aligns with the decentralized ethos. Standard S3 API compatibility allows easy migration to AWS S3 or MinIO later.
- **Topology:** 3-node cluster (`garage1`, `garage2`, `garage3`) for replication in Docker Compose.

### 4.6 Inter-Service Communication

#### Synchronous (REST)

- All client-to-service interactions use REST. OpenAPI specs are maintained manually in `docs/openapi/` or generated from Go code using `swaggo/swag` annotations.
- Service-to-service calls (e.g., `genealogy_service` calling `auth_service` to validate JWT) use internal Docker network HTTP calls via container names (e.g., `http://auth_service:8000/verify`).

#### Asynchronous (Event Bus — Redis Pub/Sub)

For Phase 1, use **Redis Pub/Sub** for lightweight event-driven communication between services. This avoids introducing Kafka's operational complexity early on, while remaining upgrade-friendly.

**Event Topics:**

| Topic | Producer | Consumer(s) | Payload |
|-------|----------|-------------|---------|
| `person.created` | genealogy_service | search_discovery_service, analytics_service | `{person_id, tree_id, name, timestamp}` |
| `person.updated` | genealogy_service | search_discovery_service | `{person_id, changed_fields, timestamp}` |
| `person.merged` | deduplication_service | search_discovery_service, trust_access_control_service | `{surviving_id, merged_id, timestamp}` |
| `relationship.created` | genealogy_service | trust_access_control_service, notification_service | `{relationship_id, type, person1_id, person2_id}` |
| `relationship.verified` | relationship_verification_service | notification_service, trust_access_control_service | `{relationship_id, verified_by, status}` |
| `user.banned` | admin_moderation_service | auth_service, notification_service | `{user_id, banned_by, reason}` |
| `media.uploaded` | media_storage_service | notification_service | `{media_id, user_id, person_id, filename}` |
| `trust.updated` | trust_access_control_service | notification_service | `{user_id, old_score, new_score}` |

**Future:** If scale demands it, replace Redis Pub/Sub with a durable message broker (e.g., NATS, RabbitMQ, or Kafka).

### 4.7 API Gateway

For Phase 1 (local development), the frontend calls services directly by port number (e.g., `http://localhost:8003/login` for auth, `http://localhost:8006/familytrees` for genealogy). The Vite dev server can be configured with proxy rules in `vite.config.ts` to route `/api/auth/*` to port 8003, `/api/genealogy/*` to port 8006, etc.

**Future (Production):** Introduce a reverse proxy (Nginx, Traefik, or Kong) to unify all service endpoints under a single domain with path-based routing, TLS termination, and rate limiting.

---

## 5. Technology Stack

### 5.1 Backend

| Component | Technology | Version | Notes |
|-----------|-----------|---------|-------|
| **Language** | Go (Golang) | 1.26+ | All services implemented in Go |
| **HTTP Framework** | Gin | Latest | High-performance HTTP framework with middleware support, JSON validation, route grouping |
| **Server** | Go `net/http` (via Gin) | Built-in | No external server required; Go's standard library HTTP server is production-grade |
| **Neo4j Driver** | `neo4j/neo4j-go-driver/v5` | v5 | Official Go driver for graph operations (Bolt protocol) |
| **PostgreSQL** | GORM + `pgx` | Latest | GORM as ORM with `pgx` as the underlying PostgreSQL driver for performance |
| **MongoDB Driver** | `go.mongodb.org/mongo-driver` | Latest | Official Go driver for MongoDB (Help/Support tickets) |
| **Authentication** | `golang-jwt/jwt/v5` + `x/crypto/bcrypt` | Latest | JWT generation/validation; bcrypt password hashing |
| **HTTP Client** | Go `net/http` | Built-in | Standard library HTTP client for inter-service calls |
| **Redis Client** | `go-redis/redis/v9` | v9 | Caching, rate limiting, Pub/Sub |
| **Validation** | `go-playground/validator/v10` | v10 | Struct tag-based input validation (integrated with Gin) |
| **Configuration** | `spf13/viper` or `caarlos0/env` | Latest | Read from env vars, files, Docker secrets |
| **Logging** | `log/slog` or `rs/zerolog` | Built-in / Latest | Structured JSON logging |
| **OpenAPI** | `swaggo/swag` | Latest | Generate OpenAPI 3.0 specs from Go annotations |
| **S3 Client** | `aws/aws-sdk-go-v2` | v2 | S3-compatible client for Garage object storage |

### 5.2 Frontend

| Component | Technology | Version | Notes |
|-----------|-----------|---------|-------|
| **Framework** | React | 18.2.0 | Component-based UI |
| **Language** | TypeScript | 5.4+ | Type-safe development |
| **Build Tool** | Vite | 7.3+ | Fast HMR and production builds |
| **State Management** | React Context + Hooks | — | Simple approach for MVP; upgrade to Zustand or Redux if complexity warrants |
| **HTTP Client** | Native `fetch` (wrapped) | — | Lightweight; add `axios` or React Query when needed |
| **Styling** | Vanilla CSS or TailwindCSS | — | Decision TBD (see Open Questions) |
| **Testing** | Vitest + Playwright | — | Unit tests + E2E tests |
| **Tree Visualization** | Canvas/SVG (custom or library) | — | Interactive family tree rendering |

### 5.3 Data Infrastructure

| Component | Image | Version | Purpose | Port(s) |
|-----------|-------|---------|---------|---------|
| **PostgreSQL** | `postgres:17.5-alpine` | 17.5 | User accounts, audit logs, notifications, relational data | 5432 |
| **Neo4j** | `neo4j:5.18` (+ APOC) | 5.18 | Core genealogy graph (persons, relationships, trees) | 7474 (HTTP), 7687 (Bolt) |
| **MongoDB** | `mongo:8.0-noble` | 8.0 | Unstructured data (support tickets) | 27017 |
| **Elasticsearch** | `elasticsearch:8.12.0` | 8.12 | Full-text search indexing | 9200 |
| **Redis** | `redis:8.0.2-alpine` | 8.0 | Session cache, rate limiting, Pub/Sub event bus | 6379 |
| **Garage** | `dxflrs/garage:v2.0.0` | 2.0 | S3-compatible object storage (3-node cluster) | 39000–39003 (S3 API) |

### 5.4 DevOps & Observability

| Component | Technology | Purpose | Port |
|-----------|-----------|---------|------|
| **Containerization** | Docker + Docker Compose | Local development orchestration | — |
| **Orchestration (Prod)** | Kubernetes | Production deployment (manifests in `/k8s/`) | — |
| **Metrics** | Prometheus (`prom/prometheus:v3.4.1`) | Scrape service `/metrics` endpoints | 9091 |
| **Dashboards** | Grafana (`grafana/grafana:11.1.0`) | System health visualization | 3300 |
| **Email (Local Dev)** | MailHog or MailPit | SMTP capture server for testing | 1025 (SMTP), 8025 (Web UI) |
| **Secret Management** | Docker Secrets | Files in `/secrets/` mounted at `/run/secrets/` | — |

---

## 6. Local Development Environment

### 6.1 Prerequisites

- Docker Desktop (or Docker Engine + Docker Compose v2)
- Go 1.26+ (for local service development outside Docker)
- Node.js 20+ and npm (for frontend)
- Git

### 6.2 Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd dzinza

# Create secret files (see secrets/README.md for values)
./scripts/setup-secrets.sh

# Start all infrastructure + services
docker compose up -d

# Start frontend dev server (in separate terminal)
cd frontend && npm install && npm run dev
```

### 6.3 Service Port Map

| Service | URL |
|---------|-----|
| Frontend (Vite dev) | http://localhost:5173 |
| Auth Service | http://localhost:8003 |
| Genealogy Service | http://localhost:8006 |
| Media Storage | http://localhost:8009 |
| Notification Service | http://localhost:8010 |
| Neo4j Browser | http://localhost:7474 |
| Grafana | http://localhost:3300 |
| Prometheus | http://localhost:9091 |
| MailHog Web UI | http://localhost:8025 |
| Elasticsearch | http://localhost:9200 |

### 6.4 Email Testing (Local)

All email features (registration confirmation, MFA codes, notifications) use MailHog in the local development environment:

1. MailHog container runs as an SMTP server on port 1025.
2. Application services send email to `mailhog:1025` (Docker internal network).
3. Emails are captured (never sent externally) and viewable at `http://localhost:8025`.
4. Environment variables: `SMTP_HOST=mailhog`, `SMTP_PORT=1025`, `SMTP_USER=`, `SMTP_PASS=`.

### 6.5 Secret Management

Secrets are stored as plain text files in `/secrets/` (git-ignored) and mounted via Docker Compose secrets:

| Secret File | Purpose |
|-------------|---------|
| `db_password.txt` | PostgreSQL password |
| `mongo_password.txt` | MongoDB root password |
| `redis_password.txt` | Redis AUTH password |
| `jwt_secret.txt` | JWT signing key |
| `jwt_refresh_secret.txt` | Refresh token signing key |
| `smtp_pass.txt` | SMTP password (empty for MailHog) |
| `grafana_password.txt` | Grafana admin password |
| `google_client_id.txt` | Google OAuth client ID |
| `google_client_secret.txt` | Google OAuth client secret |
| `aws_access_key_id.txt` | Garage S3 access key |
| `aws_secret_access_key.txt` | Garage S3 secret key |
| `seed_admin_password.txt` | Initial admin user password |

---

## 7. Non-Functional Requirements (NFRs)

### 7.1 Performance

| Metric | Target | Notes |
|--------|--------|-------|
| Graph Traversals | < 200ms | "Ancestors up to 5 generations" queries |
| Full-Text Search | < 500ms | Elasticsearch queries |
| API Latency (p95) | < 300ms | CRUD operations |
| Page Load Time | < 3s | Initial frontend bundle load |

### 7.2 Scalability

- All services are stateless (session state in Redis), enabling horizontal scaling.
- Neo4j supports read-replicas or causal clustering for high availability (production).
- PostgreSQL supports streaming replication (production).
- Elasticsearch supports clustering (production).

### 7.3 Reliability & Integrity

- **Data Consistency:** Eventual consistency is acceptable for search indexes and analytics. Neo4j must maintain strict consistency for relationship edges to prevent orphaned nodes.
- **Backups:** Automated daily backups of Neo4j dumps (via `neo4j-admin dump`) and PostgreSQL dumps (`pg_dump`) to separate storage. Implementation deferred to Phase 4 (`backup_recovery_service`).
- **Health Checks:** Every service exposes `GET /health` returning `{"status": "ok"}`. Docker Compose uses these for container restart policies.

### 7.4 Security

| Concern | Implementation |
|---------|---------------|
| Data at Rest | PostgreSQL and Neo4j encryption at rest (production config) |
| Data in Transit | HTTPS/TLS 1.2+ for all API communication (production). HTTP in local dev. |
| Input Validation | All API endpoints validate input via struct tags and `go-playground/validator` (integrated with Gin binding) |
| CORS | Configured per-service via Gin CORS middleware; local dev allows `*`, production restricts to frontend domain |
| Secret Storage | Docker Secrets (files mounted at `/run/secrets/`); no secrets in env vars or code |

### 7.5 Testing Strategy

| Type | Tool | Coverage Target |
|------|------|-----------------|
| Unit Tests | Go `testing` + `testify` | > 80% on business logic |
| Integration Tests | Go `testing` + `testcontainers-go` | Key flows (auth, genealogy CRUD) |
| E2E Tests | Playwright | Critical user paths (frontend) |
| API Contract Tests | OpenAPI validation | All endpoints match spec |

---

## 8. Development Phases

### Phase 1: Foundation (Current — Months 0–3)

**Goal:** Get core services working end-to-end with real database integrations.

| Priority | Task | Status |
|----------|------|--------|
| P0 | Set up Go module structure and shared `pkg/` library (logging, health, auth middleware, config) | 🔴 Todo |
| P0 | `auth_service` — Rewrite in Go with Gin, GORM/pgx, JWT, bcrypt; wire to PostgreSQL | 🔴 Todo |
| P0 | `genealogy_service` — Rewrite in Go with Gin, neo4j-go-driver; fix GEDCOM export duplicate FAM bug | 🔴 Todo |
| P0 | Frontend — Login, Registration, Tree Viewer pages (functional) | ⚠️ Partial |
| P0 | Add MailHog to `docker-compose.yml` for email testing | 🔴 Todo |
| P0 | Update `docker-compose.yml` for Go service builds (multi-stage Dockerfile with `golang:1.26-alpine`) | 🔴 Todo |
| P1 | `audit_history_service` — Implement in Go, wire to PostgreSQL | 🔴 Todo |
| P1 | `media_storage_service` — Implement in Go, wire to Garage + PostgreSQL | 🔴 Todo |
| P1 | `notification_service` — Implement in Go, wire email sending via MailHog | 🔴 Todo |
| P1 | Add Vite proxy config for unified frontend API routing | 🔴 Todo |

### Phase 2: Core Features (Months 3–6)

| Priority | Task |
|----------|------|
| P0 | `search_discovery_service` — Elasticsearch integration + sync from Neo4j |
| P0 | `trust_access_control_service` — Trust scoring engine implementation |
| P0 | `relationship_verification_service` — Full verification workflow |
| P1 | `deduplication_service` — Duplicate detection algorithm |
| P1 | `notification_service` — Full implementation (in-app + email) |
| P1 | `admin_moderation_service` — Content moderation, user banning |
| P1 | Redis Pub/Sub event bus — Wire event producers/consumers |
| P1 | Frontend — Person detail pages, search, notifications UI |

### Phase 3: Enhanced Features (Months 6–9)

| Priority | Task |
|----------|------|
| P1 | `graph_query_service` — GraphQL interface for complex traversals |
| P1 | `analytics_service` — Platform metrics and dashboards |
| P1 | `community_marketplace_service` — Resource sharing |
| P2 | `localization_service` — UI translations, cultural name parsing |
| P2 | `help_support_service` — Ticket management |
| P2 | Media thumbnails and metadata extraction |

### Phase 4: Advanced Features (Months 9–12)

| Priority | Task |
|----------|------|
| P2 | DNA integration partnerships |
| P2 | `content_moderation_ai_service` — AI content review |
| P2 | Mobile applications (PWA or React Native) |
| P3 | `backup_recovery_service` — Automated backups |
| P3 | `integration_service` — External API integrations |
| P3 | Production deployment — Kubernetes, TLS, CDN |

---

## 9. API Specifications

### 9.1 Design Principles

1. **RESTful conventions** — Standard HTTP methods (`GET`, `POST`, `PUT`, `DELETE`) and status codes.
2. **OpenAPI 3.0/3.1** — Generated from Go code via `swaggo/swag` annotations, or maintained manually. Specs stored in `docs/openapi/`.
3. **JWT Bearer authentication** — Protected endpoints require `Authorization: Bearer <token>` header.
4. **Consistent pagination** — All list endpoints accept `page` (default: 1) and `limit` (default: 20) query params.
5. **Standard error responses** — All errors return `{"detail": "Human-readable message"}` with appropriate HTTP status code.

### 9.2 Authentication Flow

```
1. POST /register      → Create account → {"user_id": "uuid", "message": "..."}
2. POST /login          → {"access_token": "...", "refresh_token": "...", "token_type": "bearer"}
3. Use header: Authorization: Bearer <access_token> on subsequent requests
4. POST /refresh_token  → {"access_token": "...", "refresh_token": "..."}  (when access_token expires)
5. POST /blacklist_token → Invalidate a token (logout)
```

### 9.3 Key API Contracts

Full OpenAPI specifications are maintained in `docs/openapi/`:

| Service | Spec File | Key Endpoints |
|---------|-----------|---------------|
| Auth | `auth-service.yaml` | `/register`, `/login`, `/refresh_token`, `/assign_role` |
| Genealogy | `genealogy-service.yaml` | `/familytrees`, `/persons`, `/relationships`, `/import/gedcom` |
| Media | `media-storage-service.yaml` | `/media/upload`, `/media/{id}` |
| Search | `search-discovery-service.yaml` | `/search/person` |
| Trust | `trust-access-control-service.yaml` | `/trust-levels/{user_id}`, `/access-requests` |
| Notifications | `notification-service.yaml` | `/notifications`, `/notifications/{id}/read` |

---

## 10. Key Assumptions

1. **Community Willingness:** The success of the "Trust Model" assumes users are willing to verify the work of strangers. Gamification elements (badges, leaderboards) should be explored to incentivize participation.
2. **Duplicate Overlap:** We assume a significant portion of family trees overlap (the "Small World" phenomenon), making the global graph merging technically feasible and valuable.
3. **Browser Capabilities:** The frontend assumes modern browsers (Chrome 90+, Firefox 90+, Safari 15+, Edge 90+) capable of rendering complex Canvas/SVG-based family tree visualizations.
4. **Legal Compliance:** Users are responsible for the data they upload. The platform provides GDPR/Right-to-be-forgotten compliance tools (account deletion, data export). The platform assumes "Good Samaritan" status.
5. **Local-First Development:** All external integrations (email, OAuth, storage) must have free/self-hosted alternatives for local Docker Compose development. Production substitutes are configured via environment variables only.
6. **Agentic Development:** This specification is designed to be consumed by AI development agents. Each service is independently implementable, with clear interfaces defined by OpenAPI specs, and clear "done" criteria defined by the status tables and phase plans.

---

## 11. Open Questions

| # | Question | Impact | Owner |
|---|----------|--------|-------|
| 1 | Should frontend use TailwindCSS, vanilla CSS, or Chakra UI? | Affects all UI development | Product |
| 2 | Should the `graph_query_service` use GraphQL (`99designs/gqlgen` or `graphql-go/graphql`) or stick with REST? | Phase 3 API design | Engineering |
| 3 | Which DNA testing providers should be prioritized for integration? | Phase 4 scope | Product |
| 4 | Mobile strategy: Progressive Web App (PWA) vs. React Native? | Phase 4 scope | Product |
| 5 | Monetization model: Freemium, subscription, or donation-based? | Marketplace design | Product |
| 6 | Should offline support be required for community organizers in areas with limited connectivity? | Architecture impact | Product |

---

## 12. Glossary

| Term | Definition |
|------|-----------|
| **Family Tree** | A graph structure representing family relationships, owned by a user |
| **Person** | A Neo4j node representing an individual in a family tree |
| **Relationship** | A Neo4j edge connecting two Person nodes (parent, spouse, sibling) |
| **Trust Score** | Numeric measure (0–100) of a user's reliability based on contributions |
| **Verification** | Community-driven process of confirming relationship accuracy |
| **Merge** | Combining two duplicate Person nodes into a single surviving node |
| **GEDCOM** | Standard file format for genealogical data interchange (v5.5/5.5.1) |
| **World Tree** | The global merged graph of all interconnected family trees |
| **Suggestion** | A proposed change to a verified node, requiring community consensus |
| **Stub** | A service that runs but returns mock data without real database integration |

---

## 13. Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-19 | Initial specification |
| 2.0 | 2026-02-12 | Added tech stack, NFRs, assumptions |
| 3.0 | 2026-02-13 | Major revision: added service inventory, defined inter-service event bus (Redis Pub/Sub), added local email strategy (MailHog), expanded RBAC model, clarified all stubbed vs. functional services, restructured for agentic development clarity |
| 3.1 | 2026-02-13 | Backend language set to **Go 1.26+** with Gin framework, GORM, neo4j-go-driver. Existing Python/FastAPI stubs are legacy and will be migrated to Go. Updated all library references, service structure, shared code, testing tools, and Phase 1 tasks to reflect Go migration |
