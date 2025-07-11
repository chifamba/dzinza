# Python Migration Plan for Dzinza Platform

## Overview

This document provides a detailed, step-by-step plan to migrate all backend services (except the frontend) from Node.js/TypeScript to Python 3.11+, ensuring full feature parity, robust security, and seamless integration with the existing database and frontend. The migration will be performed in the `feat/python-migration` branch.

**Services to Migrate:**

- auth-service
- backend-service (API Gateway)
- genealogy-service
- search-service
- storage-service

**Frontend:**

- Remains as-is (React/Tailwind)

**Key Requirements:**

- All services rewritten in Python 3.11+ (recommended: FastAPI for REST, Celery for background jobs, SQLAlchemy/Pydantic for models, etc.)
- Maintain all current functionality and APIs
- Reuse the existing database schema; any changes must use fail-safe migrations
- Each service must be containerized (Docker)
- The system must work with Docker Compose; update as needed
- Use shared configuration files mounted as config volumes
- Use Docker secrets for all sensitive data
- Remove obsolete files after migration
- Validate all APIs for compatibility

---

## Step-by-Step Migration Plan

### 1. Preparation

- [x] Create and switch to `feat/python-migration` branch
- [ ] Review and document all APIs, routes, and dependencies for each service
- [ ] Inventory all environment variables, secrets, and config files
- [ ] Identify shared utilities and middleware to be ported or rewritten

### 2. Common Infrastructure

- [ ] Define a shared Python base image (e.g., python:3.11-slim) for all services
- [ ] Create a `shared-config/` directory for config files (YAML/ENV) to be mounted as volumes
- [ ] Set up Docker secrets for all sensitive values (DB credentials, JWT secrets, etc.)
- [ ] Update `docker-compose.yml` to:
  - Use new Python service images
  - Mount shared config and secrets
  - Ensure all healthchecks, networks, and dependencies are correct
  - Remove Node.js-specific build steps

### 3. Service-by-Service Migration

#### 3.1. auth-service

- [ ] Document all endpoints, models, and middleware
- [ ] Reimplement in Python (FastAPI, SQLAlchemy, Redis, JWT, OAuth, etc.)
- [ ] Migrate all authentication logic, rate limiting, and security features
- [ ] Integrate with PostgreSQL and Redis as before
- [ ] Implement metrics and tracing (Prometheus, OpenTelemetry)
- [ ] Write Dockerfile for Python version
- [ ] Update service definition in `docker-compose.yml`
- [ ] Remove Node.js files after validation

#### 3.2. backend-service (API Gateway)

- [ ] Document all proxy routes, middleware, and integrations
- [ ] Reimplement in Python (FastAPI, httpx/requests for proxying, etc.)
- [ ] Migrate all gateway logic, validation, and error handling
- [ ] Integrate with all backend services and databases
- [ ] Implement metrics and tracing
- [ ] Write Dockerfile for Python version
- [ ] Update service definition in `docker-compose.yml`
- [ ] Remove Node.js files after validation

#### 3.3. genealogy-service

- [ ] Document all endpoints, models, and background jobs
- [ ] Reimplement in Python (FastAPI, Celery, MongoDB, etc.)
- [ ] Migrate all genealogy logic, queue workers, and data models
- [ ] Integrate with MongoDB and PostgreSQL as before
- [ ] Implement metrics and tracing
- [ ] Write Dockerfile for Python version
- [ ] Update service definition in `docker-compose.yml`
- [ ] Remove Node.js files after validation

#### 3.4. search-service

- [ ] Document all endpoints, models, and integrations (Elasticsearch, MongoDB)
- [ ] Reimplement in Python (FastAPI, elasticsearch-py, etc.)
- [ ] Migrate all search logic, analytics, and metrics
- [ ] Integrate with Elasticsearch and MongoDB as before
- [ ] Implement metrics and tracing
- [ ] Write Dockerfile for Python version
- [ ] Update service definition in `docker-compose.yml`
- [ ] Remove Node.js files after validation

#### 3.5. storage-service

- [ ] Document all endpoints, models, and integrations (S3, MongoDB, etc.)
- [ ] Reimplement in Python (FastAPI, boto3, etc.)
- [ ] Migrate all file/media logic, uploads, and background jobs
- [ ] Integrate with S3-compatible storage and MongoDB as before
- [ ] Implement metrics and tracing
- [ ] Write Dockerfile for Python version
- [ ] Update service definition in `docker-compose.yml`
- [ ] Remove Node.js files after validation

### 4. Database & Migrations

- [ ] Reuse existing PostgreSQL and MongoDB schemas
- [ ] If schema changes are needed, create Alembic (PostgreSQL) or MongoEngine (MongoDB) migrations
- [ ] Ensure all migrations are fail-safe and reversible

### 5. Configuration & Secrets

- [ ] Move all non-secret config to shared YAML/ENV files in `shared-config/`
- [ ] Move all secrets to Docker secrets
- [ ] Update all services to read config/secrets from mounted volumes

### 6. Testing & Validation

- [ ] Write/port unit and integration tests for all Python services
- [ ] Validate all API endpoints for compatibility with the frontend
- [ ] Run end-to-end tests and fix any issues
- [ ] Validate metrics, tracing, and logging

### 7. Cleanup

- [ ] Remove all Node.js/TypeScript files, configs, and Dockerfiles for migrated services
- [ ] Remove obsolete scripts and dependencies
- [ ] Update documentation to reflect the new Python backend

### 8. Final Review

- [ ] Peer review of all code and infrastructure changes
- [ ] Security audit of new Python services
- [ ] Confirm all services work together in Docker Compose
- [ ] Merge `feat/python-migration` branch after successful review

---

## Notes

- Use best practices for Python, Docker, and DevOps throughout
- Ensure all services run as non-root users in containers
- Use healthchecks and resource limits in Docker Compose
- Document all new environment variables and config options
- Maintain clear commit history for traceability

---

_This plan will be updated as the migration progresses. All contributors should check off completed steps and add notes as needed._
