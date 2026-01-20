# FamilyTree Project - Actionable To-Do List & Status

**Project Status Overview (Revised)**

This document provides a realistic and actionable overview of the FamilyTree project. A thorough code review has been completed, and this document reflects the true status of each microservice as of the last review.

The project consists of a mix of fully implemented, partially implemented, and stubbed services. The previous `todo.md` was significantly out of date, marking many implemented services as incomplete and vice-versa. This document corrects those inaccuracies.

**My Key Findings:**
*   **Core services are more complete than previously thought:** The `genealogy_service` (Neo4j), `media_storage_service` (MinIO), and `audit_history_service` (SQLAlchemy) have functional backends and are partially or fully implemented.
*   **Most other services are stubs:** The majority of services exist as "stubs". Their APIs are defined, but the underlying logic uses in-memory data structures (Python lists and dictionaries) and does not persist data. These services require a full implementation of their business logic and database connections.
*   **All services require work:** Even the implemented services have placeholder values (like `owner_id`), missing features, or minor bugs that need to be addressed to be considered production-ready.

**Prioritization:**
The services are now ordered by priority to facilitate iterative development. The goal is to first build a functional core (authentication, genealogy) and then layer on additional features.

---

## 1. Auth Service
**Status:** Implemented (Stub)
**Primary Database:** PostgreSQL
**Effort Estimation:**
*   **Connect to PostgreSQL & Implement Schema:** 3 person-days
*   **Refactor All Handlers for DB persistence:** 5 person-days
*   **Secure JWT Secret Handling:** 1 person-day
*   **Update OpenAPI Spec:** 2 person-days

### Implementation Tasks
- [ ] **Connect to PostgreSQL:** Establish a persistent, production-ready connection to the PostgreSQL database.
- [ ] **Implement Database Schema:** Create the necessary tables for users, roles, permissions, social accounts, and MFA secrets.
- [ ] **Refactor Handlers:** Re-implement all existing handlers (`register`, `login`, `MFA`, social logins, etc.) to use the PostgreSQL database for data storage and retrieval instead of in-memory lists.
- [ ] **Secure Secrets:** Load `JWT_SECRET` and social login credentials from environment variables or the secrets files, removing the hardcoded "secret".
- [ ] **Update OpenAPI Spec:** The current OpenAPI spec is incomplete. Update it to include all implemented endpoints.

### Feature Checklist (Status revised based on code review)
- [ ] **Register User:** Create API endpoint for user registration
- [ ] **Login User:** Create API endpoint for user login
- [ ] **Generate Tokens:** Implement JWT generation for access and refresh tokens
- [ ] **Implement Token Refresh:** Create endpoint for refreshing access tokens
- [ ] **Implement Token Blacklisting:** Track and invalidate compromised tokens
- [ ] **Implement Session Management:** Track active user sessions across devices
- [ ] **Implement Google Login:** Implement Google social login
- [ ] **Implement Facebook Login:** Implement Facebook social login
- [ ] **Implement Apple Login:** Implement Apple social login
- [ ] **Implement LinkedIn Login:** Implement LinkedIn social login
- [ ] **Handle Social Account Linking:** Allow linking multiple social accounts to one profile
- [ ] **Implement Email MFA:** Implement email-based MFA
- [ ] **Implement App MFA:** Implement authenticator app-based MFA
- [ ] **Implement SMS MFA:** Implement SMS-based MFA
- [ ] **Implement Hardware Key Support:** Support FIDO2/WebAuthn hardware keys
- [ ] **Create MFA Recovery Codes:** Generate backup codes for MFA recovery
- [ ] **Create Role Schema:** Create a database schema for user roles and permissions
- [ ] **Assign Role:** Create API endpoint for assigning a user role
- [ ] **Revoke Role:** Create API endpoint for revoking a user role
- [ ] **Implement Permission Inheritance:** Create hierarchical permission system
- [ ] **Create Custom Permissions:** Allow fine-grained custom permissions per user
- [ ] **Reset Password:** Implement password reset functionality via email
- [ ] **Recover Account:** Implement account recovery functionality
- [ ] **Implement Account Verification:** Email verification for new accounts
- [ ] **Implement Account Deactivation:** Allow users to deactivate their accounts
- [ ] **Implement Account Deletion:** GDPR-compliant account deletion with data retention rules
- [ ] **Create Password Policy:** Enforce strong password requirements
- [ ] **Implement Login Rate Limiting:** Prevent brute force attacks

---

## 2. Genealogy Service
**Status:** Implemented (Functional)
**Primary Database:** Neo4j
**Effort Estimation:**
*   **Refine Owner ID Handling:** 1 person-day
*   **Fix GEDCOM Export Bug:** 2 person-days
*   **Code Cleanup & Refinement:** 3 person-days

### Refinement Tasks
- [ ] **Refine Owner ID Handling:** Replace placeholder `owner_id` values with the actual user ID from the authentication context.
- [ ] **Fix GEDCOM Export Bug:** The GEDCOM export function has a known issue with creating duplicate FAM records for children. This needs to be fixed.
- [ ] **Code Cleanup:** Review and refactor the handlers for clarity, error handling, and performance. Add comprehensive comments.

### Feature Checklist (Status verified)
- [x] **Create Family Tree:** Create an API endpoint to create a new family tree
- [x] **Integrate Neo4j as backend:** Add Neo4j to Docker Compose, requirements, and implement connection utility
- [x] **Read Family Tree:** Create an API endpoint to read a family tree
- [x] **Add Family Member:** Create an API endpoint to add a family member to a tree
- [x] **Update Family Member:** Create an API endpoint to edit a family member's details
- [x] **Delete Family Member:** Create an API endpoint to remove a family member from a tree
- [x] **Create Family Tree Templates:** Provide starter templates for different family structures
- [x] **Implement Tree Permissions:** Control who can view/edit different parts of trees
- [x] **Define Parent-Child Model:** Define data models for parent-child relationships
- [x] **Define Spousal Model:** Define data models for spousal relationships
- [x] **Add Relationship:** Create an API endpoint to add a relationship between persons
- [x] **Implement Adoption Relationships:** Handle adoptive vs biological relationships
- [x] **Create Step-Family Support:** Model step-parent/step-child relationships
- [x] **Implement Multiple Marriages:** Handle multiple spouses and divorces
- [x] **Create Relationship Validation:** Validate relationship logic and detect conflicts
- [x] **Implement Custom Fields:** Allow users to add custom attributes to profiles
- [x] **Create Event Timeline:** Track birth, death, marriage, and other life events
- [x] **Implement Source Citations:** Allow citing sources for genealogical information
- [ ] **Create DNA Integration:** Connect with DNA testing services for relationship verification
- [x] **Implement Historical Records:** Link to historical documents and records
- [x] **Visualize as Chart:** Implement a feature to visualize family trees as a chart
- [x] **Visualize as Diagram:** Implement a feature to visualize family trees as a diagram
- [x] **Create Interactive Timeline:** Show family history on an interactive timeline
- [x] **Implement Tree Comparison:** Compare different family trees for common ancestors
- [x] **Export to GEDCOM:** Implement a feature to export family tree data to GEDCOM format
- [x] **Import from GEDCOM:** Implement a feature to import family tree data from GEDCOM format
- [x] **Create PDF Reports:** Generate printable family tree reports
- [x] **Implement Tree Statistics:** Show statistics about tree size, completeness, etc.

---

## 3. Media Storage Service
**Status:** Partially Implemented
**Primary Storage:** Garage (S3-compatible)
**Effort Estimation:**
*   **Implement Metadata Persistence:** 3 person-days
*   **Implement Advanced Media Processing:** 8 person-days
*   **Set up CDN:** 2 person-days

### Implementation Tasks
- [x] **Connect to Garage:** Establish a connection to the Garage S3-compatible storage.
- [x] **Implement Upload/Download Handlers:** Implement the API endpoints for uploading and downloading media files.
- [ ] **Implement Metadata Persistence:** Store media metadata (tags, albums, ACLs) in a database (e.g., PostgreSQL) instead of in-memory dictionaries.
- [ ] **Implement Advanced Media Processing:**
    - [ ] Implement video transcoding using ffmpeg or a similar library.
    - [ ] Implement watermarking for images and videos.
    - [ ] Integrate a real facial recognition service.
- [ ] **Set up CDN:** Configure a CDN (like CloudFront) to serve the media files for better performance.

---

## 4. Audit History Service
**Status:** Partially Implemented
**Primary Database:** PostgreSQL
**Effort Estimation:**
*   **Implement Advanced Features:** 4 person-days
*   **Refine DB Integration:** 2 person-days

### Implementation Tasks
- [x] **Connect to PostgreSQL:** The service is designed to use SQLAlchemy.
- [ ] **Implement Advanced Features:**
    - [ ] Replace in-memory suspicious activity detection with a persistent, robust system.
    - [ ] Implement real alerting mechanisms (e.g., via the Notification Service).
    - [ ] Implement a real anomaly detection engine.
- [ ] **Refine DB Integration:** Ensure the database session management is robust and connection details are loaded from configuration.

---

## 5. Search Discovery Service
**Status:** Implemented (Stub)
**Primary Engine:** Elasticsearch
**Effort Estimation:**
*   **Connect to Elasticsearch & Implement Indexing:** 5 person-days
*   **Implement Search & Recommendation APIs:** 7 person-days

### Implementation Tasks
- [ ] **Connect to Elasticsearch:** Establish a connection to the Elasticsearch service.
- [ ] **Implement Indexing Pipeline:** Create a process to index data from other services (e.g., users from PostgreSQL, family tree data from Neo4j) into Elasticsearch.
- [ ] **Implement Search API:** Re-implement the search API with real queries, filtering, and ranking using Elasticsearch.
- [ ] **Implement Recommendations:** Design and implement the recommendation engine.

---

## 6. Admin Moderation Service
**Status:** Implemented (Stub)
**Primary Database:** PostgreSQL
**Effort Estimation:**
*   **Connect to PostgreSQL & Implement Schema:** 3 person-days
*   **Refactor Handlers for DB persistence:** 4 person-days

### Implementation Tasks
- [ ] **Connect to PostgreSQL:** Establish a connection to the PostgreSQL database.
- [ ] **Implement Database Schema:** Create the necessary tables for content reports, user bans, and moderation logs.
- [ ] **Refactor Handlers:** Re-implement all existing handlers to use the PostgreSQL database for data storage and retrieval.
- [ ] **Configuration:** Load database credentials from environment variables or secrets files.

---

## 7. Analytics Service
**Status:** Implemented (Stub)
**Primary Database:** PostgreSQL / Elasticsearch
**Effort Estimation:**
*   **Connect to Databases & Implement Pipelines:** 6 person-days
*   **Refactor Handlers & Integrate Grafana:** 5 person-days
*   **Implement A/B Testing Frontend:** 4 person-days

### Implementation Tasks
- [ ] **Connect to Databases:** Establish connections to PostgreSQL (for storing analytics data) and Elasticsearch (for querying and aggregation).
- [ ] **Implement Data Pipelines:** Create a system to collect and process analytics data from other services.
- [ ] **Refactor Handlers:** Re-implement all existing handlers to use the databases.
- [ ] **Integrate with Grafana:** Create real dashboards in Grafana to visualize the analytics data.
- [ ] **A/B Testing Frontend:** Implement the frontend for A/B testing in the `ab_testing_frontend` directory.

---

## 8. Community Marketplace Service
**Status:** Implemented (Stub)
**Primary Database:** PostgreSQL
**Effort Estimation:**
*   **Connect to PostgreSQL & Implement Schema:** 4 person-days
*   **Implement Core Features (Messaging, Payments, Reviews):** 10 person-days

### Implementation Tasks
- [ ] **Connect to PostgreSQL:** Establish a connection to the PostgreSQL database.
- [ ] **Implement Database Schema:** Create tables for listings, categories, messages, offers, ratings, and reviews.
- [ ] **Refactor Existing Handlers:** Re-implement all handlers to use the database.
- [ ] **Implement Messaging System:** Design and implement a real-time messaging system for buyers and sellers.
- [ ] **Implement Payment Processing:** Integrate with a payment provider like Stripe or PayPal.
- [ ] **Implement Rating and Review System:** Design and implement a persistent rating and review system.

---

## 9. Deduplication Service
**Status:** Implemented (Stub)
**Primary Database:** Neo4j / PostgreSQL
**Effort Estimation:**
*   **Connect to Databases & Refactor Algorithms:** 8 person-days
*   **Implement Merge Logic & UI:** 6 person-days

### Implementation Tasks
- [ ] **Connect to Databases:** Establish connections to Neo4j (for graph-based profile analysis) and PostgreSQL (for storing merge history).
- [ ] **Refactor Algorithms:** Re-implement the deduplication algorithms to query the Neo4j database instead of in-memory lists.
- [ ] **Implement Merge/Resolution Logic:** Re-implement the merge and resolution logic to modify data in Neo4j.
- [ ] **Implement User Interface:** Build the UI for moderators to review and manage duplicate profiles.

---

## 10. Notification Service
**Status:** Partially Implemented
**Primary Database:** PostgreSQL / Redis
**Effort Estimation:**
*   **Connect to PostgreSQL/Redis:** 3 person-days
*   **Implement Push, SMS, and Webhook Handlers:** 5 person-days
*   **Implement Preference Management:** 2 person-days

### Implementation Tasks
- [x] **Email Sending:** Core email sending via SMTP is functional.
- [ ] **Connect to Databases:** Establish connections to PostgreSQL (for storing notification preferences and history) and Redis (for queuing).
- [ ] **Implement Queuing:** Replace the in-memory `deque` with a robust Redis-based queue.
- [ ] **Implement Additional Notification Handlers:** Implement the APIs for sending Push Notifications and SMS messages, integrating with providers like Twilio.
- [ ] **Implement Preference Management:** Implement a persistent API for managing user notification preferences.

---

## 11. Graph Query Service
**Status:** Not Implemented
**Primary Database:** Neo4j
**Effort Estimation:**
*   **Full Implementation:** 15 person-days

### Implementation Tasks
- [ ] **Set up GraphQL Server:** Implement a GraphQL server (e.g., using Strawberry for FastAPI).
- [ ] **Define GraphQL Schema:** Define the GraphQL schema based on the Neo4j data model.
- [ ] **Implement Resolvers:** Implement the resolvers to query the Neo4j database.
- [ ] **Implement Security:** Add authentication and authorization middleware to the GraphQL API.

---

## 12. Help & Support Service
**Status:** Implemented (Stub)
**Primary Database:** PostgreSQL / MongoDB
**Effort Estimation:**
*   **Connect to Database & Implement Schema:** 4 person-days
*   **Refactor Models and Handlers:** 6 person-days

### Implementation Tasks
- [ ] **Choose and Connect to Database:** Decide on a database (e.g., PostgreSQL for tickets, MongoDB for chats) and establish a connection.
- [ ] **Implement Database Schema:** Create the necessary tables/collections for tickets, chat sessions, and knowledge base articles.
- [ ] **Refactor Models:** Rewrite the `ticket_model`, `chat_model`, and `knowledge_base_model` to use the database instead of in-memory dictionaries.
- [ ] **Implement Placeholder Features:** Implement the Community Forums and Video Tutorials sections with real data.

---

## Other Services (Stubs)
The following services exist in the codebase as stubs. They need to be fully designed and implemented.

- [ ] **Localization Service** (Status: Stub, Effort: 10 person-days)
- [ ] **Relationship Verification Service** (Status: Stub, Effort: 8 person-days)
- [ ] **Trust Access Control Service** (Status: Stub, Effort: 12 person-days)
- [ ] **Content Moderation AI Service** (Status: Stub, Effort: 15 person-days)
- [ ] **Integration Service** (Status: Stub, Effort: 10 person-days)
- [ ] **Backup and Recovery Service** (Status: Stub, Effort: 8 person-days)
