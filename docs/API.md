# Dzinza Platform API Documentation

Welcome to the Dzinza Platform API documentation. This guide provides developers with the information needed to understand and integrate with the Dzinza API.

For a detailed, machine-readable definition of all API endpoints, request/response schemas, and parameters, please refer to our **OpenAPI 3.0 Specification**:

*   **Main OpenAPI File:** [`/docs/openapi/openapi.yaml`](./openapi/openapi.yaml)
*   **Reusable Schemas:** Located in `/docs/openapi/schemas/`
*   **Examples:** Located in `/docs/openapi/examples/`

## 1. API Overview

The Dzinza API provides access to a rich set of features for managing genealogical data, user accounts, files, and more. It is a RESTful API that uses JSON for request and response bodies and standard HTTP status codes.

### 1.1. Base URLs

All API requests are routed through an API Gateway.

*   **Local Development:** `http://localhost:3001/api/v1`
    *   *(The port `3001` is the default for the API Gateway; this might vary based on your local `docker-compose` configuration.)*
*   **Production (Example):** `https://api.dzinza.com/v1`

All paths documented in the OpenAPI specification are relative to these base URLs. For example, an endpoint documented as `/auth/login` would be accessed at `http://localhost:3001/api/v1/auth/login` in a local development environment.

### 1.2. Authentication

Most Dzinza API endpoints require authentication. Authentication is performed using **JWT (JSON Web Tokens)**.

*   **Obtaining Tokens:**
    1.  Register a new user via the `POST /auth/register` endpoint.
    2.  Log in via the `POST /auth/login` endpoint using your credentials. A successful login will return an `accessToken` and a `refreshToken`.
*   **Using Access Tokens:**
    Include the `accessToken` in the `Authorization` header of your API requests, prefixed with `Bearer `:
    ```
    Authorization: Bearer <your_access_token>
    ```
*   **Refreshing Tokens:**
    Access tokens are short-lived. When an access token expires, use the `refreshToken` (obtained during login) with the `POST /auth/refresh` endpoint to get a new `accessToken`.
*   **Token Cookies (for Web Clients):**
    The `/auth/login` and `/auth/refresh` endpoints also set `access_token_cookie` and `refresh_token_cookie` as HTTPOnly cookies. Web-based clients can rely on these cookies for session management if appropriate for their security model.
*   **Endpoints Requiring Authentication:**
    Endpoints that require authentication are marked with `security: - bearerAuth: []` in the OpenAPI specification. Endpoints with `security: []` or no security definition are public.

*(Refer to the "Authentication" and "Users" tags in the OpenAPI specification for detailed auth-related endpoints.)*

### 1.3. Rate Limiting

The API Gateway implements rate limiting to ensure fair usage and protect the services from abuse.
*   Default limits are applied to most endpoints (e.g., 100 requests per minute per IP).
*   More sensitive endpoints, like login or registration, may have stricter limits.
If you exceed the rate limit, the API will respond with an HTTP `429 Too Many Requests` status code. Appropriate `Retry-After` headers may be included.

### 1.4. Versioning Strategy

The API is versioned via the URL path (e.g., `/api/v1`). The current stable version is `v1`.
Future versions with breaking changes will be introduced under a new version path (e.g., `/v2`). Non-breaking changes and additions may be made to the current version.

### 1.5. Error Handling

The API uses standard HTTP status codes to indicate the success or failure of a request:
*   `2xx` codes indicate success (e.g., `200 OK`, `201 Created`, `204 No Content`).
*   `4xx` codes indicate client errors (e.g., `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `422 Unprocessable Entity` for validation errors).
*   `5xx` codes indicate server errors (e.g., `500 Internal Server Error`, `503 Service Unavailable`).

Error responses are generally in JSON format and include a `detail` field with a human-readable error message. Validation errors (`422`) may also include an `errors` array detailing issues with specific fields.
```json
// Example Error Response (400 Bad Request)
{
  "detail": "Email already registered."
}

// Example Validation Error Response (422 Unprocessable Entity)
{
  "detail": "Validation Error",
  "errors": [
    {
      "field": "body -> email",
      "message": "value is not a valid email address",
      "type": "value_error.email"
    }
  ]
}
```

## 2. Using the OpenAPI Specification

The OpenAPI specification provides a complete and formal definition of the API. You can use it with various tools for:

*   **Interactive API Exploration:** Tools like Swagger UI or ReDoc can render the main [`/docs/openapi/openapi.yaml`](./openapi/openapi.yaml) file as interactive documentation. This provides an aggregated view of all platform APIs and allows you to explore endpoints, view schemas, and even try out API calls directly from your browser.
    *   Additionally, individual Dzinza microservices often expose their own Swagger UI for their specific set of endpoints (e.g., the auth service might have its UI at `http://localhost:3002/api/v1/docs` if accessed directly during development). However, for a complete view of the API surface as exposed through the gateway, using the consolidated `openapi.yaml` file located in this documentation (`/docs/openapi/openapi.yaml`) with a tool like Swagger UI is recommended.
*   **Client SDK Generation:** Tools like OpenAPI Generator can use the [`/docs/openapi/openapi.yaml`](./openapi/openapi.yaml) file to generate client libraries in various programming languages. This can significantly speed up integration.
*   **Mock Server Generation:** Create mock servers that implement the API contract for testing purposes.
*   **Automated Testing:** Use the specification to drive automated API tests.

**To use with Swagger UI (example using a local Docker image):**

1.  Ensure you have the Dzinza repository cloned and the `docs/openapi/openapi.yaml` file is accessible.
2.  Run a local Swagger UI instance pointing to your local OpenAPI file:
    ```bash
    docker run -p 8081:8080 -e SWAGGER_JSON_URL="https://raw.githubusercontent.com/your-repo-path-to/docs/openapi/openapi.yaml" swaggerapi/swagger-ui
    ```
    (Replace the URL with a raw link to your `openapi.yaml` if it's hosted, or mount it as a volume if running locally).
    If you have the spec file locally:
    ```bash
    docker run -p 8081:8080 -v /path/to/your/dzinza/docs/openapi:/usr/share/nginx/html/openapi -e SWAGGER_JSON="/openapi/openapi.yaml" swaggerapi/swagger-ui
    ```
3.  Open `http://localhost:8081` in your browser.

## 3. Endpoint Documentation

The following sections provide a high-level overview of the available API resources. For complete details on request parameters, request bodies, response schemas, and examples, please refer to the corresponding paths in the [OpenAPI specification (`/docs/openapi/openapi.yaml`](./openapi/openapi.yaml) and the referenced files in `/docs/openapi/paths/`).

### 3.1. Authentication (`/auth/*`, `/mfa/*`)

*   **Tag in OpenAPI:** `Authentication`
*   Handles user registration, login (including MFA flows), token refresh, logout, email verification, and password management.
*   **Key Endpoints:**
    *   `POST /auth/register`: Create a new user account.
    *   `POST /auth/login`: Authenticate and receive JWTs.
    *   `POST /auth/refresh`: Get a new access token.
    *   `POST /auth/logout`: Invalidate session.
    *   `POST /mfa/enable-mfa-request`: Start MFA setup.
    *   `POST /mfa/verify-mfa-enable`: Confirm MFA code and complete setup.
    *   `POST /mfa/disable`: Disable MFA for the account.

### 3.2. Users (`/users/*`)

*   **Tag in OpenAPI:** `Users`
*   Manages user profile information and administrative user operations.
*   **Key Endpoints:**
    *   `GET /users/me`: Retrieve the current authenticated user's profile.
    *   `PUT /users/me`: Update the current authenticated user's profile.
    *   `GET /users`: (Admin) List all users.
    *   `GET /users/{user_id}`: (Admin) Get a specific user by ID.
    *   `PUT /users/{user_id}`: (Admin) Update a specific user.
    *   `DELETE /users/{user_id}`: (Admin) Delete a user.

### 3.3. Family Trees (`/family-trees/*`)

*   **Tag in OpenAPI:** `Family Trees`
*   Manages family tree records.
*   **Key Endpoints:**
    *   `POST /family-trees`: Create a new family tree.
    *   `GET /family-trees`: List family trees for the authenticated user.
    *   `GET /family-trees/{tree_id}`: Get details of a specific family tree.
    *   `PUT /family-trees/{tree_id}`: Update a family tree.
    *   `DELETE /family-trees/{tree_id}`: Delete a family tree.

### 3.4. Persons (`/persons/*`, `/family-trees/{tree_id}/persons/*`)

*   **Tag in OpenAPI:** `Persons`
*   Manages individuals (persons) within family trees.
*   **Key Endpoints:**
    *   `POST /family-trees/{tree_id}/persons`: Add a new person to a specific family tree.
    *   `GET /family-trees/{tree_id}/persons`: List persons in a family tree.
    *   `GET /persons/{person_id}`: Get details of a specific person.
    *   `PUT /persons/{person_id}`: Update a person's details.
    *   `DELETE /persons/{person_id}`: Delete a person from the system.
    *   `POST /persons/{person_id}/trees/{tree_id}`: Link an existing person to another tree.
    *   `DELETE /persons/{person_id}/trees/{tree_id}`: Unlink a person from a tree.
    *   `GET /persons/search`: Search for persons by name (simple search within genealogy service).

### 3.5. Relationships (`/relationships/*`)

*   **Tag in OpenAPI:** `Relationships`
*   Manages relationships between persons (e.g., spouse, parent-child).
*   **Key Endpoints:**
    *   `POST /relationships`: Create a new relationship.
    *   `GET /relationships`: List relationships (can be filtered by tree or person).
    *   `GET /relationships/{relationship_id}`: Get details of a specific relationship.
    *   `PUT /relationships/{relationship_id}`: Update a relationship.
    *   `DELETE /relationships/{relationship_id}`: Delete a relationship.

### 3.6. Events (`/events/*`)

*   **Tag in OpenAPI:** `Events`
*   Manages genealogical events (birth, death, marriage, etc.).
*   **Key Endpoints:**
    *   `POST /events`: Create a new event.
    *   `GET /events`: List events (can be filtered by tree, person, or event type).
    *   `GET /events/{event_id}`: Get details of a specific event.
    *   `PUT /events/{event_id}`: Update an event.
    *   `DELETE /events/{event_id}`: Delete an event.

### 3.7. Files (`/files/*`)

*   **Tag in OpenAPI:** `Files`
*   Manages file uploads, downloads, and metadata.
*   **Key Endpoints:**
    *   `POST /files/upload`: Upload one or more files with associated metadata.
    *   `GET /files`: List files for the authenticated user (with filtering and pagination).
    *   `GET /files/{file_id}`: Get metadata for a specific file.
    *   `GET /files/{file_id}/download`: Get a presigned S3 URL to download the file or a thumbnail.
    *   `PUT /files/{file_id}`: Update file metadata.
    *   `DELETE /files/{file_id}`: Soft delete a file.
    *   Internal association endpoints (e.g., `/files/{file_id}/associate-event`) are also available for linking files to other entities.

### 3.8. Search (`/search/*`)

*   **Tag in OpenAPI:** `Search`
*   Provides comprehensive search capabilities across indexed platform data.
*   **Key Endpoints:**
    *   `POST /search`: Perform a search with a flexible query (text, filters, pagination, sorting, highlighting, facets).
    *   `GET /search/suggest`: Get type-ahead search suggestions.

### 3.9. System & Health Checks (`*/health`, `/gateway/health`)

*   **Tag in OpenAPI:** `System`
*   Each microservice (`auth`, `genealogy`, `storage`, `search`) exposes a `/health` endpoint (e.g., `/auth/health`, `/genealogy/health`) accessible via the API Gateway.
*   The API Gateway itself has a health check at `/gateway/health`.
*   These endpoints can be used to monitor the operational status of the services.

## 4. Future API Endpoints & Roadmap

The Dzinza platform is an evolving project. The following are areas where new API endpoints are planned or anticipated:

*   **Historical Records Service (Planned):**
    *   Endpoints for uploading, managing, searching, and retrieving historical records (e.g., census documents, certificates).
    *   Marked with `x-implementation-status: "planned"` in the OpenAPI specification (e.g., under `/historical-records`).
*   **Enhanced Collaboration Features (Planned):**
    *   APIs for inviting users to collaborate on family trees with specific roles (viewer, editor, admin).
    *   Endpoints for managing collaborator permissions.
    *   A commenting system for discussion on persons, trees, or media.
    *   More detailed activity/audit logs for collaborative changes.
    *   Marked with `x-implementation-status: "planned"` in the OpenAPI specification (e.g., under `/family-trees/{tree_id}/collaborators`).
*   **Stories/Narratives:**
    *   If distinct from the current "Event" model, dedicated CRUD endpoints for creating and managing narrative stories associated with persons or families.
*   **DNA & AI Features:**
    *   APIs related to DNA data upload, analysis, and matching.
    *   Endpoints for AI-powered suggestions (e.g., record hints, photo enhancements, smart matching).
*   **Advanced Admin Panel Functionality:**
    *   APIs for content moderation, site-wide settings, and aggregated platform analytics.
*   **GEDCOM Enhancements:**
    *   More granular control over GEDCOM import/export processes, status tracking for large files.

*(The OpenAPI specification uses the `x-implementation-status: "planned"` and `x-planned-version: "X.Y"` custom extension properties to denote endpoints that are not yet implemented but are part of the roadmap.)*

## 5. SDK and Integration Examples (Placeholder)

This section will provide code examples in various languages (e.g., Python, JavaScript) for common API interactions and guidance on building integrations with the Dzinza platform.

### 5.1. Python Example (Conceptual)

```python
import requests
import json

API_BASE_URL = "http://localhost:3001/api/v1" # Or production URL
ACCESS_TOKEN = "your_jwt_access_token"

headers = {
    "Authorization": f"Bearer {ACCESS_TOKEN}",
    "Content-Type": "application/json"
}

# Example: Get current user profile
try:
    response = requests.get(f"{API_BASE_URL}/users/me", headers=headers)
    response.raise_for_status() # Raises an HTTPError for bad responses (4XX or 5XX)
    user_profile = response.json()
    print("User Profile:", json.dumps(user_profile, indent=2))
except requests.exceptions.HTTPError as errh:
    print(f"Http Error: {errh}")
    # print(f"Response content: {errh.response.text}")
except requests.exceptions.ConnectionError as errc:
    print(f"Error Connecting: {errc}")
except requests.exceptions.Timeout as errt:
    print(f"Timeout Error: {errt}")
except requests.exceptions.RequestException as err:
    print(f"Oops: Something Else: {err}")

# Further examples for creating a family tree, uploading a file, etc., will be added here.
```

### 5.2. JavaScript Example (Conceptual - using Fetch API)

```javascript
const API_BASE_URL = "http://localhost:3001/api/v1"; // Or production URL
const ACCESS_TOKEN = "your_jwt_access_token";

async function getCurrentUserProfile() {
    try {
        const response = await fetch(`${API_BASE_URL}/users/me`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${ACCESS_TOKEN}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: response.statusText }));
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.detail}`);
        }

        const userProfile = await response.json();
        console.log("User Profile:", userProfile);
        return userProfile;
    } catch (error) {
        console.error("Failed to fetch user profile:", error);
    }
}

// getCurrentUserProfile();
// Further examples will be added here.
```

### 5.3. Common Integration Patterns

*   **User Authentication Flow:**
    1.  Client collects user credentials.
    2.  Client POSTs to `/auth/login`.
    3.  Server validates, returns JWT access/refresh tokens.
    4.  Client stores tokens securely.
    5.  Client includes access token in `Authorization: Bearer` header for subsequent requests.
    6.  Client uses refresh token with `/auth/refresh` to get new access tokens when expired.
*   **File Uploads:**
    1.  Client uses `POST /files/upload` with `multipart/form-data`.
    2.  Server returns metadata of uploaded file(s), including S3 URL.
*   **Displaying Data:**
    1.  Client fetches data (e.g., family tree, person list) using GET requests.
    2.  Client uses pagination parameters (`skip`/`limit` or `page`/`size`) for large datasets.

### 5.4. Troubleshooting

*   **401 Unauthorized:** Ensure your JWT Access Token is valid, not expired, and correctly included in the `Authorization: Bearer <token>` header. Try refreshing your token if it might be expired.
*   **403 Forbidden:** You are authenticated, but your user account does not have permission to access the requested resource or perform the action.
*   **404 Not Found:** The requested resource (e.g., a specific tree ID, user ID) does not exist, or the endpoint path is incorrect.
*   **422 Unprocessable Entity:** Your request body likely has validation errors. Check the `errors` array in the response for details on which fields are problematic.
*   **Rate Limiting (429):** If you receive a `429 Too Many Requests` error, reduce your request frequency. Check `Retry-After` headers.
```
