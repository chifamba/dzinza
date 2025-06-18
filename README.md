# Dzinza Genealogy Platform

An open-source, interactive genealogy platform for building family trees, discovering relatives, and exploring ancestral history. This platform provides tools for media management, storytelling, collaboration, and robust search capabilities.

**Current Project Focus: Backend Re-implementation with Python/FastAPI** Dzinza is undergoing a significant upgrade, migrating its backend services from Node.js to Python 3.11 and FastAPI. This strategic move aims to enhance performance, scalability, and maintainability. The existing React/Tailwind CSS frontend will be preserved and adapted. For details, please see our [Backend Migration Roadmap](ROADMAP.md).

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
4.  **Environment Setup**: Copy `.env.example` to `.env` and fill in the necessary secrets.
5.  **Start Services**: `docker-compose up -d`
6.  **Access Frontend**: Open your browser and go to `http://localhost:8080` (or `http://dzinza.local` if you have set up local DNS).
7.  **Explore the Documentation**: For comprehensive information, start with our main [Project Documentation (docs/docs.md)](docs/docs.md).

## 📚 Documentation

All project documentation is centralized in [**docs/docs.md**](docs/docs.md). This comprehensive document includes:

- **User Guides**: User Manual, Quick Start, Installation.
- **Developer Documentation**: System Architecture, Development Guidelines (Python-focused), Testing Strategy, Contributing Guide.
- **Operational Guides**: Deployment (Python microservices), Infrastructure, Monitoring, Admin Guide.
- **Project Information**: Project Overview, API Documentation (legacy and new Python APIs), Database Schema, Code of Conduct.

Key documents and sections to highlight:

- [**Backend Migration Roadmap (ROADMAP.md)**](ROADMAP.md) - **Essential reading for understanding the current development phase and future direction.**
- [Project Documentation Hub (docs/docs.md)](docs/docs.md)
  - [API Documentation (docs/docs.md#api-documentation)](docs/docs.md#api-documentation) - _Note: API is evolving with Python backend migration._
  - [Development Guidelines (docs/docs.md#development-guidelines)](docs/docs.md#development-guidelines)
  - [System Architecture (docs/docs.md#system-architecture-overview)](docs/docs.md#system-architecture-overview)
  - [Contributing Guide (docs/docs.md#contributing-guide)](docs/docs.md#contributing-guide)

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend (New - Actively Developing)**: Python 3.11, FastAPI, Pydantic, SQLAlchemy (async with `asyncpg` for PostgreSQL), Motor (async for MongoDB), `redis-py` (async), Pytest, `httpx`, Poetry.
- **Backend (Legacy - Being Phased Out)**: Node.js, Express, TypeScript
- **Databases**: PostgreSQL, MongoDB, Redis, Elasticsearch
- **DNA Analysis (Planned)**: Python, scikit-learn, Biopython
- **Infrastructure**: Docker, Docker Compose, Kubernetes (Planned for production), AWS (Target cloud)
- **CI/CD**: GitHub Actions, automated testing and deployment

## 🏗️ Project Status

This project is **actively undergoing a significant backend migration from Node.js to Python (FastAPI)**. The frontend (React) will be preserved and adapted.

### Current Focus

- **Backend Migration**: Re-implementing backend services in Python 3.11 with FastAPI, as detailed in the [**Backend Migration Roadmap (ROADMAP.md)**](ROADMAP.md). This is the primary area for new development and contributions.
- **Frontend Adaptation**: Ensuring the React frontend integrates seamlessly with the new Python backend APIs.
- **Documentation Update**: Aligning all documentation (`docs/docs.md`, `README.md`) with the new Python-centric architecture and roadmap.

Refer to the [**Backend Migration Roadmap (ROADMAP.md)**](ROADMAP.md) for detailed progress and the phased approach.

## 🤝 Contributing

We warmly welcome contributions from the community! Given the ongoing backend migration, contributions aligning with the [**Backend Migration Roadmap (ROADMAP.md)**](ROADMAP.md) and the new Python stack are particularly valuable.

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

```bash
# Navigate to frontend directory
cd frontend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check our comprehensive [documentation](docs/) and the [Backend Migration Roadmap](ROADMAP.md).
- **Issues**: Report bugs or request features via [GitHub Issues](https://github.com/dzinza/dzinza/issues)
- **Community**: Join our discussions in [GitHub Discussions](https://github.com/dzinza/dzinza/discussions)
- **Email**: Contact us at support@dzinza.com (Please note response times may vary)

## 🙏 Acknowledgments

- Genealogy research community for inspiration and requirements
- Open source tools and libraries that made this project possible
- All contributors and early adopters of the platform

---

**Built with ❤️ for family history researchers worldwide**
