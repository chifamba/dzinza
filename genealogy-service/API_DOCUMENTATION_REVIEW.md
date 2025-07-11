# Genealogy Service API Documentation Review

**Date:** January 7, 2025  
**Service:** genealogy-service  
**Version:** 0.1.0

## Executive Summary

This document provides a comprehensive analysis of the genealogy-service API implementation compared to its OpenAPI specification. The review identifies mismatches, missing implementations, and areas requiring updates to ensure consistency between documentation and actual service capabilities.

## Current Implementation Status

### ✅ Fully Implemented Endpoints

#### Family Trees

- `POST /v1/family-trees` - Create family tree
- `GET /v1/family-trees` - List family trees (with pagination)
- `GET /v1/family-trees/{tree_id}` - Get specific family tree
- `PUT /v1/family-trees/{tree_id}` - Update family tree
- `DELETE /v1/family-trees/{tree_id}` - Delete family tree

#### Persons

- `POST /v1/trees/{tree_id}/persons` - Create person in tree
- `GET /v1/trees/{tree_id}/persons` - List persons in tree
- `GET /v1/persons/{person_id}` - Get specific person
- `PUT /v1/persons/{person_id}` - Update person
- `DELETE /v1/persons/{person_id}` - Delete person
- `POST /v1/persons/{person_id}/trees/{tree_id}` - Link person to tree
- `DELETE /v1/persons/{person_id}/trees/{tree_id}` - Unlink person from tree
- `GET /v1/persons/search` - Search persons by name

#### Relationships

- `POST /v1/trees/{tree_id}/relationships` - Create relationship in tree
- `GET /v1/persons/{person_id}/relationships` - List relationships for person
- `GET /v1/relationships/{relationship_id}` - Get specific relationship
- `PUT /v1/relationships/{relationship_id}` - Update relationship
- `DELETE /v1/relationships/{relationship_id}` - Delete relationship

#### Events

- `POST /v1/trees/{tree_id}/events` - Create event in tree
- `GET /v1/events/{event_id}` - Get specific event
- `GET /v1/persons/{person_id}/events` - List events for person
- `GET /v1/relationships/{relationship_id}/events` - List events for relationship
- `GET /v1/trees/{tree_id}/events` - List events in tree
- `PUT /v1/events/{event_id}` - Update event
- `DELETE /v1/events/{event_id}` - Delete event

#### System Health

- `GET /v1/health` - Service health check
- `GET /v1/health/database` - Database health check
- `GET /v1/health/pool` - Connection pool statistics

### ❌ Missing/Not Implemented Endpoints

#### Notifications

- `GET /v1/notifications` - List notifications
- `PUT /v1/notifications/{notification_id}/read` - Mark notification as read

#### Merge Suggestions

- `GET /v1/merge-suggestions` - List merge suggestions
- `PUT /v1/merge-suggestions/{suggestion_id}` - Update merge suggestion

#### Person History

- `GET /v1/persons/{person_id}/history` - Get person history

#### General Events (Global Scope)

- `POST /v1/events` - Create event (global scope)
- `GET /v1/events` - List events (global scope with filters)

#### General Relationships (Global Scope)

- `POST /v1/relationships` - Create relationship (global scope)
- `GET /v1/relationships` - List relationships (global scope with filters)

## Schema Discrepancies

### 1. Person Schema Issues

**Implementation Issues:**

- `PersonUpdate` schema in code is more flexible than OpenAPI spec
- `alternate_names` field missing from OpenAPI PersonCreate schema
- Some schema imports are inconsistent (mixing crud functions with schema definitions)

**OpenAPI vs Implementation:**

- OpenAPI: Uses nested `PersonName` objects
- Implementation: Uses flattened structure in some cases

### 2. Family Tree Schema Issues

**Implementation Issues:**

- `FamilyTreeList` response returns `{"items": trees, "total": -1}` with hardcoded -1
- Missing proper total count implementation
- Some fields like `collaborators`, `settings`, `statistics` are defined in OpenAPI but not fully implemented

### 3. Response Format Inconsistencies

**Family Tree List Response:**

- OpenAPI expects: `FamilyTreeListResponse` with proper total count
- Implementation returns: `{"items": trees, "total": -1}` with comment about inaccurate total

**Health Check Response:**

- Implementation includes additional fields not documented in OpenAPI:
  - `database_health`
  - `connection_pool`
  - `timestamp`

## Path Prefix Inconsistencies

### OpenAPI Specification

- Uses `/family-trees`, `/persons`, `/relationships`, `/events`, `/notifications`
- Health check at `/genealogy/health`

### Current Implementation

- Uses `/v1/family-trees`, `/v1/persons`, `/v1/relationships`, `/v1/events`
- Health check at `/v1/health` (also `/v1/health/database`, `/v1/health/pool`)
- API prefix configured as `/v1` in settings

**Issue:** OpenAPI paths missing `/v1` prefix that's actually used in implementation.

## Authentication & Authorization

### Current Implementation

- Uses `AuthenticatedUser` dependency from `get_current_active_user`
- Implements tree-level permission checks
- Basic owner-based access control

### OpenAPI Specification

- Correctly specifies `bearerAuth` security scheme
- All endpoints (except health checks) require authentication

**Status:** ✅ Properly aligned

## Data Models & Business Logic

### Implemented Features

- Tree ownership and basic permissions
- Person privacy settings
- Genealogical relationships
- Events associated with persons/relationships
- Person linking/unlinking to/from trees
- Basic search functionality

### Missing Features (Documented but Not Implemented)

- Notification system
- Merge suggestion workflow
- Person history tracking
- Collaborative trees (multiple users)
- Advanced privacy controls
- GEDCOM import/export endpoints

## Technical Issues

### 1. Schema Import Problems

Some endpoint files mix CRUD operations with schema definitions:

```python
# In person.py - should be in separate crud module
async def create_person(db: AsyncIOMotorDatabase, *, person_in: PersonCreate, creator_user_id: str) -> Person:
```

### 2. Response Model Inconsistencies

- Some endpoints return `List[Schema]` instead of paginated responses
- Missing total counts for pagination
- Inconsistent error handling between endpoints

### 3. Configuration Issues

- OpenAPI generation path: `/v1/openapi.json`
- Service title and version properly configured
- Missing some advanced FastAPI features like response examples

## Recommendations

### High Priority

1. **Fix Path Prefixes:** Update OpenAPI specification to include `/v1` prefix for all genealogy endpoints

2. **Implement Missing Core Features:**

   - Notifications system
   - Merge suggestions workflow
   - Person history tracking

3. **Fix Schema Inconsistencies:**

   - Separate CRUD operations from schema files
   - Standardize response formats
   - Implement proper pagination with total counts

4. **Health Check Endpoints:**
   - Update OpenAPI to document additional health endpoints
   - Standardize health check response format

### Medium Priority

1. **Enhance Error Handling:**

   - Standardize error response formats
   - Add proper error codes and messages
   - Document all possible error responses

2. **Implement Global Scope Endpoints:**

   - Add missing global event/relationship endpoints
   - Ensure proper filtering and access controls

3. **Schema Improvements:**
   - Add missing fields to OpenAPI schemas
   - Fix nested object representations
   - Add proper validation rules

### Low Priority

1. **Add Response Examples:**

   - Include comprehensive examples in OpenAPI
   - Add request/response samples for all endpoints

2. **Advanced Features:**
   - Collaborative trees
   - Advanced privacy controls
   - GEDCOM import/export

## Conclusion

The genealogy-service has a solid foundation with most core CRUD operations implemented. The main issues are:

1. **Path prefix misalignment** between OpenAPI and implementation
2. **Missing notification and merge suggestion systems**
3. **Schema organization and consistency issues**
4. **Incomplete pagination implementation**

The service is functional for basic genealogy operations but needs completion of the documented notification and merge suggestion features to match the full OpenAPI specification.

## Next Steps

1. Update OpenAPI paths to include `/v1` prefix
2. Implement missing notification endpoints
3. Implement merge suggestion endpoints
4. Fix pagination and total count issues
5. Reorganize schema definitions for better separation of concerns
6. Add comprehensive testing for all documented endpoints

---

_This review was conducted on January 7, 2025, based on the current state of the genealogy-service codebase and OpenAPI specification._
