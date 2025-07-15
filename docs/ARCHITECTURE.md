# Dzinza - Technical Architecture & Implementation Details

This document provides a detailed overview of the Dzinza platform's technical architecture, implementation details of its microservices, infrastructure, and other relevant technical aspects.

## 1. System Architecture

The Dzinza platform employs a microservices architecture to ensure modularity, scalability, and maintainability. Each service is designed to handle specific business capabilities and can be developed, deployed, and scaled independently.

### 1.1. Overall System Design and Components

The primary components of the system are:

- **Frontend Application:** A React/TypeScript single-page application (SPA) providing the user interface.
- **API Gateway (`backend-service`):** The single entry point for all client requests. It routes requests to the appropriate backend microservices and handles cross-cutting concerns.
- **Backend Microservices:**
  - **Authentication Service (`auth-service`):** Manages user identity, authentication (including MFA), authorization, and user profiles.
  - **Genealogy Service (`genealogy-service`):** Manages core genealogical data: family trees, individuals, relationships, events, and related functionalities like GEDCOM processing and merge suggestions.
  - **Storage Service (`storage-service`):** Handles file uploads, storage in S3 (or compatible), metadata management, and image processing (e.g., thumbnails).
  - **Search Service (`search-service`):** Provides search capabilities across various data types by indexing data into Elasticsearch.
- **Databases & Storage:**
  - **PostgreSQL:** Used by the `auth-service` for relational user data.
  - **MongoDB:** Used by `genealogy-service` (for flexible genealogical documents), `storage-service` (for file metadata), and `search-service` (for search analytics).
  - **Redis:** Used as a cache, session store (potentially by `auth-service`), and as a message broker for Celery background tasks (`genealogy-service`).
  - **Elasticsearch:** Used by `search-service` for indexing and querying data.
  - **S3-Compatible Object Storage:** Used by `storage-service` for storing uploaded files.
- **Background Task Processing:**
  - **Celery:** Used by `genealogy-service` for asynchronous tasks like GEDCOM processing and duplicate detection.

### 1.2. Service Boundaries and Responsibilities

- **Frontend:** User interaction, presentation logic, client-side state management.
- **API Gateway (`backend-service`):**
  - Request routing to internal services.
  - Authentication and authorization (JWT validation).
  - Rate limiting.
  - CORS handling.
  - Request/response logging and transformation (if necessary).
  - Aggregating responses from multiple services (if needed, though typically services are called directly by frontend through gateway).
- **Authentication Service (`auth-service`):**
  - User registration, login, logout.
  - JWT issuance and refresh.
  - Multi-Factor Authentication (MFA) management.
  - Password management (reset, change).
  - Email verification.
  - User profile data management.
  - Admin user management.
- **Genealogy Service (`genealogy-service`):**
  - CRUD operations for Family Trees, Persons, Relationships, Events.
  - Management of Person History (audit trail for person changes).
  - Handling GEDCOM file import/export (potentially via Celery tasks).
  - Generating and managing Merge Suggestions for duplicate persons (potentially via Celery tasks).
  - Managing user Notifications related to genealogical activities.
- **Storage Service (`storage-service`):**
  - Secure file uploads and downloads (via S3).
  - Metadata storage for files.
  - Image processing (thumbnail generation).
  - File organization (e.g., by user, by tree).
  - Scheduled cleanup of orphaned or soft-deleted files.
- **Search Service (`search-service`):**
  - Indexing data from other services (e.g., persons, trees, events) into Elasticsearch.
  - Providing a query API for searching across indexed data.
  - Offering search suggestions (type-ahead).
  - Logging search analytics.

### 1.3. Data Flow Diagrams

_(This section would ideally contain diagrams. As a text-based agent, I will describe common flows.)_

**Typical Request Flow (e.g., Fetching Family Tree Data):**

1.  **User Action (Frontend):** User navigates to view a family tree.
2.  **API Call (Frontend):** Frontend makes a GET request to `API Gateway (/api/v1/family-trees/{tree_id})` with an Authorization Bearer token.
3.  **API Gateway (`backend-service`):**
    - Receives the request.
    - AuthMiddleware validates the JWT. If valid, user information might be added to request state/headers for downstream services.
    - Identifies the target service (`genealogy-service`) based on the path prefix (`/family-trees`).
    - Forwards the request to `genealogy-service` (e.g., `http://genealogy-service:8000/v1/family-trees/{tree_id}`).
4.  **Genealogy Service (`genealogy-service`):**
    - Receives the request.
    - Performs its own authorization checks (e.g., is the authenticated user the owner or a collaborator of this tree?).
    - Queries MongoDB to fetch the family tree data.
    - Serializes the data and returns it as a JSON response.
5.  **API Gateway (`backend-service`):**
    - Receives the response from `genealogy-service`.
    - Forwards the response back to the Frontend.
6.  **Frontend:**
    - Receives the data and renders the family tree.

**File Upload Flow:**

1.  **User Action (Frontend):** User selects a file to upload.
2.  **API Call (Frontend):** Frontend makes a POST request to `API Gateway (/api/v1/files/upload)` with the file data (multipart/form-data) and Authorization token.
3.  **API Gateway (`backend-service`):**
    - Authenticates the request.
    - Routes to `storage-service`.
4.  **Storage Service (`storage-service`):**
    - Receives the file.
    - Streams the file to S3-compatible storage.
    - If it's an image, performs image processing (e.g., generates thumbnails and uploads them to S3).
    - Stores metadata about the file (S3 key, URL, user ID, original name, MIME type, thumbnails info, etc.) in its MongoDB database.
    - Returns a success response with file details.
5.  **API Gateway & Frontend:** Response relayed back.

### 1.4. Technology Stack and Rationale

- **Backend Framework:** Python 3.11+ with FastAPI.
  - **Rationale:** High performance (async capabilities), automatic data validation with Pydantic, built-in OpenAPI documentation generation, strong Python ecosystem for data science, AI/ML (future features).
- **Frontend Framework:** React with TypeScript.
  - **Rationale:** Popular, component-based architecture, strong community support, type safety with TypeScript. Vite for build tooling. Tailwind CSS for styling.
- **Databases:**
  - **PostgreSQL (Auth Service):**
    - **Rationale:** ACID compliance, relational integrity for user credentials and core user data. SQLAlchemy with asyncpg for ORM and async driver.
  - **MongoDB (Genealogy, Storage Metadata, Search Analytics):**
    - **Rationale:** Flexible schema for complex and evolving document structures (genealogical data, file metadata). Good horizontal scalability. Motor for async driver.
  - **Redis (Caching, Message Broker):**
    - **Rationale:** Fast key-value store for caching, session management (if applicable), and as a reliable broker for Celery tasks. `redis-py` (async version).
  - **Elasticsearch (Search Service):**
    - **Rationale:** Powerful full-text search capabilities, complex querying, aggregations for faceting, and scalability for search workloads. `elasticsearch-py` (async client).
- **Object Storage (Storage Service):** S3-compatible (e.g., AWS S3, MinIO).
  - **Rationale:** Scalable, durable, and cost-effective storage for large binary files (media, documents).
- **Containerization & Orchestration:** Docker & Docker Compose (for local development).
  - **Rationale:** Consistent development and deployment environments, service isolation, ease of scaling individual services. Kubernetes is a common next step for production.
- **Background Tasks (Genealogy Service):** Celery with Redis broker.
  - **Rationale:** Distributed task queue for offloading long-running or resource-intensive operations (e.g., GEDCOM processing, duplicate detection) from the main request-response cycle.
- **API Gateway Implementation:** Python (FastAPI) using `httpx` for proxying.
  - **Rationale:** Allows custom logic in the gateway (auth, rate limiting) using the same Python stack.
- **Code Quality & Dependencies:**
  - Python: Ruff for linting/formatting, Pydantic for data validation, Pytest for testing. Poetry for dependency management.
  - Frontend: ESLint, Prettier, Vitest.

## 2. Implementation Details

This section provides a more detailed analysis of each microservice.

### 2.1. Authentication Service (`auth-service`)

- **Primary Responsibilities:** User identity, authentication, authorization, profile management.
- **Database:** PostgreSQL.
  - **Models (`models.py`):** `User`, `RefreshToken`, `AuditLog`.
    - `User`: Stores email, username, password hash, names, active status, role (enum: USER, ADMIN, MODERATOR), email verification details, password reset details, MFA secrets/backup codes, login attempt counters, lockout timestamps, preferences.
  - **CRUD (`crud.py`):** Manages database operations for users, refresh tokens, audit logs, MFA setup.
- **API Endpoints (`endpoints/`):**
  - `/auth/register`, `/auth/login` (handles MFA), `/auth/refresh`, `/auth/logout`.
  - `/auth/request-email-verification`, `/auth/verify-email`.
  - `/auth/request-password-reset`, `/auth/reset-password`, `/auth/change-password`.
  - `/mfa/enable-mfa-request`, `/mfa/verify-mfa-enable`, `/mfa/disable` (MFA management).
  - `/users/me` (GET/PUT for self-profile).
  - `/users/` (Admin: GET list, GET by ID, PUT by ID, DELETE by ID).
- **Security:**
  - JWT (access and refresh tokens, stored in HTTPOnly cookies for web).
  - Password hashing (bcrypt via `passlib`).
  - TOTP-based MFA.
  - Account lockout after failed login attempts.
- **Dependencies:** FastAPI, SQLAlchemy, Pydantic, `python-jose` (for JWTs), `passlib`, `pyotp`.
- **Configuration (`config.py`):** Database connection, JWT secrets, token expiry, SMTP settings, CORS, OpenTelemetry, Google OAuth.

### 2.2. API Gateway (`backend-service`)

- **Primary Responsibilities:** Route requests, authenticate, rate limit.
- **Routing Logic (`services/proxy.py`):**
  - Uses `SERVICE_BASE_URLS_BY_PREFIX` map from config to determine downstream service.
  - Prepends `/v1/` to the path for most downstream service calls (except their direct `/health` endpoints).
- **Middleware (`middleware/`):**
  - `AuthMiddleware`: Validates JWTs from Authorization header for non-exempt paths. Sets `request.state.user`.
  - `RateLimiter`: Uses `slowapi` for basic rate limiting.
  - CORS, security headers, response time.
- **HTTP Client:** `httpx.AsyncClient` for proxying requests.
- **Dependencies:** FastAPI, `httpx`, PyJWT (for AuthMiddleware), `slowapi`.
- **Configuration (`config.py`):** Downstream service URLs, JWT validation parameters, rate limits, CORS.

### Version-Agnostic Routing in API Gateway

The API Gateway (`backend-service`) automatically supports versioned API paths such as `/v1/auth/login`, `/v2/auth/login`, etc. The gateway skips the version segment (e.g., `v1`, `v2`) and uses the next segment (e.g., `auth`, `genealogy`, etc.) to determine the downstream service. This ensures that new API versions are supported without changes to the service mapping configuration.

- Example: `/v1/auth/login` and `/v2/auth/login` are both routed to the Authentication Service.
- Example: `/v1/genealogy/persons` and `/v2/genealogy/persons` are both routed to the Genealogy Service.

This logic is implemented in the reverse proxy (`app/services/proxy.py`).

### 2.3. Genealogy Service (`genealogy-service`)

- **Primary Responsibilities:** Manage family trees, persons, relationships, events, notifications, merge suggestions, person history.
- **Database:** MongoDB.
  - **Models (`models_main.py`):** Pydantic models for MongoDB documents: `FamilyTree`, `Person`, `Relationship`, `Event`, `Notification`, `MergeSuggestion`, `PersonHistory`. These models are rich and include various enums for types, statuses, etc.
  - **CRUD (`crud/`):** Async CRUD operations for each model using Motor. `crud_person` logs to `PersonHistory` and triggers Celery tasks.
- **API Endpoints (`endpoints/`):** Resource-specific routers.
  - `/family-trees/`: CRUD for family trees.
  - `/trees/{tree_id}/persons`: Create person in a tree, list persons in a tree.
  - `/persons/{person_id}`: Get/Update/Delete person.
  - `/persons/{person_id}/trees/{tree_id}`: Link/Unlink person from tree.
  - `/persons/search/`: Search persons by name.
  - (Similar CRUD endpoints for `relationships`, `events`, `notifications`, `merge-suggestions`, `person-history`).
  - `/gedcom/upload`, `/gedcom/export/{tree_id}` (Expected in `gedcom.py`).
- **Background Tasks (`services/tasks.py`, `services/celery_app.py`):**
  - Celery used for tasks like `find_duplicate_persons_task`.
  - Uses Redis as a broker.
- **Dependencies:** FastAPI, Motor, Pydantic, Celery.
- **Configuration (`config.py`):** MongoDB connection, Redis (for Celery), GEDCOM settings, duplicate detection threshold.

### 2.4. Storage Service (`storage-service`)

- **Primary Responsibilities:** File uploads, S3 storage, metadata management, image processing.
- **Object Storage:** S3 or S3-compatible.
- **Metadata Database:** MongoDB.
  - **Models (`models.py`):** `FileRecord` (main model for metadata, includes S3 key, URL, user, associations, soft delete flags), `FileMetadata` (embedded, for EXIF, custom data), `Thumbnail`.
  - **CRUD (`crud.py`):** Manages `FileRecord` documents in MongoDB. Includes soft delete and association management.
- **S3 Interaction (`services/s3_service.py`):** `S3ServiceClass` using `boto3` for upload, delete, presigned URL generation.
- **Image Processing (`services/image_processor_service.py`):** `ImageProcessorServiceClass` using Pillow for EXIF extraction and thumbnail generation.
- **API Endpoints (`endpoints/files.py`):**
  - `/files/upload`: Handles `List[UploadFile]`, uploads to S3, processes images, saves metadata.
  - `/files/`: List files for user (filtered, paginated).
  - `/files/{file_id}`: Get file metadata.
  - `/files/{file_id}/download`: Get presigned S3 URL for download (original or thumbnail).
  - `/files/{file_id}` (PUT): Update file metadata.
  - `/files/{file_id}` (DELETE): Soft delete file record.
  - Internal association endpoints (`/files/{file_id}/associate-event`, `/files/{file_id}/associate-person`).
- **Cleanup (`services/cleanup_service.py`):** Scheduled task (APScheduler) to find old soft-deleted `FileRecord`s, delete corresponding S3 objects (main file and thumbnails), and then hard-delete the MongoDB record.
- **Dependencies:** FastAPI, Motor, Pydantic, `boto3`, Pillow, `python-magic` (for MIME detection), APScheduler.
- **Configuration (`config.py`):** MongoDB, S3 (keys, bucket, endpoint), image processing, cleanup schedule.

### 2.5. Search Service (`search-service`)

- **Primary Responsibilities:** Provide search over indexed data, suggestions.
- **Search Engine:** Elasticsearch.
  - **Client (`services/elasticsearch_client.py`):** Manages async Elasticsearch client.
  - **Logic (`services/search_logic.py`):** Builds Elasticsearch queries (multi-match, filters, sort, highlight, facets/aggregations). Executes searches and formats results. Provides suggestions (match_phrase_prefix).
- **Analytics Database (Optional):** MongoDB.
  - **Models (`analytics_models.py` or `models.py`):** `SearchAnalyticsEventDB`.
  - **CRUD (`crud/crud_search_analytics.py`):** Logs search events.
- **API Endpoints (`endpoints/search.py`):**
  - `/search/` (POST): Takes `SearchQuery` (query string, types, filters, pagination, sort, highlight/facet requests). Returns `SearchResponse`. Logs analytics.
  - `/search/suggest` (GET): Type-ahead suggestions.
- **Dependencies:** FastAPI, `elasticsearch-py` (async), Pydantic. Motor (if analytics enabled).
- **Configuration (`config.py`):** Elasticsearch connection, optional analytics MongoDB, JWT (if local validation).

## 3. Infrastructure & Deployment

### 3.1. Environment Configurations

- Configuration is primarily managed via environment variables, often sourced from `.env` files for local development and injected directly in containerized environments (e.g., Docker Compose, Kubernetes).
- Sensitive information (passwords, API keys) is read from files mounted into containers (e.g., Docker Secrets). Each service's `config.py` (Pydantic settings) handles loading these values.
- Key configuration files:
  - Root `.env` (for Docker Compose variables).
  - `./secrets/` directory (for secret files, git-ignored).
  - Individual service `config.py` files define expected variables and secret file paths.
- The `docs/ENVIRONMENT_CONFIGURATION.md` (legacy) provides a good reference, which is largely still applicable to the Python services' configuration loading strategy.

### 3.2. Deployment Architecture

- **Local Development:** Docker Compose (`docker-compose.yml`) is used to define and run all microservices, databases, and other dependencies (Redis, Elasticsearch) in isolated containers.
- **Production (Conceptual):**
  - Containerization with Docker is standard.
  - Kubernetes is a common choice for orchestrating microservices in production, providing scalability, self-healing, and rolling updates. (The `ROADMAP.md` mentioned Kubernetes as planned for production).
  - A managed load balancer would distribute traffic to the API Gateway.
  - Databases (PostgreSQL, MongoDB, Redis, Elasticsearch) would typically be run as managed services in a cloud environment (e.g., AWS RDS, DocumentDB, ElastiCache, OpenSearch Service) or self-hosted with appropriate replication and backup strategies.
  - S3 or a compatible object store for file storage.

### 3.3. CI/CD Pipeline Details

- GitHub Actions is used for CI/CD (as seen in `.github/workflows/`).
- The pipeline typically includes:
  - Linting (e.g., Ruff for Python, ESLint for Frontend).
  - Automated testing (Pytest for Python backend, Vitest for Frontend).
  - Building Docker images for each service.
  - Pushing Docker images to a container registry (e.g., Docker Hub, AWS ECR, GitHub Container Registry).
  - Deployment to staging/production environments (details depend on the hosting platform and deployment strategy, e.g., updating Kubernetes deployments).

### 3.4. Monitoring and Observability Setup

- **Logging:** Structured logging (e.g., JSON format) is implemented in services using `structlog`. Logs would typically be aggregated in a central logging platform (e.g., ELK stack, Grafana Loki, Datadog).
- **Metrics:**
  - Services expose a `/metrics` endpoint for Prometheus scraping (using `starlette-prometheus`).
  - Metrics would be collected by Prometheus and visualized in Grafana.
- **Tracing:**
  - OpenTelemetry is integrated into services (`opentelemetry-instrumentation-fastapi`).
  - Traces are exported to a tracing backend like Jaeger (configured via `JAEGER_ENDPOINT` or `OTEL_EXPORTER_OTLP_ENDPOINT`).
  - This allows tracing requests across multiple microservices.

## 4. Security Implementation

### 4.1. Security Measures in Place

- **Authentication:** JWT-based authentication (access and refresh tokens). Refresh tokens are stored securely (e.g., in `auth-service` DB) and access tokens are short-lived. HTTPOnly cookies are used for web clients.
- **Authorization:**
  - API Gateway can perform initial JWT validation.
  - Individual services perform fine-grained authorization based on user roles (e.g., admin access in `auth-service`, ownership checks in `genealogy-service` and `storage-service`).
- **MFA:** TOTP-based Multi-Factor Authentication available in `auth-service`.
- **Input Validation:** Pydantic is used extensively in all FastAPI services for request data validation, preventing many common injection-style vulnerabilities.
- **Password Security:** Passwords are hashed using bcrypt (`passlib` in `auth-service`).
- **Secrets Management:** Sensitive configurations (DB passwords, API keys, JWT secrets) are loaded from files (Docker secrets pattern) and not hardcoded or stored in version control.
- **HTTPS:** Assumed for all external communication in production (managed by load balancers/reverse proxies like Traefik or Nginx in front of the API Gateway).
- **CORS:** Configured at the API Gateway and individual services to restrict cross-origin requests.
- **Security Headers:** API Gateway adds common security headers (X-Content-Type-Options, X-Frame-Options, etc.).
- **Rate Limiting:** Implemented at the API Gateway to prevent abuse.
- **Container Security:** Services run in isolated Docker containers. Regular updates to base images and dependencies are important.

### 4.2. Data Protection Strategies

- **Data at Rest:**
  - Sensitive user data in PostgreSQL (e.g., password hashes) is protected by database security.
  - Files in S3 can be encrypted using S3 server-side encryption (SSE-S3 or SSE-KMS).
  - Database encryption at rest provided by managed database services or disk encryption for self-hosted instances.
- **Data in Transit:** HTTPS for all external communication. Internal service-to-service communication can also be over TLS if network policies require.
- **Privacy Controls:**
  - `genealogy-service` `FamilyTree` model has `privacy` settings (public, private). `Person` model has `privacy_settings`.
  - `storage-service` `FileRecord` model has `privacy` settings.
  - These allow users to control the visibility of their data.
- **Audit Logs:** `auth-service` maintains audit logs for significant security-related events (login, password change, MFA changes).

### 4.3. Access Control Mechanisms

- **Role-Based Access Control (RBAC):**
  - `auth-service` defines user roles (USER, ADMIN, MODERATOR).
  - Admin-specific endpoints in `auth-service` are protected to allow access only to users with the ADMIN role.
- **Ownership-Based Access Control:**
  - `genealogy-service`: Access to family trees and persons is often based on `owner_id`.
  - `storage-service`: File operations are scoped to the authenticated `user_id`.
- **Collaboration Controls (Genealogy Service - Foundational):**
  - The `FamilyTree` model includes a `collaborators` list with roles (`Viewer`, `Editor`, `Admin`), providing a basis for shared access, though full API implementation for managing these needs verification.
- **API Gateway Authentication:** Acts as a primary gatekeeper, ensuring only authenticated requests (for protected routes) reach backend services.

## 5. Design Decisions

### 5.1. Key Architectural Choices and Rationale

- **Microservices over Monolith:**
  - **Rationale:** Improved scalability, independent deployments, technology diversity (though currently Python-centric for backend), fault isolation, better team organization around services. Addresses complexity of a feature-rich platform.
- **Python/FastAPI for Backend Services:**
  - **Rationale:** Performance (async), developer productivity, type safety with Pydantic, automatic API docs, rich ecosystem for future AI/ML features. Migration from Node.js aimed to leverage these.
- **Polyglot Persistence (PostgreSQL, MongoDB, Redis, Elasticsearch, S3):**
  - **Rationale:** Choosing the best data store for the specific needs of each service:
    - PostgreSQL for relational user auth data.
    - MongoDB for flexible, document-oriented genealogical and file metadata.
    - Redis for caching and message brokering.
    - Elasticsearch for powerful search.
    - S3 for scalable object storage.
- **API Gateway Pattern:**
  - **Rationale:** Single entry point, centralized cross-cutting concerns (auth, rate limiting, CORS), simplified client interaction, abstraction of internal service topology.
- **Asynchronous Operations:**
  - **Rationale:** Use of `async/await` in FastAPI services and async database drivers (Motor, asyncpg, `elasticsearch-py` async) for improved I/O-bound performance and concurrency. Celery for longer background tasks.
- **Docker for Containerization:**
  - **Rationale:** Consistency across environments, ease of deployment, isolation.

### 5.2. Trade-offs and Alternatives Considered

- **Monolith vs. Microservices:** Monolith might have been simpler initially but harder to scale and maintain long-term. Microservices add operational complexity but offer better long-term agility.
- **Database Choices:**
  - Using a single database type (e.g., only PostgreSQL with JSONB) was an alternative but might not optimize for all data types (e.g., search, large unstructured documents).
  - Graph database for genealogy data: Considered (implied by nature of data), but MongoDB offers sufficient flexibility for tree structures with potential for graph-like queries if needed, or future integration with a dedicated graph DB.
- **API Gateway Implementation:** Using a managed cloud gateway (e.g., AWS API Gateway) or a dedicated gateway product (Kong, Traefik) vs. custom FastAPI gateway. Custom gateway offers more control and Python ecosystem integration but requires more maintenance.
- **Real-time Collaboration:** Current model seems based on standard REST APIs. For true real-time collaboration (e.g., multiple users editing a tree simultaneously seeing live updates), WebSockets or similar technologies would be needed, adding complexity. This doesn't seem to be the current implementation focus.

### 5.3. Future Scalability Considerations

- **Stateless Services:** Backend services are designed to be mostly stateless, allowing for horizontal scaling by running multiple instances behind a load balancer.
- **Database Scaling:**
  - PostgreSQL: Read replicas, connection pooling, potential for sharding if extremely high write load.
  - MongoDB: Replica sets for high availability, sharding for horizontal scaling.
  - Elasticsearch: Scalable by adding nodes to the cluster.
  - Redis: Cluster mode for scalability.
- **Asynchronous Task Processing:** Celery allows scaling worker nodes independently to handle fluctuating loads of background tasks.
- **Caching:** Redis can be used more extensively for caching frequently accessed data to reduce database load.
- **CDN for Frontend & Static Assets:** Using a Content Delivery Network to serve the frontend application and static assets (e.g., images from S3 if made public) can improve performance and reduce load on origin servers.
- **Event-Driven Architecture:** For more complex inter-service communication and decoupling, an event bus (e.g., Kafka, RabbitMQ) could be introduced, though current communication appears to be primarily synchronous API calls via the gateway or direct for internal tasks.
