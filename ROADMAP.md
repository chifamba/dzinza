# Dzinza Platform - Python Backend Implementation Roadmap

**Objective:** To re-implement the backend services for the Dzinza platform using Python 3.11, while ensuring the existing frontend (React/Tailwind CSS, inspired by MyHeritage.com) can seamlessly integrate with these new services. The frontend's UI design and user experience should remain consistent.

**Guiding Principles:**

- **UI/UX Consistency:** The frontend's look, feel, and user interaction patterns, based on MyHeritage.com, will be preserved. Changes to the frontend will primarily involve adapting API calls to the new Python backend.
- **Python 3.11 Backend:** All new backend microservices will be developed using Python 3.11.
- **Microservices Architecture:** The existing microservices architecture will be maintained and implemented in Python. FastAPI is recommended as the primary web framework for its performance, async capabilities, and automatic data validation/serialization with Pydantic.
- **Database Integrity:** Existing database schemas (PostgreSQL and MongoDB) outlined in `PLAN.md` will be adhered to or adapted for the Python services. SQLAlchemy (async with `asyncpg`) for PostgreSQL and Pymongo (async with `motor`) for MongoDB are recommended.
- **API First Design:** Services will expose well-defined RESTful APIs. OpenAPI/Swagger documentation will be automatically generated (a feature of FastAPI).
- **Containerization:** All Python services will be containerized using Docker, and `docker-compose.yml` will be updated accordingly.
- **Testability:** Each service must have comprehensive unit and integration tests. Pytest is recommended.
- **Iterative Development:** The migration will occur servicio-by-service or feature-by-feature to allow for incremental testing and frontend adaptation.

---

## Phase 0: Project Setup & Python Foundation

**Objective:** Establish the foundational elements for Python microservice development.

1.  **Development Environment:**

    - Ensure Python 3.11 is available.
    - Recommend Poetry for dependency management and virtual environments for each Python service.
    - Standardize project structure for Python services (e.g., `service_name_py/app/...`).

2.  **Core Python Libraries & Frameworks:**

    - **Web Framework:** FastAPI.
    - **Data Validation/Serialization:** Pydantic (comes with FastAPI).
    - **Database ORM/Drivers:**
      - PostgreSQL: SQLAlchemy (async version) with `asyncpg` driver.
      - MongoDB: Motor (async Pymongo driver).
      - Redis: `redis-py` (async version).
    - **Testing:** Pytest, `httpx` for async HTTP requests in tests.
    - **Linting/Formatting:** Black, Flake8, isort.

3.  **Shared Python Library (`dzinza-shared-py`):**

    - Create a common internal library for shared utilities:
      - Logger configuration.
      - Database connection handlers (singleton patterns or dependency injection).
      - Common Pydantic models (e.g., for error responses, user identity).
      - Authentication utilities (e.g., JWT decoding, password hashing helpers).
    - This library can be included as a local path dependency using Poetry.

4.  **Docker & Docker Compose Update:**

    - Create base Dockerfile for Python/FastAPI services.
    - Plan for updating `docker-compose.yml` to progressively replace Node.js services with their Python counterparts. Each new Python service will get its own entry.

5.  **CI/CD Pipeline for Python:**
    - Set up basic CI/CD steps for Python services: linting, testing, building Docker images.

---

## Phase 1: Core Authentication & User Management (Python)

**Objective:** Re-implement the authentication and user profile management services in Python.

### 1.1. Auth Service (`auth-service-py`)

- **Responsibilities:**
  - User registration (email/password).
  - User login, issuing JWTs.
  - Password hashing (bcrypt) and verification.
  - JWT validation (potentially also handled by API Gateway or shared middleware).
  - (Future) Password reset, email verification, OAuth integration.
- **Key Technologies:** FastAPI, Pydantic, SQLAlchemy, `passlib` with bcrypt for hashing, `python-jose` for JWTs.
- **Database Schema (PostgreSQL - `users` table from `PLAN.md`):**
  - `id` (PK), `email` (unique), `hashed_password`, `full_name`, `created_at`, `updated_at`, `preferences`, etc.
- **Pydantic Models:**
  - `UserCreate` (email, password, full_name)
  - `UserLogin` (email, password)
  - `UserResponse` (id, email, full_name)
  - `Token` (access_token, token_type)
- **API Endpoints:**
  - `POST /api/auth/register`: Creates a new user.
  - `POST /api/auth/login`: Authenticates a user, returns JWT.
  - `POST /api/auth/refresh`: (Optional) Refreshes JWT.
  - `GET /api/auth/me`: (Requires Auth) Returns current user details based on token.
- **Testing:** Unit tests for registration, login logic, password hashing, JWT generation/validation. Integration tests with a test database.

### 1.2. User Profile Service (`user-profile-service-py`)

- **(Could be part of `auth-service-py` initially or a separate microservice if user profiles become complex)**
- **Responsibilities:**
  - Manage detailed user profile information (beyond basic auth fields).
  - Handle user preferences and settings.
- **Key Technologies:** FastAPI, Pydantic, SQLAlchemy.
- **Database Schema (PostgreSQL - extends `users` table or a related table):**
  - Fields for profile picture URL, bio, location, privacy settings, etc.
- **Pydantic Models:**
  - `UserProfileUpdate`
  - `UserProfileResponse`
- **API Endpoints:**
  - `GET /api/users/{user_id}`: Retrieves a user's public profile.
  - `PUT /api/users/me`: (Requires Auth) Updates authenticated user's profile.
- **Integration:** `auth-service-py` for user identity.

---

## Phase 2: API Gateway (Python or Reconfiguration)

**Objective:** Ensure a functional API Gateway that routes to the new Python services and handles cross-cutting concerns.

- **Option A: Python-based API Gateway (e.g., FastAPI application):**
  - **Responsibilities:**
    - Request routing to downstream Python microservices.
    - Authentication middleware (validating JWTs from `auth-service-py`).
    - Rate limiting.
    - Request/Response logging.
    - CORS handling.
    - Basic request transformation if needed.
  - **Key Technologies:** FastAPI, `httpx` for proxying requests, shared authentication utilities.
- **Option B: Utilize and Reconfigure Existing Gateway Solution (e.g., Traefik):**
  - If a language-agnostic gateway like Traefik is already partially set up (as hinted by `docker-compose.yml` labels for frontend), configure it to route to the new Python services.
  - Authentication might need to be handled by each service individually or via a dedicated auth proxy.
- **Decision Point:** Evaluate complexity vs. control. A FastAPI gateway offers more custom Python logic but requires more development. Traefik is configuration-driven.
- **Frontend Impact:** The `VITE_API_URL` in the frontend's `.env` will point to this new/reconfigured gateway.

---

## Phase 3: Genealogy Core Services (Python)

**Objective:** Re-implement services related to family trees, individuals, and relationships.

### 3.1. Genealogy Service (`genealogy-service-py`)

- **Responsibilities:**
  - Managing family trees (creation, metadata).
  - Managing individuals within family trees (CRUD operations).
  - Defining and managing relationships between individuals (parent-child, spouse, sibling).
- **Key Technologies:** FastAPI, Pydantic, SQLAlchemy.
- **Database Schema (PostgreSQL - `families`, `individuals`, `relationships` tables from `PLAN.md`):**
  - `families`: `id` (PK), `name`, `description`, `creator_user_id` (FK to `users`).
  - `individuals`: `id` (PK), `family_id` (FK to `families`), `first_name`, `last_name`, `birth_date`, `death_date`, `gender`, etc.
  - `relationships`: `id` (PK), `individual1_id` (FK to `individuals`), `individual2_id` (FK to `individuals`), `relationship_type` (e.g., 'parent_of', 'spouse_of').
- **Pydantic Models:**
  - `FamilyCreate`, `FamilyResponse`
  - `IndividualCreate`, `IndividualUpdate`, `IndividualResponse`
  - `RelationshipCreate`, `RelationshipResponse`
- **API Endpoints (examples):**
  - `POST /api/families`: Create a new family tree.
  - `GET /api/families/{family_id}`: Get family tree details.
  - `POST /api/families/{family_id}/individuals`: Add an individual to a family tree.
  - `GET /api/individuals/{individual_id}`: Get individual details.
  - `PUT /api/individuals/{individual_id}`: Update individual details.
  - `POST /api/relationships`: Define a relationship between two individuals.
  - `GET /api/individuals/{individual_id}/relatives`: Get relatives of an individual.
- **Integration:** `auth-service-py` for user authentication/authorization (e.g., only tree owner can modify).

---

## Phase 4: Data & Media Services (Python)

**Objective:** Re-implement services for handling historical records and media files.

### 4.1. Historical Records Service (`historical-records-service-py`)

- **Responsibilities:**
  - Storing and retrieving historical documents (birth certificates, census records, etc.).
  - Interfacing with MongoDB for record storage.
  - Providing search capabilities (potentially delegating to `search-service-py`).
- **Key Technologies:** FastAPI, Pydantic, Motor (async Pymongo).
- **Database Schema (MongoDB - `historical_records` collection from `PLAN.md`):**
  - Flexible schema: `record_type`, `date`, `location`, `text_content`, `image_url`, `metadata_fields`.
- **Pydantic Models:**
  - `HistoricalRecordCreate`, `HistoricalRecordResponse`
- **API Endpoints:**
  - `POST /api/records`: Add a new historical record.
  - `GET /api/records/{record_id}`: Get a specific record.
  - `GET /api/records/search`: Search records (parameters: type, date range, keywords).
- **Integration:** `search-service-py` for advanced search indexing.

### 4.2. Media Service (`media-service-py`)

- **Responsibilities:**
  - Handling uploads of photos, videos, and documents.
  - Storing file metadata (linking to files stored in S3 or other object storage).
  - Generating pre-signed URLs for secure uploads/downloads if using S3.
- **Key Technologies:** FastAPI, Pydantic, Motor, `boto3` (for S3 interaction, if applicable).
- **Database Schema (MongoDB - `media` collection from `PLAN.md`):**
  - `file_name`, `storage_path` (e.g., S3 key), `content_type`, `size`, `uploader_user_id`, `associated_individual_id` (FK to `individuals`).
- **Pydantic Models:**
  - `MediaUploadRequest`, `MediaResponse`
- **API Endpoints:**
  - `POST /api/media/upload`: Initiate file upload, returns pre-signed URL or handles direct upload.
  - `GET /api/media/{media_id}`: Get media metadata and access URL.
  - `GET /api/individuals/{individual_id}/media`: List media associated with an individual.
- **Integration:** `auth-service-py` for authorization. `genealogy-service-py` for linking media to individuals.

### 4.3. Search Service (`search-service-py`)

- **Responsibilities:**
  - Indexing data from PostgreSQL (e.g., individuals, families) and MongoDB (historical records) into Elasticsearch.
  - Providing a unified search API across different data types.
- **Key Technologies:** FastAPI, Pydantic, `elasticsearch-py` (async version).
- **Data Flow:** Consumes events or periodically polls other services/databases to update Elasticsearch index.
- **API Endpoints:**
  - `GET /api/search?q={query}`: Perform a global search.
- **Integration:** Listens to or polls `genealogy-service-py` and `historical-records-service-py` for data to index.

---

## Phase 5: Frontend Adaptation

**Objective:** Update the existing React frontend to consume the new Python backend APIs.

1.  **API Client Refactoring:**

    - Identify all `axios` or `fetch` calls in the frontend codebase.
    - Update API base URLs to point to the new Python API Gateway.
    - Modify request/response handling to match the Python API contracts (Pydantic models).
    - Ensure JWTs obtained from `auth-service-py` are correctly stored and sent in Authorization headers.

2.  **Component-Level Adaptation:**

    - For each feature/page, verify that data is fetched, displayed, and submitted correctly with the Python backend.
    - Pay close attention to data formats, error handling, and loading states.

3.  **Authentication Flow:**

    - Ensure login, registration, and authenticated routes work seamlessly with `auth-service-py`.

4.  **Testing:**
    - Conduct thorough end-to-end testing of all UI features with the new Python backend.
    - Use browser developer tools to inspect network requests and responses.

---

## Phase 6: Advanced Features (Python Backend)

**Objective:** Implement advanced features as outlined in `PLAN.md`, now with Python backend services.

- **DNA Matching & Analysis Service (Python):**
  - Complex algorithms, data processing pipelines.
  - Requires careful design of data storage and computation.
- **AI-Powered Photo Enhancement Service (Python):**
  - Integration with image processing libraries (e.g., OpenCV, Pillow) and potentially ML models.
- **Smart Matching Algorithm Service (Python):**
  - Develop and integrate the conceptual `findMatches` algorithm from `PLAN.md`.

_(These are major undertakings and will require their own detailed sub-plans.)_

---

## Phase 7: Testing, Security, Deployment & Monitoring (Python Stack)

**Objective:** Ensure the Python-based backend is robust, secure, and deployable.

1.  **Comprehensive Testing:**

    - Ensure high unit test coverage for all Python services.
    - Write integration tests for service-to-service communication and database interactions.
    - End-to-end tests covering critical user flows (frontend to Python backend).

2.  **Security Hardening:**

    - Regular dependency vulnerability scanning (e.g., `safety`, `pip-audit`).
    - Input validation (Pydantic helps significantly).
    - Output encoding.
    - Security headers (Helmet or similar in FastAPI).
    - Review authentication and authorization logic.
    - Rate limiting and protection against common web vulnerabilities (OWASP Top 10).

3.  **Deployment:**

    - Finalize Dockerfiles and `docker-compose.yml` for all Python services.
    - Update Kubernetes manifests (`k8s/` directory) if used for production.
    - Ensure environment variables are correctly configured for different environments (dev, staging, prod).

4.  **Monitoring & Logging:**
    - Integrate Python services with Prometheus and Grafana (as per existing setup).
      - FastAPI middleware for Prometheus metrics.
    - Ensure structured logging from all Python services for easier analysis.

---

## Cross-Cutting Concerns (Python Implementation)

- **Authentication & Authorization:**
  - Standardize JWT handling across services (either via gateway or shared library).
  - Implement role-based or permission-based access control where necessary.
- **Logging:**
  - Use Python's `logging` module, configured for structured output (e.g., JSON).
  - Include correlation IDs for tracing requests across services.
- **Error Handling:**
  - Consistent error response format across all Python APIs.
  - FastAPI exception handlers to convert custom exceptions to appropriate HTTP responses.
- **Configuration Management:**
  - Continue using environment variables (e.g., via `.env` files for local dev, injected in production). Pydantic can be used for settings management.
- **Asynchronous Programming:**
  - Leverage `async/await` in FastAPI and database clients for non-blocking I/O.

---

This roadmap provides a high-level plan. Each phase and service will require more granular task breakdown during implementation. The AI coding agent should refer to this roadmap, the existing `PLAN.md`, and the current codebase structure to proceed.
