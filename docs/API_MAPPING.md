# Dzinza API Service Mapping

This document provides a comprehensive mapping of all APIs across Dzinza services, including proxy configurations and expected endpoints.

## Table of Contents

- [Frontend Service](#frontend-service)
- [Backend Service (API Gateway)](#backend-service-api-gateway)
- [Auth Service](#auth-service)
- [Genealogy Service](#genealogy-service)
- [Search Service](#search-service)
- [Storage Service](#storage-service)
- [Proxy Flow Diagram](#proxy-flow-diagram)

## Frontend Service

The Frontend service is a React application served by Nginx and expects the following API endpoints:

| Expected API Path | Description                                       | Upstream Service              |
| ----------------- | ------------------------------------------------- | ----------------------------- |
| `/api/*`          | All API calls are directed to the Backend service | Backend Service (API Gateway) |

### Nginx Proxy Configuration

```
location /api/ {
    proxy_pass http://backend_service:8000/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 180s;
}
```

### Frontend API Client Configuration

The Frontend uses a base URL configuration:

```typescript
const BASE_URL = import.meta.env.PROD
  ? import.meta.env.VITE_API_BASE_URL || ""
  : ""; // Uses relative URLs to leverage proxy
```

## Backend Service (API Gateway)

The Backend Service functions as an API Gateway that routes requests to the appropriate microservices.

### Service Routing Configuration

| Path Prefix         | Target Service URL              |
| ------------------- | ------------------------------- |
| `auth`              | `http://auth-service:8000`      |
| `genealogy`         | `http://genealogy-service:8000` |
| `family-trees`      | `http://genealogy-service:8000` |
| `persons`           | `http://genealogy-service:8000` |
| `relationships`     | `http://genealogy-service:8000` |
| `events`            | `http://genealogy-service:8000` |
| `notifications`     | `http://genealogy-service:8000` |
| `merge-suggestions` | `http://genealogy-service:8000` |
| `person-history`    | `http://genealogy-service:8000` |
| `search`            | `http://search-service:8000`    |
| `storage`           | `http://storage-service:8000`   |

### API Gateway Endpoints

| API Endpoint   | Description                                                                                                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/health`      | Health check endpoint                                                                                                                                                        |
| `/{path:path}` | Catch-all proxy route that should return a "Not Yet Implemented" page with details about the requested path, rather than silently forwarding to services which may not exist |

### Path Normalization

The Gateway performs simplified path normalization:

- If path starts with `/api/`, it strips the "/api" prefix only
- Each downstream service then handles the "/v1/" part of the path

## Auth Service

| API Endpoint                      | Method | Description            |
| --------------------------------- | ------ | ---------------------- |
| `/health`                         | GET    | Health check endpoint  |
| `/v1/auth/register`               | POST   | Register a new user    |
| `/v1/auth/login`                  | POST   | User login             |
| `/v1/auth/refresh`                | POST   | Refresh access token   |
| `/v1/auth/verify-email`           | POST   | Verify user email      |
| `/v1/auth/password-reset`         | POST   | Request password reset |
| `/v1/auth/password-reset-confirm` | POST   | Confirm password reset |
| `/v1/auth/mfa/enable`             | POST   | Enable MFA             |
| `/v1/auth/mfa/disable`            | POST   | Disable MFA            |
| `/v1/auth/mfa/verify`             | POST   | Verify MFA code        |
| `/v1/auth/user`                   | GET    | Get current user info  |
| `/v1/auth/user`                   | PUT    | Update user info       |

## Genealogy Service

| API Endpoint             | Method | Description                 |
| ------------------------ | ------ | --------------------------- |
| `/health`                | GET    | Health check endpoint       |
| `/v1/family-trees`       | GET    | List all family trees       |
| `/v1/family-trees`       | POST   | Create a new family tree    |
| `/v1/family-trees/{id}`  | GET    | Get a specific family tree  |
| `/v1/family-trees/{id}`  | PUT    | Update a family tree        |
| `/v1/family-trees/{id}`  | DELETE | Delete a family tree        |
| `/v1/persons`            | GET    | List all persons            |
| `/v1/persons`            | POST   | Create a new person         |
| `/v1/persons/{id}`       | GET    | Get a specific person       |
| `/v1/persons/{id}`       | PUT    | Update a person             |
| `/v1/persons/{id}`       | DELETE | Delete a person             |
| `/v1/relationships`      | GET    | List all relationships      |
| `/v1/relationships`      | POST   | Create a new relationship   |
| `/v1/relationships/{id}` | GET    | Get a specific relationship |
| `/v1/relationships/{id}` | PUT    | Update a relationship       |
| `/v1/relationships/{id}` | DELETE | Delete a relationship       |
| `/v1/events`             | GET    | List all events             |
| `/v1/events`             | POST   | Create a new event          |
| `/v1/events/{id}`        | GET    | Get a specific event        |
| `/v1/events/{id}`        | PUT    | Update an event             |
| `/v1/events/{id}`        | DELETE | Delete an event             |
| `/v1/notifications`      | GET    | List all notifications      |
| `/v1/merge-suggestions`  | GET    | List merge suggestions      |
| `/v1/person-history`     | GET    | Get person history          |

## Search Service

| API Endpoint              | Method | Description             |
| ------------------------- | ------ | ----------------------- |
| `/health`                 | GET    | Health check endpoint   |
| `/v1/search/persons`      | GET    | Search for persons      |
| `/v1/search/family-trees` | GET    | Search for family trees |
| `/v1/search/events`       | GET    | Search for events       |

## Storage Service

| API Endpoint                | Method | Description           |
| --------------------------- | ------ | --------------------- |
| `/health`                   | GET    | Health check endpoint |
| `/v1/storage/upload`        | POST   | Upload a file         |
| `/v1/storage/download/{id}` | GET    | Download a file       |
| `/v1/storage/delete/{id}`   | DELETE | Delete a file         |

## Proxy Flow Diagram

The API request flow goes through multiple layers of proxying:

1. **Client → Frontend (Nginx)**:

   - Request: `/api/auth/login`
   - Nginx routes to Backend Service removing nothing: `/api/auth/login`

2. **Frontend → Backend Service (API Gateway)**:

   - Receives: `/api/auth/login`
   - Gateway only removes the `/api` prefix, resulting in: `/auth/login`
   - Determines target service based on "auth" prefix

3. **Backend Service → Auth Service**:
   - Routes to: `http://auth-service:8000/v1/auth/login`

The key change is that the Auth Service (and all other services) will now expect paths with the `/v1/` prefix built in, which simplifies the Gateway's job to only removing the `/api` prefix.

## Implementation Example

I've added an example implementation of the catch-all rule that returns a detailed "Not Yet Implemented" page instead of silently failing. This is available in the file:

`/docs/gateway_not_implemented_example.py`

This implementation:

1. Logs the original path
2. Normalizes the path (removing prefixes like v1/ or api/v1/)
3. Attempts to determine the target service
4. Returns a structured JSON response with:
   - The original path
   - The normalized path
   - The HTTP method used
   - The target service that would have been called
   - The downstream path that would have been used
   - A list of all available services
   - Troubleshooting tips

This approach makes debugging much easier as you'll immediately be able to see what path was requested and why it might be failing.

## Potential 404 Issues

Based on the mapping above, several issues could be causing 404 errors:

1. **Path Prefix Inconsistency**: The frontend sends `/api/auth/login` but the backend service may be trying to match `/api/v1/auth/login`.

2. **Inconsistent Service URLs**: The backend service configuration may have incorrect service URLs.

3. **Missing API Implementations**: Some expected endpoints may not be implemented in the respective services.

4. **Incorrect Proxy Configuration in Nginx**: The Nginx proxy may be incorrectly configured, possibly stripping or adding path components.

5. **Trailing Slashes**: Inconsistent use of trailing slashes between services.

6. **Silent Failures**: The current catch-all route silently attempts to proxy to services that may not exist, resulting in 404 errors without helpful context.

7. **Missing /v1/ Prefix in Services**: If the services don't have their endpoints configured to start with `/v1/`, they'll receive requests with the wrong path structure.

## Recommended Fixes

1. **Update Service Endpoints**: Ensure all services implement their endpoints starting with `/v1/` (except health check endpoints).

2. **Simplify API Gateway Logic**: Modify the Gateway to only strip the `/api` prefix from incoming requests.

3. **Standardize Service URLs**: Update the Gateway's service routing configuration to remove `/api/v1` from the target URLs.

4. **Validate Nginx Configuration**: Ensure the Nginx proxy is passing the complete path to the backend.

5. **Implement Comprehensive Logging**: Add detailed request logging at each service layer to track the full path through all services.

6. **Update Frontend Client**: Ensure the frontend is sending requests to `/api/auth/...` (without a `/v1/` in the path).

7. **Modify the catch-all rule** in the Backend Service to return a detailed "Not Yet Implemented" page with the requested path information.

The standardized approach of having each service handle the `/v1/` part of the path simplifies routing and makes debugging easier as there's only one transformation happening at the API Gateway level.
