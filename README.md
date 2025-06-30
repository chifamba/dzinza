# Dzinza Genealogy Platform

An open-source, interactive genealogy platform for building family trees, discovering relatives, and exploring ancestral history. This platform provides tools for media management, storytelling, collaboration, and robust search capabilities.

**Documentation Structure:**

- **/docs**: Project documentation (overview, environment, architecture, API references).
- _(Other specific documentation links can be added here as they are updated)_

For a full table of contents and access to all documentation, see the main [Project Documentation Hub (docs/docs.md)](docs/docs.md).

**Project Status: Backend Migrated to Python/FastAPI**
The Dzinza platform's backend has been successfully migrated from Node.js to a modern Python 3.11+ stack, primarily using FastAPI for its microservices. This migration enhances performance, scalability, and maintainability. The React/Tailwind CSS frontend remains and now interacts with these new Python backend services.

## 🌟 Features

- **Interactive Family Trees**: Build and visualize comprehensive family trees with advanced relationship mapping
- **DNA Analysis**: Upload and analyze DNA data from major testing companies (23andMe, AncestryDNA, MyHeritage)
- **AI-Powered Research**: Intelligent suggestions for family connections and historical record matching
- **Photo Management**: Advanced photo organization with facial recognition and automatic tagging
- **Collaboration Tools**: Share trees and research with family members in real-time
- **Historical Records**: Access to extensive historical databases and records
- **Privacy Controls**: Granular privacy settings to protect living relatives
- **Mobile Apps**: Full-featured iOS and Android applications (Planned)

## 🚀 Quick Start

1.  **Prerequisites**: Ensure Docker and Docker Compose are installed.
2.  **Clone the Repository**: `git clone https://github.com/dzinza/dzinza.git`
3.  **Navigate to Project**: `cd dzinza`
4.  **Environment Setup**:
    *   Copy the root `.env.example` to `.env` and customize Docker Compose variables (ports, common DB user/pass if not using secrets, etc.).
    *   Populate the `./secrets/` directory with actual secret files as listed in `docker-compose.yml` (e.g., `db_password.txt`, `jwt_secret.txt`). Refer to `.secrets.baseline` for a list of required secret files.
    *   Individual Python services load their specific settings via Pydantic-Settings, which can also utilize `.env` files within their service directories if needed for local overrides during development (though Docker Compose environment variables and secrets are primary for containerized setup).
5.  **Build & Start Services**: `docker-compose up -d --build` (use `--build` for the first time or after code changes).
6.  **Access Frontend**: Open your browser and go to `http://localhost:8080` (or `http://dzinza.local` if you have set up local DNS and Traefik is configured accordingly in your Docker Compose setup for local development).
7.  **API Documentation**: Each Python backend service (auth, genealogy, storage, search) exposes its OpenAPI documentation at `/api/v1/openapi.json` and interactive Swagger UI at `/api/v1/docs`. The API Gateway (`backend-service`) proxies requests to these services under `/api/v1/<service-prefix>/...`.
8.  **Explore the Project Documentation**: For comprehensive information, start with our main [Project Documentation Hub (docs/docs.md)](docs/docs.md).

## � Default Credentials

For development and testing, the following default users are automatically created:

### Admin User

- **Email**: `admin@dzinza.org`
- **Password**: `AdminPassword123!`
- **Role**: Administrator with full system access

### Test User

- **Email**: `test@dzinza.com`
- **Password**: `TestPassword123!`
- **Role**: Regular user for testing user-level functionality

⚠️ **Security Notice**: Change these default passwords immediately in production environments. These credentials are only for development and testing purposes.

## �📚 Documentation

All project documentation is centralized in [**docs/docs.md**](docs/docs.md). This comprehensive document includes:

- **User Guides**: User Manual, Quick Start, Installation.
- **Developer Documentation**: System Architecture (reflecting Python microservices), Development Guidelines (Python/FastAPI focused), Testing Strategy (Pytest for backend, Vitest for frontend), Contributing Guide.
- **Operational Guides**: Deployment (Python microservices with Docker Compose), Infrastructure, Monitoring, Admin Guide.
- **Project Information**: Project Overview (updated for Python migration), API Documentation (links to individual service OpenAPI specs), Database Schemas (PostgreSQL & MongoDB for Python services), Code of Conduct.

Key documents and sections to highlight:

- [Project Documentation Hub (docs/docs.md)](docs/docs.md) - Your central starting point for all documentation.
  - **API Documentation**: Each Python service (Auth, Genealogy, Storage, Search) provides its OpenAPI specification at `/api/v1/openapi.json` and interactive Swagger UI at `/api/v1/docs`. These are accessible via the API Gateway (e.g., `http://localhost:3001/api/v1/auth/docs`). The legacy `api-swagger.yaml` in the `docs` folder is now outdated.
  - [Development Guidelines (Python Backend)](docs/docs.md#development-guidelines) - _To be updated for Python focus._
  - [System Architecture Overview](docs/docs.md#system-architecture-overview) - _To be updated to reflect Python microservices._
  - [Contributing Guide](docs/docs.md#contributing-guide)
- The [Backend Migration Roadmap (ROADMAP.md)](docs/markdown/legacy/ROADMAP.md) is now primarily for historical reference as the migration is complete.

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Python 3.11+, FastAPI, Pydantic.
    - **Databases**: PostgreSQL (SQLAlchemy, asyncpg), MongoDB (Motor).
    - **Caching/Broker**: Redis (`redis-py`).
    - **Task Queues**: Celery.
    - **Testing**: Pytest.
    - **HTTP Client**: `httpx`.
    - **Linting/Formatting**: Ruff.
    - _(The previous Node.js/Express backend has been fully migrated)._
- **Databases (Primary)**: PostgreSQL, MongoDB, Redis, Elasticsearch.
- **DNA Analysis (Planned)**: Python, scikit-learn, Biopython.
- **Infrastructure**: Docker, Docker Compose. Kubernetes (Planned for production), AWS (Target cloud).
- **CI/CD**: GitHub Actions (updated for Python backend: linting, testing, Docker builds).

## 🏗️ Project Status

The backend services for the Dzinza platform have been successfully migrated to Python 3.11+ using the FastAPI framework. This includes the Auth, Genealogy, Storage, Search, and API Gateway services. The frontend (React) remains and now communicates with these new Python APIs.

### Current Focus

- **Service Hardening & Testing**: Enhancing test coverage (unit, integration, e2e) for all Python backend services.
- **Feature Parity Refinement**: Ensuring all functionalities from the previous Node.js backend are fully operational and optimized in the Python versions.
- **Documentation Finalization**: Completing updates to all project documentation to reflect the new Python-based architecture.
- **Performance Optimization**: Identifying and addressing any performance bottlenecks in the new services.
- **Preparing for Next Development Cycle**: Planning new features and enhancements on top of the new Python backend.

The original [Backend Migration Roadmap (ROADMAP.md)](docs/markdown/legacy/ROADMAP.md) can be consulted for historical context, but the primary migration effort is complete.

## 🤝 Contributing

We warmly welcome contributions to the Dzinza platform! With the Python backend migration largely complete, focus areas for contributions include:

- Enhancing existing Python backend services (FastAPI).
- Developing new features on the Python stack.
- Improving frontend integration with the Python APIs.
- Expanding test coverage (Pytest for backend, Vitest for frontend).
- Updating and improving documentation.

Please read our [Contributing Guide (within docs/docs.md#contributing-guide)](docs/docs.md#contributing-guide) and [Code of Conduct (within docs/docs.md#code-of-conduct)](docs/docs.md#code-of-conduct) before getting started.

### Ways to Contribute

- 🐛 Report bugs and issues (especially related to the new Python services or frontend integration).
- 💡 Suggest new features (aligning with the Python migration and overall project vision).
- 📝 Improve documentation in [docs/docs.md](docs/docs.md) (updates related to the Python backend, new services, and architectural changes are highly encouraged).
- 🔧 Submit code improvements (Python backend services, frontend adaptation to new APIs, shared libraries).
- 🧪 Help with testing the new Python services and their integration with the frontend.

## 🧪 Testing

The project uses Vitest for frontend testing. For more information on the test setup, see:

- [VITEST_MIGRATION.md](frontend/VITEST_MIGRATION.md) - Detailed migration guide from Jest to Vitest
- [VITEST_MIGRATION_SUMMARY.md](frontend/VITEST_MIGRATION_SUMMARY.md) - Quick summary of the migration status

### Running Tests

**Frontend (Vitest):**
```bash
# Navigate to frontend directory
cd frontend

# Run all tests
npm test # Or specific Vitest command if configured e.g., npm run test:vitest

# Run tests in watch mode
npm run test:watch # Or specific Vitest command

# Run tests with coverage
npm run test:coverage # Or specific Vitest command
```

**Backend (Pytest):**
For each Python backend service (e.g., `auth-service`, `genealogy-service`):
```bash
# Navigate to the service directory
cd <service-name> # e.g., cd auth-service

# Ensure Python virtual environment is active and dev dependencies (pytest) are installed
# (Typically managed by poetry or pip install -r requirements-dev.txt if you have one)

# Run pytest
pytest
```
The CI/CD pipeline (`.github/workflows/dzinza.yml`) is configured to run Pytest for all Python services.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check our comprehensive [documentation](docs/) and the [Backend Migration Roadmap](docs/markdown/legacy/ROADMAP.md).
- **Issues**: Report bugs or request features via [GitHub Issues](https://github.com/dzinza/dzinza/issues)
- **Community**: Join our discussions in [GitHub Discussions](https://github.com/dzinza/dzinza/discussions)
- **Email**: Contact us at support@dzinza.com (Please note response times may vary)

## 🙏 Acknowledgments

- Genealogy research community for inspiration and requirements
- Open source tools and libraries that made this project possible
- All contributors and early adopters of the platform

---

**Built with ❤️ for family history researchers worldwide**
