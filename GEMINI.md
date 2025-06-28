# Dzinza Genealogy Platform

This document provides a high-level overview of the Dzinza Genealogy Platform, including its architecture, technologies, and key operational commands.

## Architecture

The Dzinza platform is a microservices-based application. It consists of a frontend single-page application and several backend services, all containerized with Docker.

- **Frontend:** A React application built with Vite, responsible for the user interface.
- **Backend:** A collection of microservices primarily written in Python using the FastAPI framework.
  - **API Gateway (`backend-service`):** A Node.js Express application that acts as a reverse proxy to the backend services.
  - **Authentication Service (`auth-service`):** Manages user authentication and authorization. Uses PostgreSQL for data storage.
  - **Genealogy Service (`genealogy-service`):** Handles the core genealogy data and business logic. Uses MongoDB for data storage and Celery for background tasks.
  - **Storage Service (`storage-service`):** Manages file uploads and storage.
  - **Search Service (`search-service`):** Provides search functionality across the platform, powered by Elasticsearch.
- **Databases:**
  - **PostgreSQL:** Used by the `auth-service`.
  - **MongoDB:** Used by the `genealogy-service` and `storage-service`.
  - **Redis:** Used for caching and as a message broker for Celery.
  - **Elasticsearch:** Used for search indexing.
- **Observability:** The platform uses a suite of tools for monitoring and tracing:
  - **Jaeger:** For distributed tracing.
  - **Prometheus:** For metrics collection.
  - **Grafana:** For data visualization and dashboards.

## Technologies

### Frontend

- **Framework:** React
- **Build Tool:** Vite
- **Language:** TypeScript
- **State Management:** Redux
- **Styling:** Tailwind CSS
- **Testing:** Vitest, Playwright

### Backend

- **Framework:** FastAPI (Python), Express (Node.js for the API gateway)
- **Language:** Python, TypeScript
- **Databases:** PostgreSQL, MongoDB, Redis, Elasticsearch
- **Asynchronous Libraries:** SQLAlchemy (PostgreSQL), Motor (MongoDB)
- **Task Queue:** Celery

## Key Commands

The project is managed as a monorepo using npm workspaces. The following commands are run from the root of the project.

- **Install all dependencies:**
  ```bash
  npm install
  ```
- **Build all workspaces:**
  ```bash
  npm run build
  ```
- **Run all tests:**
  ```bash
  npm run test
  ```
- **Run linters:**
  ```bash
  npm run lint
  ```
- **Run type checking:**
  ```bash
  npm run typecheck
  ```
- **Start development environment (using Docker Compose):**
  ```bash
  docker-compose up -d
  ```
- **Stop development environment:**
  ```bash
  docker-compose down
  ```
