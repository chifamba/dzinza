# Auth Service OpenAPI Documentation Update

## Overview

This document summarizes the updates made to the OpenAPI documentation for the Dzinza auth service to reflect the current implementation as of the latest service updates.

## Changes Made

### 1. Updated Authentication Paths (`docs/openapi/paths/auth_paths.yaml`)

#### Implemented Endpoints (v1.0)

**Updated to match actual implementation:**

- **`/auth/register`**

  - Changed from JSON body to form parameters/JSON
  - Updated response to simple message format
  - Username is now optional (auto-generated from email if not provided)
  - Removed complex user details from response

- **`/auth/login`**

  - Changed from JSON body to form parameters/JSON for compatibility
  - Updated response to only return access token and token type
  - Refresh token is now set as HTTP-only cookie (documented in headers)
  - Removed MFA support (not implemented)
  - Removed complex user details from response

- **`/auth/refresh`**

  - Removed request body (reads refresh token from HTTP-only cookie)
  - Updated response to only return new access token
  - New refresh token set as HTTP-only cookie
  - Added proper cookie documentation

- **`/auth/logout`**

  - Removed request body (reads refresh token from HTTP-only cookie)
  - Updated to show cookie clearing in response
  - Simple message response

- **`/health`**
  - Added health check endpoint that is actually implemented
  - Returns service status, version, and timestamp

#### Unimplemented Endpoints

**Marked as planned for future versions:**

- Email verification endpoints (v1.1)
- Password reset endpoints (v1.1)
- Password change endpoint (v1.1)
- Multi-factor authentication endpoints (v1.2)
- User management endpoints (v1.3)
- Social login endpoints (v2.0)

### 2. Updated Authentication Schemas (`docs/openapi/schemas/Auth.yaml`)

#### New Schemas (v1.0)

- **`RegisterRequest`**: Simplified registration with optional fields
- **`RegisterResponse`**: Simple message response
- **`LoginRequest`**: Basic email/password (no MFA)
- **`LoginResponse`**: Access token and type only
- **`TokenResponse`**: For refresh operations

#### Marked as Planned

- All complex authentication schemas marked with `x-implementation-status: "planned"`
- Added `x-planned-version` annotations
- Kept schemas for future compatibility but clearly marked

### 3. Updated User Schemas (`docs/openapi/schemas/User.yaml`)

- Removed duplicate `RegisterRequest` (moved to Auth.yaml)
- Added note about current implementation approach
- Marked user management schemas as planned for v1.3

### 4. Updated Examples

- **`auth_login_request.yaml`**: Removed MFA references
- **`auth_login_response.yaml`**: Simplified to match actual response format

## Implementation Notes

### Current Architecture (v1.0)

1. **Authentication Flow**:

   - Form-based or JSON registration/login for compatibility
   - JWT access tokens for API authentication
   - HTTP-only cookies for refresh tokens (security best practice)
   - Simple token-based logout with revocation

2. **Security Features**:

   - Password hashing with secure algorithms
   - JWT token generation and validation
   - Refresh token storage in database and Redis
   - HTTP-only cookies to prevent XSS attacks
   - Secure cookie settings based on environment

3. **Database Integration**:
   - PostgreSQL for user data and refresh tokens
   - Redis for token caching and quick revocation checks
   - UUID-based user IDs
   - Proper foreign key relationships

### Planned Features

- **v1.1**: Email verification and password reset flows
- **v1.2**: Multi-factor authentication (TOTP)
- **v1.3**: User profile management and admin endpoints
- **v2.0**: Social login integration

## API Compatibility

### Breaking Changes from Previous Documentation

1. **Request Format**: Authentication endpoints now accept both form and JSON data
2. **Response Format**: Simplified responses without complex user objects
3. **Token Handling**: Refresh tokens moved to HTTP-only cookies
4. **Endpoint Availability**: Many documented endpoints are not yet implemented

### Migration Notes

- Clients should use the simplified request/response formats
- Refresh token should be read from cookies, not response body
- Error handling remains consistent with OpenAPI error schemas
- Health check endpoint available for service monitoring

## Testing

Updated examples reflect the actual API behavior and can be used for:

- API testing and validation
- Client development
- Documentation generation
- Service monitoring

## Future Updates

As new features are implemented, the OpenAPI documentation will be updated to:

1. Move schemas from "planned" to "implemented"
2. Add new endpoint specifications
3. Update examples with real-world usage
4. Maintain backward compatibility where possible

---

**Note**: This documentation update ensures that the OpenAPI specification accurately reflects the current auth service implementation while maintaining visibility of planned features for future development.
