# Dzinza Platform — Master Task List

> **Generated:** 2026-02-13  
> **Source:** [Full_Requirements_Spec.md](./Full_Requirements_Spec.md)  
> **Legend:** `[ ]` = Todo · `[/]` = In Progress · `[x]` = Done

---

## Current State Assessment

| Area | Status |
|------|--------|
| **Infrastructure (Docker Compose)** | ✅ All databases & tooling configured (Postgres, Neo4j, MongoDB, Redis, ES, Garage, Prometheus, Grafana) |
| **Go Services** | ✅ 15 services scaffolded in Go; 9 fully functional, 6 partially implemented/stubbed. |
| **Shared Go Library (`services/pkg/`)** | ✅ pkg/config, pkg/logging, pkg/health, pkg/auth, pkg/response, pkg/events implemented. |
| **Frontend** | ✅ Pages implemented and verified (Core UI complete). |
| **OpenAPI Specs** | ✅ All 15 service specs exist in `docs/openapi/` |
| **Secrets** | ✅ All secret files present |
| **CI/CD** | ✅ GitHub Actions workflow targets Go services. |
| **`.env`** | ✅ Port numbers and credentials updated |

---

## Final Verification (2026-02-14)

- [x] **Verification** — End-to-end API testing using Docker Compose.
- [x] **Bug Fix** — Resolved Redis authentication issues across services.
- [x] **Bug Fix** — Fixed Cypher syntax in deduplication merge.
- [x] **Enhancement** — Improved GEDCOM export for multiple parental units.
- [x] **Documentation** — Updated Full_Requirements_Spec.md with current status.

---

## Phase 0: Project Scaffolding & Configuration Fixes

> **Goal:** Fix configuration mismatches and set up the Go project foundation so all other agents can build on it.

### 0.1 Fix Environment & Configuration

- [x] **T-0.1.1** — Update `.env` service ports to match spec (auth=8003, genealogy=8006, media=8009, etc.)
- [x] **T-0.1.2** — Update `.env` SMTP settings from Ethereal to MailHog
- [x] **T-0.1.3** — Add MailHog container to `docker-compose.yml`
- [x] **T-0.1.4** — Update `docker-compose.yml` to read Redis password from secret file
- [x] **T-0.1.5** — Update frontend Vite dev port from `3000` to `5173`
- [x] **T-0.1.6** — Update `.env` frontend VITE_* URLs

### 0.2 GitHub Actions CI Update

- [x] **T-0.2.1** — Rewrite `.github/workflows/dzinza.yml` for Go services

---

## Phase 1: Foundation (P0 — Core Services)

### 1.1 Shared Go Library (`services/pkg/`)

- [x] **T-1.1.1** — Initialize Go module at `services/pkg/`
- [x] **T-1.1.2** — Implement `pkg/config/`
- [x] **T-1.1.3** — Implement `pkg/logging/`
- [x] **T-1.1.4** — Implement `pkg/health/`
- [x] **T-1.1.5** — Implement `pkg/auth/`
- [x] **T-1.1.6** — Implement `pkg/response/`

### 1.2 Auth Service (`services/auth_service/`)

- [x] **T-1.2.1** — Scaffold `auth_service` directory structure
- [x] **T-1.2.2** — Implement user models and DTOs
- [x] **T-1.2.3** — Implement user repository
- [x] **T-1.2.4** — Implement auth service layer
- [x] **T-1.2.5** — Implement auth HTTP handlers + routes
- [x] **T-1.2.6** — Implement RBAC
- [x] **T-1.2.7** — Implement Redis rate limiting middleware
- [x] **T-1.2.8** — Write multi-stage Dockerfile
- [x] **T-1.2.9** — Add `auth_service` to `docker-compose.yml`
- [x] **T-1.2.10** — Write integration tests

### 1.3 Genealogy Service (`services/genealogy_service/`)

- [x] **T-1.3.1** — Scaffold `genealogy_service`
- [x] **T-1.3.2** — Implement Neo4j person models and DTOs
- [x] **T-1.3.3** — Implement Neo4j repository layer
- [x] **T-1.3.4** — Implement genealogy service layer
- [x] **T-1.3.5** — Implement genealogy HTTP handlers + routes
- [x] **T-1.3.6** — Implement GEDCOM import
- [x] **T-1.3.7** — Implement GEDCOM export
- [x] **T-1.3.8** — Write multi-stage Dockerfile
- [x] **T-1.3.9** — Add `genealogy_service` to `docker-compose.yml`
- [x] **T-1.3.10** — Write integration tests

### 1.4 Audit History Service (`services/audit_history_service/`)

- [x] **T-1.4.1** — Scaffold `audit_history_service`
- [x] **T-1.4.2** — Implement audit log models
- [x] **T-1.4.3** — Implement audit repository + service layer
- [x] **T-1.4.4** — Implement audit HTTP handlers + routes
- [x] **T-1.4.5** — Write Dockerfile + add to `docker-compose.yml`

### 1.5 Media Storage Service (`services/media_storage_service/`)

- [x] **T-1.5.1** — Scaffold `media_storage_service`
- [x] **T-1.5.2** — Implement media models
- [x] **T-1.5.3** — Implement S3 upload/download
- [x] **T-1.5.4** — Implement EXIF metadata extraction
- [x] **T-1.5.5** — Implement media HTTP handlers + routes
- [x] **T-1.5.6** — Write Dockerfile + add to `docker-compose.yml`

### 1.6 Notification Service (`services/notification_service/`)

- [x] **T-1.6.1** — Scaffold `notification_service`
- [x] **T-1.6.2** — Implement notification models
- [x] **T-1.6.3** — Implement pluggable email backend
- [x] **T-1.6.4** — Implement notification HTTP handlers + routes
- [x] **T-1.6.5** — Write Dockerfile + add to `docker-compose.yml`

### 1.7 Frontend — Phase 1 Pages

- [x] **T-1.7.1** — Add React Router
- [x] **T-1.7.2** — Add design system
- [x] **T-1.7.3** — Implement Login page
- [x] **T-1.7.4** — Implement Registration page
- [x] **T-1.7.5** — Implement Dashboard page
- [x] **T-1.7.6** — Implement Tree Viewer page
- [x] **T-1.7.7** — Add Vite proxy config
- [x] **T-1.7.8** — Add TypeScript types

---

## Phase 2: Core Features (P0/P1)

### 2.1 Search & Discovery Service (`services/search_discovery_service/`)

- [x] **T-2.1.1** — Scaffold search_discovery_service
- [x] **T-2.1.2** — Implement Elasticsearch index management
- [x] **T-2.1.3** — Implement Neo4j → Elasticsearch sync
- [x] **T-2.1.4** — Implement search endpoint
- [x] **T-2.1.5** — Write Dockerfile + add to `docker-compose.yml`

### 2.2 Trust & Access Control Service (`services/trust_access_control_service/`)

- [x] **T-2.2.1** — Scaffold trust_access_control_service
- [x] **T-2.2.2** — Implement Trust Score calculation engine (Uses real graph data)
- [x] **T-2.2.3** — Implement trust score storage
- [x] **T-2.2.4** — Implement trust HTTP endpoints
- [x] **T-2.2.5** — Write Dockerfile + add to `docker-compose.yml`

### 2.3 Relationship Verification Service (`services/relationship_verification_service/`)

- [x] **T-2.3.1** — Scaffold relationship_verification_service
- [x] **T-2.3.2** — Implement Suggestion model and workflow (Syncs to Neo4j)
- [x] **T-2.3.3** — Implement verification HTTP endpoints
- [x] **T-2.3.4** — Write Dockerfile + add to `docker-compose.yml`

### 2.4 Deduplication Service (`services/deduplication_service/`)

- [x] **T-2.4.1** — Scaffold deduplication_service
- [/] **T-2.4.2** — Implement duplicate detection algorithm (Partial: basic exact match)
- [x] **T-2.4.3** — Implement merge logic
- [x] **T-2.4.4** — Implement deduplication HTTP endpoints
- [x] **T-2.4.5** — Write Dockerfile + add to `docker-compose.yml`

### 2.5 Admin & Moderation Service (`services/admin_moderation_service/`)

- [x] **T-2.5.1** — Scaffold admin_moderation_service
- [x] **T-2.5.2** — Implement user banning/unbanning
- [/] **T-2.5.3** — Implement content moderation (Partial: fire-and-forget AI call)
- [x] **T-2.5.4** — Write Dockerfile + add to `docker-compose.yml`

### 2.6 Redis Pub/Sub Event Bus

- [x] **T-2.6.1** — Implement event publisher in `pkg/events/`
- [x] **T-2.6.2** — Wire event publishing into `genealogy_service`
- [x] **T-2.6.3** — Wire event consumers into `search_discovery_service`, `notification_service`, `trust_access_control_service`

### 2.7 Notification Service — Full Implementation

- [x] **T-2.7.1** — Add in-app notification storage + retrieval
- [x] **T-2.7.2** — Wire notification triggers from event bus

### 2.8 Frontend — Phase 2 Pages

- [x] **T-2.8.1** — Implement Person Detail page
- [x] **T-2.8.2** — Implement Search page
- [x] **T-2.8.3** — Implement Notifications UI
- [x] **T-2.8.4** — Implement Admin Dashboard page

---

## Phase 3: Enhanced Features (P1)

### 3.1 Graph Query Service (`services/graph_query_service/`)

- [x] **T-3.1.1** — Scaffold graph_query_service
- [x] **T-3.1.2** — Implement GraphQL schema for genealogy
- [x] **T-3.1.3** — Implement GraphQL resolvers
- [x] **T-3.1.4** — Write Dockerfile + add to `docker-compose.yml`

### 3.2 Analytics Service (`services/analytics_service/`)

- [x] **T-3.2.1** — Scaffold analytics_service
- [x] **T-3.2.2** — Implement platform metrics collection
- [x] **T-3.2.3** — Implement analytics dashboards API
- [x] **T-3.2.4** — Write Dockerfile + add to `docker-compose.yml`

### 3.3 Community Marketplace Service (`services/community_marketplace_service/`)

- [x] **T-3.3.1** — Scaffold community_marketplace_service
- [x] **T-3.3.2** — Implement resource sharing models
- [x] **T-3.3.3** — Implement marketplace API
- [x] **T-3.3.4** — Write Dockerfile + add to `docker-compose.yml`

### 3.4 Localization Service (`services/localization_service/`)

- [x] **T-3.4.1** — Scaffold localization_service
- [x] **T-3.4.2** — Implement translation management
- [ ] **T-3.4.3** — Implement cultural name parsing (Stubbed)
- [x] **T-3.4.4** — Write Dockerfile + add to `docker-compose.yml`

### 3.5 Help & Support Service (`services/help_support_service/`)

- [x] **T-3.5.1** — Scaffold help_support_service
- [x] **T-3.5.2** — Implement ticket management (MongoDB)
- [x] **T-3.5.3** — Implement help API
- [x] **T-3.5.4** — Write Dockerfile + add to `docker-compose.yml`

### 3.6 Media Enhancements

- [x] **T-3.6.1** — Implement thumbnail generation in `media_storage_service`
- [x] **T-3.6.2** — Implement metadata extraction (EXIF) enhancement

---

## Phase 4: Advanced Features (P2/P3)

### 4.1 DNA Integration

- [x] **T-4.1.1** — Implement DNA data models
- [ ] **T-4.1.2** — Implement DNA provider API stubs (Stubbed)

### 4.2 AI Content Moderation

- [x] **T-4.2.1** — Implement AI moderation service (Stubbed: keyword check only)
- [x] **T-4.2.2** — Wire to `admin_moderation_service`

### 4.3 Backup & Recovery

- [ ] **T-4.3.1** — Implement backup service (Stubbed: logs only)
- [ ] **T-4.3.2** — Implement automated DB dumps
- [x] **T-4.3.3** — Write Dockerfile + add to `docker-compose.yml`

### 4.4 External Integrations

- [ ] **T-4.4.1** — Implement generic integration service (Stubbed)

### 4.5 Production Readiness

- [x] **T-4.5.1** — Kubernetes manifests for all services
- [x] **T-4.5.2** — TLS/HTTPS configuration
- [x] **T-4.5.3** — CDN integration for media
