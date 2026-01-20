# Product Requirements Document (PRD)

# Dzinza - Community Genealogy Platform

**Document Version:** 1.0  
**Last Updated:** January 19, 2026  
**Product Name:** Dzinza  
**Product Type:** Decentralized Community-Driven Genealogy Platform

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Goals](#2-product-vision--goals)
3. [Target Users & Personas](#3-target-users--personas)
4. [Core Features & Requirements](#4-core-features--requirements)
5. [System Architecture](#5-system-architecture)
6. [Microservices Inventory](#6-microservices-inventory)
7. [Data Models](#7-data-models)
8. [API Specifications](#8-api-specifications)
9. [Frontend Requirements](#9-frontend-requirements)
10. [Security & Privacy](#10-security--privacy)
11. [Infrastructure & DevOps](#11-infrastructure--devops)
12. [Integration Points](#12-integration-points)
13. [Non-Functional Requirements](#13-non-functional-requirements)
14. [Development Roadmap](#14-development-roadmap)
15. [Success Metrics](#15-success-metrics)
16. [Appendices](#16-appendices)

---

## 1. Executive Summary

### 1.1 Product Overview

**Dzinza** is a decentralized, community-driven genealogy platform that enables users to collaboratively build, verify, and explore family trees. Unlike traditional genealogy platforms, Dzinza emphasizes community trust, data integrity, and collaborative verification through a sophisticated trust-based permission model.

### 1.2 Problem Statement

Current genealogy platforms face several challenges:

- **Data Fragmentation:** Family data is scattered across multiple platforms without interoperability
- **Trust Issues:** No reliable way to verify relationship claims between users
- **Privacy Concerns:** Limited control over who can view sensitive family information
- **Duplicate Records:** Same individuals appear multiple times without merge capabilities
- **Centralized Control:** Single-entity ownership of sensitive family data

### 1.3 Solution

Dzinza addresses these challenges through:

- **Graph Database Architecture:** Neo4j-powered relationship modeling for efficient family tree traversal
- **Trust-Based Verification:** Community-driven relationship confirmation system
- **Privacy Controls:** Granular access controls at person, tree, and fact levels
- **Intelligent Deduplication:** Automated detection and merging of duplicate records
- **Decentralized Collaboration:** Multiple users can contribute to and verify family trees

### 1.4 Key Differentiators

| Feature                   | Dzinza                             | Traditional Platforms   |
| ------------------------- | ---------------------------------- | ----------------------- |
| Trust Model               | Community-verified, score-based    | Admin-only verification |
| Data Storage              | Graph database (Neo4j)             | Relational databases    |
| Relationship Verification | Multi-party confirmation           | Single-user entry       |
| Privacy Controls          | Per-field privacy settings         | Tree-level only         |
| Deduplication             | AI-assisted with merge suggestions | Manual only             |

---

## 2. Product Vision & Goals

### 2.1 Vision Statement

_"To create the world's most trusted and interconnected family history platform where communities collaboratively preserve and verify their genealogical heritage."_

### 2.2 Mission

Enable individuals and communities to:

- Build accurate, verified family trees
- Connect with relatives across geographical boundaries
- Preserve family stories, media, and historical records
- Maintain privacy while enabling discovery

### 2.3 Strategic Goals

#### Short-term (6 months)

1. Launch MVP with core genealogy features
2. Achieve 1,000 active users
3. Process 10,000 family tree nodes
4. Establish trust verification system

#### Medium-term (12 months)

1. Scale to 25,000 active users
2. Implement DNA integration partnerships
3. Launch mobile applications
4. Introduce community marketplace

#### Long-term (24 months)

1. Reach 100,000 active users
2. Expand to 20+ language localizations
3. Partner with genealogical societies globally
4. Implement blockchain-based record verification

### 2.4 Key Principles

1. **Uniqueness of Persons:** Each person is uniquely identified; when the same person appears in different family trees, branches merge to form a connected graph.

2. **Trust Model:** Users earn trust based on contributions and validations. Trust influences access permissions and verification weight.

3. **Relationship Verification:** New relationships require multiple confirmations from trusted users or override by highly trusted users.

4. **Privacy and Access Control:** Users control access to trees and branches based on trust levels and verification status.

5. **Community Marketplace:** Platform for sharing knowledge, resources, tools, and documentation to support genealogy research.

---

## 3. Target Users & Personas

### 3.1 Primary Personas

#### Persona 1: Family Historian (Sarah, 55)

- **Background:** Retired teacher passionate about preserving family history
- **Goals:** Document extended family spanning 5 generations; share discoveries with relatives
- **Pain Points:** Difficulty verifying information; scattered data across platforms
- **Needs:** Easy-to-use interface; collaboration tools; source citation features

#### Persona 2: Casual Researcher (Michael, 35)

- **Background:** Professional curious about ancestry after DNA test
- **Goals:** Understand heritage; connect with distant relatives
- **Pain Points:** Limited time; overwhelmed by complex genealogy tools
- **Needs:** Guided onboarding; automatic hints; mobile access

#### Persona 3: Professional Genealogist (Dr. Amara, 45)

- **Background:** Certified genealogist serving clients
- **Goals:** Accurate research; GEDCOM import/export; professional reporting
- **Pain Points:** Need for verification tools; collaboration with clients
- **Needs:** Advanced search; API access; white-label options

#### Persona 4: Community Organizer (Chief Tendai, 60)

- **Background:** Traditional leader preserving clan history
- **Goals:** Document tribal lineages; preserve oral traditions
- **Pain Points:** Lack of tools supporting traditional naming conventions
- **Needs:** Localization; cultural customization; offline capabilities

### 3.2 Secondary Personas

- **DNA Testing Companies:** Integration partners for genetic genealogy
- **Genealogical Societies:** Institutional users managing member trees
- **Historians/Researchers:** Academic users accessing aggregated data
- **Archives/Libraries:** Institutions linking historical records

### 3.3 User Journey Map

```
Discovery → Registration → Profile Setup → Tree Creation →
Family Addition → Relationship Verification → Community Engagement →
Media Upload → Historical Research → Report Generation
```

---

## 4. Core Features & Requirements

### 4.1 Family Tree Management

#### 4.1.1 Tree Creation & Management

| ID     | Requirement                                                    | Priority | Status         |
| ------ | -------------------------------------------------------------- | -------- | -------------- |
| FT-001 | Create new family trees with configurable privacy settings     | P0       | ✅ Implemented |
| FT-002 | Set root person for tree                                       | P0       | ✅ Implemented |
| FT-003 | Define collaborator roles (Admin, Editor, Viewer)              | P1       | ✅ Implemented |
| FT-004 | Tree statistics (person count, generation depth, completeness) | P1       | ✅ Implemented |
| FT-005 | Tree templates for common family structures                    | P2       | ✅ Implemented |
| FT-006 | Tree comparison for common ancestors                           | P2       | ✅ Implemented |

#### 4.1.2 Person Management

| ID     | Requirement                                                 | Priority | Status         |
| ------ | ----------------------------------------------------------- | -------- | -------------- |
| PM-001 | Create person profiles with comprehensive biographical data | P0       | ✅ Implemented |
| PM-002 | Support multiple name types (birth, married, nickname)      | P0       | ✅ Implemented |
| PM-003 | Flexible date handling (exact, approximate, ranges)         | P0       | ✅ Implemented |
| PM-004 | Custom fields for additional attributes                     | P1       | ✅ Implemented |
| PM-005 | Life event timeline (birth, death, marriage, etc.)          | P1       | ✅ Implemented |
| PM-006 | Source citations for facts                                  | P1       | ✅ Implemented |
| PM-007 | Cultural attributes (clan, tribe, traditional titles)       | P1       | ✅ Implemented |
| PM-008 | Per-fact privacy settings                                   | P1       | ✅ Implemented |

#### 4.1.3 Relationship Management

| ID     | Requirement                                   | Priority | Status         |
| ------ | --------------------------------------------- | -------- | -------------- |
| RM-001 | Parent-child relationships                    | P0       | ✅ Implemented |
| RM-002 | Spousal relationships with status tracking    | P0       | ✅ Implemented |
| RM-003 | Sibling relationships                         | P0       | ✅ Implemented |
| RM-004 | Adoption and step-family relationships        | P1       | ✅ Implemented |
| RM-005 | Relationship events (marriage, divorce dates) | P1       | ✅ Implemented |
| RM-006 | Relationship validation (conflict detection)  | P1       | ✅ Implemented |
| RM-007 | Multiple marriages support                    | P1       | ✅ Implemented |

### 4.2 GEDCOM Support

| ID     | Requirement                        | Priority | Status                         |
| ------ | ---------------------------------- | -------- | ------------------------------ |
| GC-001 | Import GEDCOM 5.5/5.5.1 files      | P0       | ✅ Implemented                 |
| GC-002 | Export to GEDCOM format            | P0       | ✅ Implemented (has known bug) |
| GC-003 | Handle malformed GEDCOM gracefully | P1       | ⚠️ Partial                     |
| GC-004 | Preserve GEDCOM extensions         | P2       | 🔴 Not Started                 |

### 4.3 Trust & Verification System

#### 4.3.1 Trust Levels

| ID     | Requirement                                 | Priority | Status  |
| ------ | ------------------------------------------- | -------- | ------- |
| TL-001 | Numeric trust score (0-100) per user        | P0       | 📋 Stub |
| TL-002 | Trust earned through verified contributions | P1       | 📋 Stub |
| TL-003 | Trust decay for inactive users              | P2       | 📋 Stub |
| TL-004 | Trust relationships between users           | P1       | 📋 Stub |

#### 4.3.2 Relationship Verification

| ID     | Requirement                                | Priority | Status  |
| ------ | ------------------------------------------ | -------- | ------- |
| RV-001 | Suggest new relationships for verification | P0       | 📋 Stub |
| RV-002 | Multi-party confirmation workflow          | P0       | 📋 Stub |
| RV-003 | High-trust user override capability        | P1       | 📋 Stub |
| RV-004 | Verification audit trail                   | P1       | 📋 Stub |

### 4.4 Deduplication & Merging

| ID     | Requirement                                        | Priority | Status  |
| ------ | -------------------------------------------------- | -------- | ------- |
| DD-001 | Automatic duplicate detection using graph analysis | P0       | 📋 Stub |
| DD-002 | Confidence scoring for duplicate matches           | P1       | 📋 Stub |
| DD-003 | User-initiated merge suggestions                   | P1       | 📋 Stub |
| DD-004 | Admin approval for merges                          | P1       | 📋 Stub |
| DD-005 | Merge history and undo capability                  | P2       | 📋 Stub |

### 4.5 Search & Discovery

| ID     | Requirement                            | Priority | Status  |
| ------ | -------------------------------------- | -------- | ------- |
| SD-001 | Search persons by name, date, location | P0       | 📋 Stub |
| SD-002 | Full-text search across trees          | P1       | 📋 Stub |
| SD-003 | Elasticsearch-powered indexing         | P1       | 📋 Stub |
| SD-004 | Match score ranking                    | P1       | 📋 Stub |
| SD-005 | Connection path visualization          | P2       | 📋 Stub |

### 4.6 Media Management

| ID     | Requirement                            | Priority | Status         |
| ------ | -------------------------------------- | -------- | -------------- |
| MM-001 | Upload images, documents, audio, video | P0       | ⚠️ Partial     |
| MM-002 | S3-compatible storage (Garage)         | P0       | ✅ Implemented |
| MM-003 | Media tagging to persons/events        | P1       | 📋 Stub        |
| MM-004 | Thumbnail generation                   | P1       | 📋 Stub        |
| MM-005 | Facial recognition for auto-tagging    | P2       | 📋 Stub        |
| MM-006 | Video transcoding                      | P2       | 📋 Stub        |
| MM-007 | Watermarking                           | P2       | 📋 Stub        |

### 4.7 Notifications

| ID     | Requirement                         | Priority | Status         |
| ------ | ----------------------------------- | -------- | -------------- |
| NF-001 | In-app notifications                | P0       | ⚠️ Partial     |
| NF-002 | Email notifications                 | P0       | ✅ Implemented |
| NF-003 | Notification preferences management | P1       | 📋 Stub        |
| NF-004 | Push notifications (mobile)         | P2       | 📋 Stub        |
| NF-005 | SMS notifications                   | P2       | 📋 Stub        |

### 4.8 Analytics & Insights

| ID     | Requirement                   | Priority | Status     |
| ------ | ----------------------------- | -------- | ---------- |
| AN-001 | Platform usage metrics        | P1       | 📋 Stub    |
| AN-002 | Top contributors leaderboard  | P1       | 📋 Stub    |
| AN-003 | Tree health indicators        | P2       | 📋 Stub    |
| AN-004 | A/B testing framework         | P2       | 📋 Stub    |
| AN-005 | Grafana dashboard integration | P1       | ⚠️ Partial |

### 4.9 Community Marketplace

| ID     | Requirement                           | Priority | Status  |
| ------ | ------------------------------------- | -------- | ------- |
| CM-001 | Share resources, tools, documentation | P1       | 📋 Stub |
| CM-002 | Category and tag-based organization   | P1       | 📋 Stub |
| CM-003 | Rating and review system              | P2       | 📋 Stub |
| CM-004 | Messaging between users               | P2       | 📋 Stub |
| CM-005 | Payment integration (Stripe/PayPal)   | P3       | 📋 Stub |

### 4.10 Localization

| ID     | Requirement                                       | Priority | Status  |
| ------ | ------------------------------------------------- | -------- | ------- |
| LO-001 | UI translation framework                          | P1       | 📋 Stub |
| LO-002 | Name parsing rules by culture                     | P2       | 📋 Stub |
| LO-003 | Calendar system support (Gregorian, Julian, etc.) | P2       | 📋 Stub |
| LO-004 | RTL language support                              | P2       | 📋 Stub |

### 4.11 DNA Integration

| ID      | Requirement                        | Priority | Status         |
| ------- | ---------------------------------- | -------- | -------------- |
| DNA-001 | Store DNA test data per person     | P2       | ✅ Implemented |
| DNA-002 | Integration with testing providers | P2       | 📋 Stub        |
| DNA-003 | Genetic match suggestions          | P3       | 📋 Stub        |

---

## 5. System Architecture

### 5.1 Architecture Overview

Dzinza follows a **microservices architecture** with:

- **REST APIs** for synchronous CRUD operations
- **Event-driven messaging** for asynchronous notifications and updates
- **Service mesh** for secure, observable inter-service communication
- **Graph database** (Neo4j) for relationship-centric data

### 5.2 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React + TypeScript)                   │
│                                   Port: 5173                                 │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY / LOAD BALANCER                        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
        ▼                              ▼                              ▼
┌───────────────┐            ┌───────────────┐            ┌───────────────┐
│ Auth Service  │            │  Genealogy    │            │    Media      │
│   (8003)      │            │   Service     │            │   Storage     │
│               │            │   (8006)      │            │   (8009)      │
└───────┬───────┘            └───────┬───────┘            └───────┬───────┘
        │                            │                            │
        └────────────────────────────┼────────────────────────────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        │                            │                            │
        ▼                            ▼                            ▼
┌───────────────┐            ┌───────────────┐            ┌───────────────┐
│  PostgreSQL   │            │    Neo4j      │            │   Garage S3   │
│   (5432)      │            │ (7474/7687)   │            │   (39000)     │
└───────────────┘            └───────────────┘            └───────────────┘
        │                            │                            │
        └────────────────────────────┼────────────────────────────┘
                                     │
                                     ▼
                          ┌───────────────────┐
                          │  Redis (6379)     │
                          │  Sessions/Cache   │
                          └───────────────────┘
```

### 5.3 Technology Stack

#### Frontend

| Component  | Technology                | Version |
| ---------- | ------------------------- | ------- |
| Framework  | React                     | 18.2.0  |
| Language   | TypeScript                | 5.4.5   |
| Build Tool | Vite                      | 5.2.0   |
| Testing    | Vitest, Playwright        | -       |
| Styling    | TailwindCSS (recommended) | -       |

#### Backend

| Component   | Technology      | Version |
| ----------- | --------------- | ------- |
| Framework   | FastAPI         | Latest  |
| Language    | Python          | 3.11+   |
| ASGI Server | Uvicorn         | Latest  |
| API Spec    | OpenAPI 3.0/3.1 | -       |

#### Databases

| Database           | Purpose                          | Port       |
| ------------------ | -------------------------------- | ---------- |
| PostgreSQL 17.5    | User accounts, relational data   | 5432       |
| Neo4j 5.18         | Family trees, relationships      | 7474, 7687 |
| MongoDB 8.0        | Document storage                 | 27017      |
| Redis 8.0          | Caching, sessions, rate limiting | 6379       |
| Elasticsearch 8.12 | Full-text search                 | 9200       |

#### Storage

| Component      | Technology             | Ports       |
| -------------- | ---------------------- | ----------- |
| Object Storage | Garage (S3-compatible) | 39000-39003 |

#### Monitoring

| Component  | Technology | Port |
| ---------- | ---------- | ---- |
| Metrics    | Prometheus | 9091 |
| Dashboards | Grafana    | 3300 |

### 5.4 Service Communication Patterns

#### Synchronous (REST)

- Client ↔ Service API calls
- Service-to-service queries
- CRUD operations

#### Asynchronous (Events)

```
Event Topics:
├── user.banned
├── media.uploaded
├── relationship.verified
├── audit.log.created
├── analytics.updated
├── PersonCreated
├── RelationshipSuggested
├── RelationshipConfirmed
├── TrustScoreUpdated
├── AccessRequested
├── DuplicateDetected
├── PersonMerged
└── NotificationSent
```

---

## 6. Microservices Inventory

### 6.1 Service Matrix

| Service                   | Port | Database                  | Status      | Effort Est.    |
| ------------------------- | ---- | ------------------------- | ----------- | -------------- |
| Auth Service              | 8003 | PostgreSQL, Redis         | Stub        | 11 person-days |
| Genealogy Service         | 8006 | Neo4j                     | Functional  | 6 person-days  |
| Media Storage Service     | 8009 | Garage, PostgreSQL        | Partial     | 13 person-days |
| Audit History Service     | 8002 | PostgreSQL                | Partial     | 6 person-days  |
| Search Discovery Service  | 8012 | Elasticsearch             | Stub        | 12 person-days |
| Admin Moderation Service  | 8000 | PostgreSQL                | Stub        | 7 person-days  |
| Analytics Service         | 8001 | PostgreSQL, Elasticsearch | Stub        | 15 person-days |
| Community Marketplace     | 8004 | PostgreSQL                | Stub        | 14 person-days |
| Deduplication Service     | 8005 | Neo4j, PostgreSQL         | Stub        | 14 person-days |
| Notification Service      | 8010 | PostgreSQL, Redis         | Partial     | 10 person-days |
| Graph Query Service       | 8007 | Neo4j                     | Not Started | 15 person-days |
| Help & Support Service    | 8014 | PostgreSQL, MongoDB       | Stub        | 10 person-days |
| Localization Service      | 8008 | PostgreSQL                | Stub        | 10 person-days |
| Relationship Verification | 8011 | Neo4j, PostgreSQL         | Stub        | 8 person-days  |
| Trust Access Control      | 8013 | Neo4j, PostgreSQL         | Stub        | 12 person-days |
| Content Moderation AI     | -    | -                         | Stub        | 15 person-days |
| Integration Service       | -    | -                         | Stub        | 10 person-days |
| Backup Recovery Service   | -    | -                         | Stub        | 8 person-days  |

### 6.2 Service Descriptions

#### 6.2.1 Authentication Service

**Purpose:** User registration, login, password management, MFA, social login, JWT token management

**Key Endpoints:**

- `POST /register` - User registration
- `POST /login` - Email/password login
- `POST /login/google` - Google OAuth
- `POST /login/facebook` - Facebook OAuth
- `POST /login/apple` - Apple Sign-In
- `POST /login/linkedin` - LinkedIn OAuth
- `POST /refresh_token` - Refresh JWT tokens
- `POST /blacklist_token` - Invalidate tokens
- `POST /enable_email_mfa` - Enable email MFA
- `POST /verify_email_mfa` - Verify MFA code
- `POST /assign_role` - Assign user roles
- `POST /revoke_role` - Revoke user roles

**Features Implemented:**

- ✅ User registration with password validation
- ✅ JWT-based authentication
- ✅ Token refresh and blacklisting
- ✅ Rate limiting via Redis
- ✅ Email MFA
- ✅ Google OAuth integration
- ⚠️ Facebook, Apple, LinkedIn (placeholder)

#### 6.2.2 Genealogy Service

**Purpose:** Family tree and person management, relationships, GEDCOM import/export

**Key Endpoints:**

- `POST /familytrees` - Create family tree
- `GET /familytrees` - List accessible trees
- `GET /familytrees/{id}` - Get tree details
- `GET /familytrees/{id}/statistics` - Tree statistics
- `POST /persons` - Create person
- `GET /persons/{id}` - Get person details
- `PUT /persons/{id}` - Update person
- `DELETE /persons/{id}` - Remove person
- `POST /relationships` - Create relationship
- `POST /familytrees/import/gedcom` - Import GEDCOM
- `GET /familytrees/{id}/export/gedcom` - Export GEDCOM
- `POST /persons/{id}/dna` - Set DNA data
- `POST /persons/{id}/historical_records` - Add historical records

**Features Implemented:**

- ✅ Full CRUD for family trees
- ✅ Full CRUD for persons
- ✅ Relationship management
- ✅ GEDCOM import/export (export has bug)
- ✅ DNA data storage
- ✅ Historical records linking
- ✅ Tree statistics

#### 6.2.3 Trust & Access Control Service

**Purpose:** Manage user trust scores and access permissions

**Key Endpoints:**

- `GET /trust-levels/{user_id}` - Get user trust score
- `POST /access-requests` - Request tree access
- `GET /access-requests` - List access requests
- `PUT /access-requests/{id}` - Approve/reject requests

#### 6.2.4 Relationship Verification Service

**Purpose:** Multi-party relationship confirmation workflow

**Key Endpoints:**

- `POST /relationship-suggestions` - Create suggestion
- `GET /relationship-suggestions/{id}` - Get suggestion
- `PUT /relationship-suggestions/{id}` - Confirm/reject
- `GET /relationship-suggestions` - List suggestions

#### 6.2.5 Deduplication Service

**Purpose:** Detect and merge duplicate person records

**Key Endpoints:**

- `POST /duplicates/check` - Check for duplicates
- `GET /duplicates/suggestions` - List merge suggestions
- `PUT /duplicates/suggestions/{id}` - Approve/reject merge

#### 6.2.6 Media Storage Service

**Purpose:** Manage uploads of images, documents, and multimedia

**Key Endpoints:**

- `POST /media/upload` - Upload media file
- `GET /media/{mediaId}` - Get media metadata

#### 6.2.7 Notification Service

**Purpose:** User notification management

**Key Endpoints:**

- `GET /notifications` - Get user notifications
- `POST /notifications/{id}/read` - Mark as read

#### 6.2.8 Search & Discovery Service

**Purpose:** Full-text and faceted search

**Key Endpoints:**

- `GET /search/person` - Search persons

#### 6.2.9 Analytics Service

**Purpose:** Platform metrics and insights

**Key Endpoints:**

- `GET /analytics/usage` - Usage metrics
- `GET /analytics/top-contributors` - Leaderboard

#### 6.2.10 Admin & Moderation Service

**Purpose:** Content moderation and user management

**Key Endpoints:**

- `GET /admin/reports` - Get abuse reports
- `POST /admin/users/{userId}/ban` - Ban user

#### 6.2.11 Community Marketplace Service

**Purpose:** Resource sharing platform

**Key Endpoints:**

- `GET /marketplace/items` - List items
- `POST /marketplace/items` - Create item
- `GET /marketplace/items/{id}` - Get item
- `PUT /marketplace/items/{id}` - Update item
- `DELETE /marketplace/items/{id}` - Delete item

#### 6.2.12 Localization Service

**Purpose:** Translation and cultural adaptation

**Key Endpoints:**

- `GET /localization/translate` - Translate phrase
- `GET /localization/calendar-systems` - List calendars
- `GET /localization/name-parsing-rules` - Name parsing rules

#### 6.2.13 Audit History Service

**Purpose:** Track all system actions

**Key Endpoints:**

- `GET /audit/logs` - Query audit logs

#### 6.2.14 Graph Query Service

**Purpose:** GraphQL interface for complex traversals

**GraphQL Schema:**

```graphql
type Query {
  familyTree(id: ID!): FamilyTree
  familyTrees(userId: ID!): [FamilyTree]
  person(id: ID!): Person
  searchPeople(query: String!): [Person]
  relationship(id: ID!): Relationship
}

type Mutation {
  createFamilyTree(name: String!): FamilyTree
  addPerson(treeId: ID!, input: PersonInput!): Person
  updatePerson(id: ID!, input: PersonInput!): Person
  deletePerson(id: ID!): Boolean
  addRelationship(input: RelationshipInput!): Relationship
}
```

---

## 7. Data Models

### 7.1 Graph Data Model (Neo4j)

#### Node Types

**Person**

```cypher
(:Person {
  id: UUID,
  primary_name: JSON,          // {given_name, surname, prefix, suffix, nickname}
  alternate_names: JSON[],
  gender: ENUM,                // MALE, FEMALE, OTHER, UNKNOWN
  birth_date_string: String,
  birth_date_exact: Date,
  birth_place: String,
  death_date_string: String,
  death_date_exact: Date,
  death_place: String,
  is_living: Boolean,
  biography: String,
  clan: String,
  tribe: String,
  traditional_titles: String[],
  privacy_settings: JSON,
  dna_data: JSON,
  historical_records: JSON[],
  facts: JSON[]
})
```

**FamilyTree**

```cypher
(:FamilyTree {
  id: UUID,
  name: String,
  description: String,
  privacy: ENUM,              // PUBLIC, FAMILY_TREE_ONLY, PRIVATE
  settings: JSON,
  owner_id: UUID,
  root_person_id: UUID
})
```

**User**

```cypher
(:User {
  id: UUID,
  email: String,
  trust_score: Float
})
```

#### Edge Types

```cypher
// Family Relationships
(Person)-[:PARENT_OF {
  type: 'BIOLOGICAL' | 'ADOPTIVE' | 'STEP',
  start_date: Date
}]->(Person)

(Person)-[:SPOUSE_OF {
  status: 'MARRIED' | 'DIVORCED' | 'WIDOWED',
  start_date: Date,
  end_date: Date
}]->(Person)

(Person)-[:SIBLING_OF]->(Person)

// Tree Membership
(Person)-[:MEMBER_OF]->(FamilyTree)

// Permissions
(User)-[:HAS_PERMISSION {
  level: 'ADMIN' | 'EDITOR' | 'VIEWER'
}]->(FamilyTree)

// Trust
(User)-[:TRUSTS {score: Float}]->(User)
```

### 7.2 Relational Data Model (PostgreSQL)

#### Users Table

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Token Blacklist

```sql
CREATE TABLE token_blacklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT NOT NULL,
    blacklisted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Audit Logs

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    user_id UUID,
    action VARCHAR(50) NOT NULL,  -- CREATE, UPDATE, DELETE
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    details JSONB
);
```

### 7.3 Key Schema Definitions

#### Person (Pydantic)

```python
class Person(BaseModel):
    id: UUID
    tree_ids: List[UUID]
    primary_name: PersonName
    alternate_names: List[PersonName] = []
    gender: Gender  # MALE, FEMALE, OTHER, UNKNOWN
    birth_date_string: Optional[str]
    birth_date_exact: Optional[str]
    birth_place: Optional[str]
    is_birth_date_estimated: bool = False
    death_date_string: Optional[str]
    death_date_exact: Optional[str]
    death_place: Optional[str]
    is_death_date_estimated: bool = False
    cause_of_death: Optional[str]
    is_living: bool
    identifiers: List[Identifier] = []
    biography: Optional[str]
    notes: Optional[str]
    profile_image_url: Optional[HttpUrl]
    profile_image_id: Optional[UUID]
    clan: Optional[str]
    tribe: Optional[str]
    traditional_titles: List[str] = []
    privacy_settings: Optional[PersonPrivacySettings]
    facts: List[Fact] = []
    potential_duplicates: List[UUID] = []
    merged_into_id: Optional[UUID]
    merged_from_ids: List[UUID] = []
    dna_data: Optional[DNAData]
    historical_records: List[HistoricalRecord] = []
```

#### Relationship

```python
class Relationship(BaseModel):
    id: UUID
    tree_id: UUID
    person1_id: UUID
    person2_id: UUID
    relationship_type: RelationshipType  # SPOUSE, PARENT_CHILD, SIBLING, ADOPTIVE, STEP_PARENT_CHILD, OTHER
    parental_role_person1: Optional[str]
    parental_role_person2: Optional[str]
    spousal_status: Optional[SpousalStatus]  # MARRIED, DIVORCED, WIDOWED, UNKNOWN
    start_date_string: Optional[str]
    start_date_exact: Optional[str]
    end_date_string: Optional[str]
    end_date_exact: Optional[str]
    place: Optional[str]
    notes: Optional[str]
    events: List[RelationshipEvent] = []
```

---

## 8. API Specifications

### 8.1 API Design Principles

1. **RESTful conventions** - Standard HTTP methods and status codes
2. **OpenAPI 3.0/3.1** specifications for all services
3. **JWT Bearer authentication** for protected endpoints
4. **Consistent pagination** with page/limit parameters
5. **Standard error responses** with meaningful messages

### 8.2 Common Response Patterns

#### Paginated List Response

```json
{
  "data": [...],
  "page": 1,
  "limit": 20,
  "total_records": 100,
  "total_pages": 5
}
```

#### Error Response

```json
{
  "detail": "Error message description"
}
```

### 8.3 Authentication Flow

```
1. POST /register → Create account
2. POST /login → Receive access_token + refresh_token
3. Use Authorization: Bearer {access_token} for API calls
4. POST /refresh_token when access_token expires
```

### 8.4 Key API Contracts

All API contracts are defined in OpenAPI specification files located at:

- `docs/openapi/auth-service.yaml`
- `docs/openapi/genealogy-service.yaml`
- `docs/openapi/trust-access-control-service.yaml`
- `docs/openapi/relationship-verification-service.yaml`
- `docs/openapi/deduplication-service.yaml`
- `docs/openapi/notification-service.yaml`
- `docs/openapi/media-storage-service.yaml`
- `docs/openapi/search-discovery-service.yaml`
- `docs/openapi/analytics-service.yaml`
- `docs/openapi/admin-moderation-service.yaml`
- `docs/openapi/community-marketplace-service.yaml`
- `docs/openapi/localization-service.yaml`
- `docs/openapi/audit-history-service.yaml`
- `docs/openapi/graph-query-service.yaml`

---

## 9. Frontend Requirements

### 9.1 Technology Stack

| Component        | Technology                             |
| ---------------- | -------------------------------------- |
| Framework        | React 18.2                             |
| Language         | TypeScript 5.4                         |
| Build Tool       | Vite 5.2                               |
| State Management | Zustand or Redux (recommended)         |
| Data Fetching    | React Query (recommended)              |
| Styling          | TailwindCSS or Chakra UI (recommended) |

### 9.2 Page Structure

```
src/
├── App.tsx              # Main application component
├── main.tsx             # Entry point
├── api.ts               # API client
├── config.ts            # Configuration
├── Login.tsx            # Login page
├── Register.tsx         # Registration page
├── FamilyTree.tsx       # Tree visualization
└── (recommended structure)
    ├── features/
    │   ├── auth/
    │   ├── tree/
    │   ├── person/
    │   ├── suggestions/
    │   ├── media/
    │   └── admin/
    ├── components/
    ├── layout/
    └── services/
```

### 9.3 Core UI Components

#### Layout Components

- `MainLayout` - Application shell
- `SidebarMenu` - Navigation sidebar
- `HeaderBar` - Top navigation
- `Footer` - Page footer

#### Authentication

- `LoginForm` - Email/password login
- `RegisterForm` - User registration
- `PrivateRoute` - Protected route wrapper
- `TrustBadge` - User trust indicator

#### Tree Visualization

- `TreeCanvas` - Interactive canvas for family trees
- `PersonNode` - Individual person display
- `RelationshipLine` - Visual relationship connector
- `AddPersonModal` - Add person dialog

#### Person Management

- `PersonTabs` - Tabbed person view
  - `BioTab` - Biography information
  - `MediaTab` - Photos and documents
  - `TimelineTab` - Life events
  - `SuggestionsTab` - Relationship suggestions
- `PersonHeader` - Person summary
- `VerificationStatus` - Verification indicator

#### Suggestions & Verification

- `SuggestionCard` - Suggestion display
- `SuggestionReviewModal` - Review dialog
- `ConfirmButton` - Confirmation action
- `RejectionModal` - Rejection dialog

#### Media

- `MediaGallery` - Media grid display
- `UploadDropzone` - Drag-drop uploader
- `MediaViewer` - Full media view

#### Search

- `GlobalSearchBar` - Main search input
- `SearchResultsList` - Results display
- `PersonPreviewCard` - Quick person preview

#### Admin

- `ReportsTable` - Abuse reports
- `UserManagementPanel` - User administration
- `BanUserModal` - Ban confirmation

### 9.4 UI/UX Goals

1. **Intuitive canvas-like experience** for building and exploring family trees
2. **Balance between openness and privacy**
3. **Enable verified contribution and trust-building**
4. **Modular UI powered by microservices**
5. **Responsive design** for desktop and mobile

---

## 10. Security & Privacy

### 10.1 Authentication Security

| Measure            | Implementation                                         |
| ------------------ | ------------------------------------------------------ |
| Password Policy    | Min 8 chars, uppercase, lowercase, digit, special char |
| Password Storage   | bcrypt hashing                                         |
| JWT Tokens         | Short-lived access (30 min), longer refresh (7 days)   |
| Token Blacklisting | Supported via database                                 |
| Rate Limiting      | Redis-based, 5 attempts per 10 minutes                 |
| MFA                | Email-based codes (SMS planned)                        |
| OAuth              | Google, Facebook, Apple, LinkedIn                      |

### 10.2 Authorization Model

```
Roles:
├── ADMIN - Full platform access
├── MODERATOR - Content moderation
└── USER - Standard user

Tree Roles:
├── ADMIN - Full tree access
├── EDITOR - Can modify tree
└── VIEWER - Read-only access
```

### 10.3 Privacy Controls

| Level         | Options                           |
| ------------- | --------------------------------- |
| Person        | PUBLIC, FAMILY_TREE_ONLY, PRIVATE |
| Fact          | Individual privacy per field      |
| Tree          | PUBLIC, FAMILY_TREE_ONLY, PRIVATE |
| Living Person | Configurable visibility           |

### 10.4 Data Protection

- **Encryption at rest:** Database encryption
- **Encryption in transit:** TLS/HTTPS
- **Secret management:** Docker secrets
- **Audit logging:** All actions tracked
- **GDPR compliance:** Account deletion support

### 10.5 Secret Management

Secrets are managed via Docker secrets in `/secrets/`:

- `db_password.txt`
- `jwt_secret.txt`
- `jwt_refresh_secret.txt`
- `redis_password.txt`
- `google_client_id.txt`
- `google_client_secret.txt`
- (and more)

---

## 11. Infrastructure & DevOps

### 11.1 Development Environment

#### Quick Start

```bash
# Start full development environment
./scripts/start-dev.sh

# Stop all services
./scripts/stop-dev.sh
```

#### VS Code Tasks

- 🚀 Start Full Development Environment
- 🛑 Stop Development Environment
- 🔧 Start Backend Service Only
- 🎨 Start Frontend Only
- 🧬 Start Genealogy Service
- 🧪 Run All Tests
- 🏗️ Build All Services
- ✨ Lint All Code

### 11.2 Docker Compose Services

| Service       | Image                  | Purpose             |
| ------------- | ---------------------- | ------------------- |
| postgres      | postgres:17.5-alpine   | Relational database |
| mongodb       | mongo:8.0-noble        | Document storage    |
| neo4j         | neo4j:5.18             | Graph database      |
| redis         | redis:8.0.2-alpine     | Caching/sessions    |
| elasticsearch | elasticsearch:8.12.0   | Search engine       |
| prometheus    | prom/prometheus:v3.4.1 | Metrics             |
| grafana       | grafana/grafana:11.1.0 | Dashboards          |
| garage1/2/3   | dxflrs/garage:v2.0.0   | Object storage      |

### 11.3 Service Ports

| Service                   | Port        |
| ------------------------- | ----------- |
| Admin Moderation          | 8000        |
| Analytics                 | 8001        |
| Audit History             | 8002        |
| Auth                      | 8003        |
| Community Marketplace     | 8004        |
| Deduplication             | 8005        |
| Genealogy                 | 8006        |
| Graph Query               | 8007        |
| Localization              | 8008        |
| Media Storage             | 8009        |
| Notification              | 8010        |
| Relationship Verification | 8011        |
| Search Discovery          | 8012        |
| Trust Access Control      | 8013        |
| Help Support              | 8014        |
| Frontend (dev)            | 5173        |
| PostgreSQL                | 5432        |
| MongoDB                   | 27017       |
| Neo4j HTTP                | 7474        |
| Neo4j Bolt                | 7687        |
| Redis                     | 6379        |
| Elasticsearch             | 9200        |
| Prometheus                | 9091        |
| Grafana                   | 3300        |
| Garage S3                 | 39000-39003 |

### 11.4 Kubernetes Support

Kubernetes manifests are available in `/k8s/`:

- `auth-deployment.yaml`
- `frontend-deployment.yaml`
- `genealogy-deployment.yaml`
- `secrets.yaml`

### 11.5 CI/CD Pipeline

- GitHub Actions for automated testing
- Docker image building
- Registry pushing
- Canary and blue/green deployments

---

## 12. Integration Points

### 12.1 External Service Integrations

| Integration           | Purpose              | Status         |
| --------------------- | -------------------- | -------------- |
| Google OAuth          | Social login         | ✅ Implemented |
| Facebook OAuth        | Social login         | ⚠️ Placeholder |
| Apple Sign-In         | Social login         | ⚠️ Placeholder |
| LinkedIn OAuth        | Social login         | ⚠️ Placeholder |
| SMTP (Email)          | Notifications        | ✅ Implemented |
| Twilio (SMS)          | MFA/Notifications    | 📋 Planned     |
| Stripe/PayPal         | Marketplace payments | 📋 Planned     |
| DNA Testing Providers | Genetic genealogy    | 📋 Planned     |

### 12.2 Event-Driven Contracts

WebSocket: `wss://api.dzinza.org/events`
REST Polling: `GET /events?topic={topic}&since={timestamp}`

**Event Topics:**

```json
{
  "user.banned": {
    "user_id": "uuid",
    "banned_by": "uuid",
    "reason": "string",
    "banned_at": "datetime"
  },
  "media.uploaded": {
    "media_id": "uuid",
    "user_id": "uuid",
    "person_id": "uuid|null",
    "filename": "string",
    "url": "string",
    "type": "IMAGE|DOCUMENT|VIDEO|AUDIO"
  },
  "relationship.verified": {
    "relationship_id": "uuid",
    "verified_by": "uuid",
    "status": "CONFIRMED|REJECTED"
  }
}
```

### 12.3 GEDCOM Compatibility

- **Import:** GEDCOM 5.5/5.5.1 format
- **Export:** GEDCOM 5.5.1 format
- **Known Issue:** Duplicate FAM records for children in export

---

## 13. Non-Functional Requirements

### 13.1 Performance

| Metric            | Target        |
| ----------------- | ------------- |
| API Response Time | < 200ms (p95) |
| Page Load Time    | < 3s          |
| Concurrent Users  | 1,000+        |
| Database Queries  | < 50ms        |
| Search Results    | < 500ms       |

### 13.2 Scalability

- Horizontal scaling via Kubernetes
- Database replication support
- CDN for media delivery
- Elasticsearch clustering

### 13.3 Availability

| Metric             | Target         |
| ------------------ | -------------- |
| Uptime             | 99.9%          |
| RTO                | < 4 hours      |
| RPO                | < 1 hour       |
| Maintenance Window | Off-peak hours |

### 13.4 Reliability

- Health check endpoints for all services
- Automatic container restart
- Database backups
- Disaster recovery procedures

### 13.5 Observability

| Component  | Tool                          |
| ---------- | ----------------------------- |
| Metrics    | Prometheus                    |
| Dashboards | Grafana                       |
| Logging    | Centralized (ELK recommended) |
| Tracing    | Distributed tracing (planned) |

### 13.6 Testing Requirements

| Type              | Coverage Target       |
| ----------------- | --------------------- |
| Unit Tests        | > 80%                 |
| Integration Tests | Key flows             |
| E2E Tests         | Critical paths        |
| Load Tests        | 1000 concurrent users |

---

## 14. Development Roadmap

### 14.1 Phase 1: Foundation (Current)

**Duration:** 0-3 months

| Priority | Item                                 | Status     |
| -------- | ------------------------------------ | ---------- |
| P0       | Auth Service - DB integration        | 🔴 Todo    |
| P0       | Genealogy Service - Bug fixes        | 🔴 Todo    |
| P0       | Core frontend components             | ⚠️ Partial |
| P1       | Audit History - Full implementation  | 🔴 Todo    |
| P1       | Media Storage - Metadata persistence | 🔴 Todo    |

**Estimated Effort:** ~40 person-days

### 14.2 Phase 2: Core Features (Months 3-6)

| Priority | Item                                            |
| -------- | ----------------------------------------------- |
| P0       | Search Discovery - Elasticsearch                |
| P0       | Trust Access Control - Full implementation      |
| P0       | Relationship Verification - Full implementation |
| P1       | Deduplication - Algorithm implementation        |
| P1       | Notification - Full implementation              |
| P1       | Admin Moderation - Full implementation          |

**Estimated Effort:** ~70 person-days

### 14.3 Phase 3: Enhanced Features (Months 6-9)

| Priority | Item                          |
| -------- | ----------------------------- |
| P1       | Graph Query Service (GraphQL) |
| P1       | Analytics Service             |
| P1       | Community Marketplace         |
| P2       | Localization Service          |
| P2       | Help & Support Service        |

**Estimated Effort:** ~65 person-days

### 14.4 Phase 4: Advanced Features (Months 9-12)

| Priority | Item                                |
| -------- | ----------------------------------- |
| P2       | DNA Integration                     |
| P2       | Content Moderation AI               |
| P2       | Mobile applications                 |
| P3       | Backup & Recovery automation        |
| P3       | Integration Service (external APIs) |

**Estimated Effort:** ~60 person-days

### 14.5 Total Effort Summary

| Phase   | Effort  | Cumulative |
| ------- | ------- | ---------- |
| Phase 1 | 40 days | 40 days    |
| Phase 2 | 70 days | 110 days   |
| Phase 3 | 65 days | 175 days   |
| Phase 4 | 60 days | 235 days   |

---

## 15. Success Metrics

### 15.1 User Metrics

| Metric                  | Target (Year 1) |
| ----------------------- | --------------- |
| Registered Users        | 25,000          |
| Monthly Active Users    | 10,000          |
| Daily Active Users      | 2,500           |
| User Retention (30-day) | > 40%           |

### 15.2 Content Metrics

| Metric                 | Target (Year 1) |
| ---------------------- | --------------- |
| Family Trees Created   | 5,000           |
| Persons Added          | 100,000         |
| Relationships Verified | 50,000          |
| Media Uploaded         | 25,000          |

### 15.3 Quality Metrics

| Metric                       | Target     |
| ---------------------------- | ---------- |
| Duplicate Detection Rate     | > 80%      |
| Verification Completion Rate | > 60%      |
| User Trust Score Average     | > 50       |
| Support Ticket Resolution    | < 24 hours |

### 15.4 Technical Metrics

| Metric               | Target  |
| -------------------- | ------- |
| API Availability     | 99.9%   |
| Error Rate           | < 0.1%  |
| Response Time (p95)  | < 200ms |
| Deployment Frequency | Weekly  |

---

## 16. Appendices

### 16.1 Glossary

| Term         | Definition                                               |
| ------------ | -------------------------------------------------------- |
| Family Tree  | A hierarchical representation of family relationships    |
| GEDCOM       | Standard format for genealogical data interchange        |
| Person       | An individual in a family tree                           |
| Relationship | Connection between two persons (parent, spouse, sibling) |
| Trust Score  | Numerical measure of user reliability (0-100)            |
| Verification | Process of confirming relationship accuracy              |
| Merge        | Combining duplicate person records                       |
| Branch       | Subset of a family tree                                  |

### 16.2 References

- [Neo4j Documentation](https://neo4j.com/docs/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [GEDCOM Specification](https://www.gedcom.org/)
- [OpenAPI Specification](https://swagger.io/specification/)

### 16.3 Document History

| Version | Date       | Author      | Changes                   |
| ------- | ---------- | ----------- | ------------------------- |
| 1.0     | 2026-01-19 | AI Analysis | Initial comprehensive PRD |

### 16.4 Open Questions

1. **DNA Integration:** Which DNA testing providers should be prioritized?
2. **Mobile Strategy:** Native apps vs. PWA?
3. **Monetization:** Freemium model vs. subscription?
4. **Offline Support:** Required for community organizers?
5. **Blockchain:** Verification record immutability?

### 16.5 Known Issues

1. **GEDCOM Export Bug:** Duplicate FAM records for children
2. **Auth Service:** Social login implementations are placeholders
3. **Most Services:** Using in-memory storage instead of databases
4. **Frontend:** Minimal implementation, needs expansion

---

_This PRD is a living document and should be updated as the project evolves._
