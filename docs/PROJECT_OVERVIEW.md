# Project Overview: Dzinza Genealogy Platform

## 1. Introduction

The Dzinza Genealogy Platform is an open-source, interactive platform designed to help users build their family trees, discover relatives, explore ancestral history, manage multimedia memories, and collaborate with family members.

## 2. Vision

To provide a comprehensive, user-friendly, and feature-rich environment for individuals and families to engage with their genealogical research and preserve their heritage for future generations.

## 3. Core Features (Initial Implementation Phase)

The initial development phase focused on delivering the following core capabilities:

- **User Authentication & Authorization:** Secure registration, login, MFA, social logins, password management, and role-based access.
- **Family Tree Management:** Creation, visualization, and modification of family trees, including adding individuals, defining relationships (parents, spouses, children), and GEDCOM import/export.
- **User Profile Management:** Editable user profiles with avatar uploads and preference settings (notifications, privacy, theme).
- **Media Management:** Uploading, viewing, and managing photos, documents, and other media associated with individuals or families.
- **Stories & Events:** Creating and linking narrative stories or historical events to people in the family tree.
- **Collaboration & Sharing:** Inviting users to collaborate on family trees with varying permission levels.
- **Search & Discovery:** Comprehensive search functionality across the platform's data.
- **Admin Panel:** Tools for user management, site settings, and basic analytics.
- **Robust Backend & Infrastructure:** Microservices architecture, appropriate database choices (PostgreSQL, MongoDB, Redis), Elasticsearch for search, and containerization with Docker.
- **Observability:** Prometheus metrics and Jaeger distributed tracing integrated into backend services.
- **CI/CD Pipeline:** Automated workflows for testing, building, and deploying services.

## 4. Project Status & Backend Migration to Python

The Dzinza Genealogy Platform has undergone a significant architectural change: **the backend services have been migrated from their original Node.js implementation to Python 3.11+ using the FastAPI framework.** This strategic migration was undertaken to leverage Python's robust ecosystem for data handling, AI/ML capabilities (planned), and to improve overall backend performance, scalability, and maintainability.

**Key aspects of the migration:**
- All core backend services (Authentication, Genealogy Data Management, File Storage, Search, and the API Gateway) have been re-implemented in Python.
- The existing React/Tailwind CSS frontend has been preserved and now interacts with the new Python-based APIs.
- Data persistence layers (PostgreSQL, MongoDB, Redis, Elasticsearch) remain, with Python services now using appropriate async drivers (SQLAlchemy with asyncpg, Motor, redis-py, elasticsearch-py).
- Background tasks (e.g., duplicate person detection in genealogy) are now handled by Celery with a Redis broker.
- The CI/CD pipeline has been updated to build, lint, test, and create Docker images for the Python services.

**Current Status:**
- The primary migration of all backend services to Python is functionally complete.
- Node.js code for backend services has been removed from the repository (pending final verification by the `cleanup_node_artifacts.sh` script execution by the user).
- Ongoing work includes comprehensive testing of the new Python services, performance tuning, documentation updates, and refinement of feature parity with the original Node.js implementation.

The original project plan (detailed in `docs/markdown/legacy/JULES_TASKS.md` and related documents) described the development of the Node.js version. While the core features remain the goal, their backend implementation is now Python-based.

## 5. Technology Stack (Post-Migration)

-   **Frontend**: React 18+, TypeScript, Tailwind CSS, Vite.
-   **Backend**: Python 3.11+, FastAPI, Pydantic.
    -   **Authentication Service**: FastAPI, SQLAlchemy (PostgreSQL), Redis, JWT (python-jose), Passlib.
    -   **Genealogy Service**: FastAPI, Motor (MongoDB), Celery, Pydantic models for complex genealogical data.
    -   **Storage Service**: FastAPI, Boto3 (for S3-compatible storage), Motor (MongoDB for metadata), Pillow.
    -   **Search Service**: FastAPI, Elasticsearch-py (async), Pydantic. (MongoDB for analytics optional).
    -   **API Gateway (Backend Service)**: FastAPI, HTTPX for reverse proxying.
    -   **Common Python Libraries**: Structlog, OpenTelemetry, Pytest.
-   **Databases**: PostgreSQL, MongoDB, Redis, Elasticsearch.
-   **Infrastructure**: Docker, Docker Compose.
-   **CI/CD**: GitHub Actions (updated for Python and Node.js frontend).

## 6. Future Development

With the Python backend migration largely complete, future development will focus on:
-   Building out planned advanced features (DNA analysis, AI research suggestions, mobile apps) on the new Python stack.
-   Expanding test coverage and ensuring robustness of the Python services.
-   Optimizing performance and scalability.
-   Enhancing user-facing features on the existing React frontend.
-   Community-driven feature requests and improvements.

This document reflects the project's state after the backend migration to Python.
