# Extended Services for Community Genealogy Platform

This document summarizes the purpose and API capabilities of the extended microservices required to support a scalable, collaborative, and trustworthy genealogy platform.

---

## 1. Search & Discovery Service

**Purpose**: Enables users to locate persons, branches, and historical entries efficiently.

**Key Endpoints**:
- `GET /search/person`: Search by name, birth date, or location.

**Tech Recommendation**: Backed by Elasticsearch for scalable querying.

---

## 2. Audit & History Service

**Purpose**: Tracks all create/update/delete actions to ensure transparency and accountability.

**Key Endpoints**:
- `GET /audit/logs`: Retrieve logs by entity type, entity ID, or user.

**Considerations**:
- Should support long-term log storage.
- Immutable logging recommended for sensitive actions.

---

## 3. Media Storage Service

**Purpose**: Manages uploads and associations of images, documents, and multimedia.

**Key Endpoints**:
- `POST /media/upload`: Upload media with optional person linkage.
- `GET /media/{mediaId}`: Retrieve metadata about uploaded media.

**Implementation Suggestion**:
- Use cloud object storage (e.g., S3 or GCS) and track metadata in service DB.

---

## 4. Graph Query Service

**Purpose**: Provides deep traversal and reasoning over the family graph structure.

**Key Endpoints**:
- `POST /graph/traverse`: Start from a person and traverse relationships to a defined depth.

**Use Cases**:
- Show ancestry or descendants
- Suggest likely relationships

**Tech Suggestion**:
- Use a graph DB like Neo4j or JanusGraph

---

## 5. Localization & Language Service

**Purpose**: Supports translation and localization of UI and data (names, relationship terms).

**Key Endpoints**:
- `GET /localization/translate`: Translate phrases to target language.

**Localization Features**:
- Calendar systems
- Name parsing rules by culture

---

## 6. Analytics & Insights Service

**Purpose**: Provides metrics on platform activity and user contribution patterns.

**Key Endpoints**:
- `GET /analytics/usage`: General platform usage metrics
- `GET /analytics/top-contributors`: List of top contributors

**Benefits**:
- Spot stale or growing branches
- Track verification engagement

---

## 7. Admin & Moderation Service

**Purpose**: Gives administrators tools to manage abuse, user disputes, and content moderation.

**Key Endpoints**:
- `GET /admin/reports`: Fetch submitted abuse or conflict reports
- `POST /admin/users/{userId}/ban`: Ban malicious users

**Notes**:
- Can include tools to resolve disputes over relationships or merges.

---

## Integration Notes
- All services are REST-compliant with OpenAPI 3.1 specs.
- Event-based extensions possible for actions (e.g., `user.banned`, `media.uploaded`)
- Can be deployed with service mesh support for observability and secure service-to-service calls.

---

Would you like a zipped documentation bundle with this summary + OpenAPI specs next?

