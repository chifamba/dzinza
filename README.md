# Dzinza - Project Overview & Getting Started

## 1. Project Overview

Dzinza is an open-source, interactive genealogy platform designed to help users build their family trees, discover relatives, explore ancestral history, manage multimedia memories, and collaborate with family members.

The platform has recently undergone a significant architectural upgrade, with its backend services migrated to a modern Python (FastAPI) stack, enhancing performance, scalability, and maintainability. The frontend remains a React/TypeScript application.

### 1.1. Key Features & Capabilities

The Dzinza platform aims to provide a comprehensive suite of tools for genealogical research and family history preservation, including:

- **User Authentication & Authorization:** Secure user registration, login, multi-factor authentication (MFA), password management, and user profile management.
- **Family Tree Management:**
  - Creation, visualization, and modification of family trees.
  - Adding individuals, defining relationships (parents, spouses, children).
  - GEDCOM import/export capabilities.
- **Media Management:** Uploading, viewing, and managing photos, documents, and other media associated with individuals or families. Support for thumbnail generation.
- **Events & Life Facts:** Recording significant life events (birth, death, marriage, etc.) and associating them with individuals.
- **Collaboration & Sharing:** Mechanisms for users to share trees and collaborate (details on full collaboration features like specific roles and commenting TBD or part of ongoing development).
- **Search & Discovery:** Comprehensive search functionality across platform data (persons, family trees, events).
- **Admin Functionalities:** Basic user management capabilities for administrators.
- **Robust Backend & Infrastructure:** A microservices architecture built with Python (FastAPI), utilizing PostgreSQL and MongoDB for data storage, Redis for caching/task brokering, and Elasticsearch for search. Services are containerized using Docker.

_(For a detailed list of all originally planned features, please refer to historical project documentation like `JULES_TASKS.md` in the legacy docs section of the repository.)_

### 1.2. Target Audience

- Individuals interested in researching their family history.
- Families looking to collaboratively build and preserve their lineage.
- Genealogy enthusiasts and researchers.
- The platform has a particular focus on features relevant to diverse cultural contexts, including those of African lineage (as outlined in product planning documents).

### 1.3. High-Level Architecture

The Dzinza platform utilizes a microservices architecture:

- **Frontend:** A React (TypeScript, Vite, Tailwind CSS) single-page application that interacts with the backend via the API Gateway.
- **API Gateway (`backend-service`):** A Python (FastAPI) service that acts as the single entry point for all client requests. It handles request routing to appropriate downstream microservices, authentication, rate limiting, and other cross-cutting concerns.
- **Authentication Service (`auth-service`):** Python (FastAPI) service responsible for user registration, login, JWT issuance, MFA, password management, and user profiles. Uses PostgreSQL.
- **Genealogy Service (`genealogy-service`):** Python (FastAPI) service that manages core genealogical data including family trees, persons, relationships, and events. Uses MongoDB. It also handles GEDCOM processing and duplicate detection tasks via Celery.
- **Storage Service (`storage-service`):** Python (FastAPI) service for managing file uploads (e.g., photos, documents) to S3-compatible storage. It handles metadata storage (in MongoDB), image processing (e.g., thumbnails), and file cleanup.
- **Search Service (`search-service`):** Python (FastAPI) service that provides search capabilities across platform data by querying Elasticsearch. It also logs search analytics.
- **Databases:**
  - **PostgreSQL:** Used by the Authentication Service.
  - **MongoDB:** Used by the Genealogy Service, Storage Service (for metadata), and Search Service (for analytics).
  - **Redis:** Used by the Authentication Service (e.g., for rate limiting, session info) and as a message broker for Celery tasks in the Genealogy Service.
  - **Elasticsearch:** Powers the Search Service.
- **Infrastructure:** Services are containerized using Docker and orchestrated locally with Docker Compose.

_(A more detailed architecture description can be found in `/docs/ARCHITECTURE.md`)_

## 2. Quick Start Guide

This guide provides instructions for setting up and running the Dzinza platform for local development.

### 2.1. Prerequisites & System Requirements

- **Docker:** Latest stable version.
- **Docker Compose:** Latest stable version (usually included with Docker Desktop).
- **Git:** For cloning the repository.
- **Web Browser:** Chrome, Firefox, Safari, or Edge (latest versions).
- **Operating System:** macOS, Windows (with WSL2 recommended), or Linux.
- Sufficient RAM (16GB+ recommended for running all services) and disk space.

### 2.2. Installation Instructions (Local Development)

1.  **Clone the Repository:**

    ```bash
    git clone <repository-url>
    cd dzinza
    ```

2.  **Environment Setup:**
    The project uses a combination of a root `.env` file for Docker Compose and a `./secrets/` directory for sensitive information.

    - **Root `.env` file:**
      Copy the `.env.example` file at the project root to `.env`:

      ```bash
      cp .env.example .env
      ```

      Review and customize variables in this `.env` file. It typically defines external ports, common user/database names (if not using secrets for everything), global debug flags, and other Docker Compose specific variables.

    - **Secrets Directory (`./secrets/`):**
      All sensitive information (database passwords, API keys, JWT secrets) must be stored as individual plain text files within the `./secrets/` directory.

      - Refer to the `.secrets.baseline` file for a list of all required secret files.
      - Create each required file in the `./secrets/` directory and populate it with the appropriate secret value. For example:
        - `./secrets/db_password.txt` (containing the PostgreSQL password)
        - `./secrets/jwt_secret.txt` (containing the JWT secret for the auth service)
        - `./secrets/mongodb_password.txt` (if your MongoDB requires auth)
        - etc.
      - **Important:** The files in the `./secrets/` directory **MUST NOT** be committed to version control. Ensure `.secrets/` is listed in your `.gitignore` file.

    - **Service-Specific `.env` files (Optional for local overrides):**
      Individual Python services can also utilize their own `.env` files (e.g., `auth-service/.env`) for local development overrides when running outside Docker. However, for Dockerized setup, the Docker Compose environment variables and secrets are primary.

    _(Refer to `/docs/ARCHITECTURE.md` or `docs/ENVIRONMENT_CONFIGURATION.md` (legacy) for more detailed environment configuration information.)_

### 2.3. Configuration Setup

- Ensure all necessary values in the root `.env` file are correct for your local environment (e.g., `GATEWAY_PORT`, `DB_PORT` if you need to change defaults).
- Ensure all required secret files are present and populated in the `./secrets/` directory as per `docker-compose.yml` and individual service configurations.

### 2.4. How to Run the Application

1.  **Build and Start Services:**
    From the project root directory, run:

    ```bash
    docker-compose up -d --build
    ```

    - Use `--build` the first time or after making changes to Dockerfiles or service dependencies.
    - The `-d` flag runs the containers in detached mode.

2.  **Access Frontend:**
    Once all services are running, open your web browser and navigate to:
    `http://localhost:8080` (or the port configured for `FRONTEND_PORT` in your root `.env` file if you changed it from the default).

3.  **Access API Documentation (Swagger/OpenAPI):**
    Each Python backend service exposes its own OpenAPI documentation:

    - **API Gateway:** Typically does not expose its own consolidated OpenAPI spec. Downstream service APIs are accessed via the gateway.
    - **Auth Service:** `http://localhost:<GATEWAY_PORT>/api/v1/auth/docs` (e.g., `http://localhost:3001/api/v1/auth/docs`)
    - **Genealogy Service:** The `genealogy-service` OpenAPI docs are available at `http://localhost:<GATEWAY_PORT>/api/v1/genealogy/docs` (or a similar path depending on gateway configuration). Developers working directly on the service might also access it via its direct port (e.g., `http://localhost:8004/api/v1/docs`).
    - **Storage Service:** `http://localhost:<GATEWAY_PORT>/api/v1/files/docs`
    - **Search Service:** `http://localhost:<GATEWAY_PORT>/api/v1/search/docs`
      _(Replace `<GATEWAY_PORT>` with the actual port your API Gateway is running on, typically 3001 as per the default `.env.example`. Individual service direct ports like `8004` are examples and may vary.)_

4.  **Stopping the Application:**
    To stop all running services:
    ```bash
    docker-compose down
    ```
    To stop and remove volumes (useful for a clean restart, **will delete database data**):
    ```bash
    docker-compose down -v
    ```

### 2.5. Basic Usage Examples

- **Registration:** Navigate to the frontend and find the "Register" or "Sign Up" option.
- **Login:** Use the "Login" or "Sign In" option with your registered credentials.
  - Default admin user (typically seeded during development): `admin@dzinza.org` / `AdminPassword123!`
  - Default test user (typically seeded during development): `test@dzinza.com` / `TestPassword123!`
- **Creating a Family Tree:** Once logged in, explore the dashboard or navigation to find options for creating a new family tree.
- **Adding Persons:** Within a family tree, you should find options to add individuals and define their relationships.

## 3. Project Structure

The Dzinza platform is organized as a monorepo with the following key directories:

- **`/auth-service/`**: Python (FastAPI) microservice for authentication and user management.
- **`/backend-service/`**: Python (FastAPI) microservice acting as the API Gateway.
- **`/database/`**: Contains database initialization scripts (e.g., SQL for PostgreSQL).
- **`/docs/`**: Project documentation (this document, architecture, API reference).
  - **`/docs/openapi/`**: Contains OpenAPI specification files.
- **`/frontend/`**: React/TypeScript frontend application.
- **`/genealogy-service/`**: Python (FastAPI) microservice for core genealogy data management.
- **`/search-service/`**: Python (FastAPI) microservice for search functionalities using Elasticsearch.
- **`/storage-service/`**: Python (FastAPI) microservice for file storage and media management.
- **`/scripts/`**: Utility scripts for development, deployment, or operational tasks.
- **`/secrets/`**: (Git-ignored) Directory for storing sensitive configuration files.
- **`docker-compose.yml`**: Defines all services, networks, and volumes for local development.
- **`.env.example`**: Template for the root environment file used by Docker Compose.
- **`README.md` (root)**: Top-level project README, often a condensed version of this document.

Each service directory (e.g., `auth-service/`, `frontend/`) typically contains its own source code (`app/` or `src/`), Dockerfile, requirements/dependencies, and tests.

## 4. Contributing Guidelines

We welcome contributions to the Dzinza platform! Please follow these general guidelines:

### 4.1. Development Workflow

1.  **Fork the repository** (if you are an external contributor) or create a new branch from `main` or `develop` (if you are a core team member).
    - Branch naming convention: `feature/<feature-name>`, `bugfix/<issue-id>-<description>`, `chore/<task-description>`.
2.  **Set up your local development environment** as described in the "Quick Start Guide."
3.  **Implement your changes.** Adhere to coding standards and project conventions.
4.  **Write tests** for your changes (unit, integration, and/or E2E tests). Ensure all tests pass.
5.  **Lint your code.** (Specific linters and formatters like Ruff/Black for Python, ESLint/Prettier for Frontend will be defined).
6.  **Commit your changes** with clear and descriptive commit messages. Follow conventional commit formats if adopted by the project.
7.  **Push your branch** to your fork or the main repository.
8.  **Create a Pull Request (PR)** against the `main` or `develop` branch.
    - Provide a clear description of the changes in your PR.
    - Link to any relevant issues.
    - Ensure CI checks pass on your PR.
9.  **Participate in the code review process.** Address feedback and make necessary revisions.
10. Once approved and merged, your changes will be part of the project!

### 4.2. Code Standards and Conventions

- **Python (Backend):**
  - Follow PEP 8 guidelines.
  - Use modern Python features (Python 3.11+).
  - Type hinting is mandatory.
  - Structure code logically within services (e.g., separate files for models, schemas, CRUD operations, API endpoints).
  - Write clear and concise comments where necessary.
  - (Project may specify use of formatters like Black and linters like Ruff/Flake8).
- **TypeScript/React (Frontend):**
  - Follow standard TypeScript and React best practices.
  - Maintain a clean component structure.
  - Use defined state management solutions consistently.
  - (Project may specify use of ESLint and Prettier).
- **General:**
  - Write modular and reusable code.
  - Prioritize security and data privacy.
  - Aim for clarity and maintainability.

### 4.3. Testing Requirements

- **Backend:**
  - Unit tests for business logic, CRUD operations, and utility functions (e.g., using Pytest).
  - Integration tests for API endpoints (e.g., using FastAPI's `TestClient`).
  - Aim for good test coverage.
- **Frontend:**
  - Unit tests for components and utility functions (e.g., using Vitest/Jest and React Testing Library).
  - Integration tests for user flows.
  - End-to-end tests for critical user paths (e.g., using Cypress or Playwright).
- All new features should be accompanied by relevant tests.
- Bug fixes should include regression tests.

### 4.4. Pull Request Process

1.  Ensure your branch is up-to-date with the target branch (`main` or `develop`) before submitting a PR.
2.  Provide a detailed description of the changes, the problem being solved, and how to test.
3.  Assign reviewers as per project guidelines.
4.  Respond to comments and feedback promptly and constructively.
5.  Ensure all automated checks (CI builds, tests, linters) pass.
6.  Do not merge your own PR unless explicitly permitted by project maintainers.

_(For more specific guidelines, refer to any `CONTRIBUTING.md` file that might be present in the repository or specific instructions from project maintainers.)_

## Version-Agnostic Routing via API Gateway

The API Gateway automatically supports versioned API paths (e.g., `/v1/auth/login`, `/v2/auth/login`). Requests are routed to the correct downstream service by skipping the version segment (such as `v1`, `v2`) and using the next segment (e.g., `auth`, `genealogy`, etc.) as the service prefix. This ensures future compatibility as new API versions are introduced, without requiring changes to the service mapping configuration.

- Example: `/v1/auth/login` and `/v2/auth/login` are both routed to the Authentication Service.
- Example: `/v1/genealogy/persons` and `/v2/genealogy/persons` are both routed to the Genealogy Service.

This logic is implemented in the API Gateway's reverse proxy (`backend-service/app/services/proxy.py`).
