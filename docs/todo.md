# Updated FamilyTree Project To-Do List

**Project Status Overview**

This document outlines the pending implementation work for the FamilyTree project. The overall architecture is well-defined, with a microservices structure, OpenAPI specifications, and a `docker-compose.yml` file that orchestrates the services and databases.

**IMPORTANT:** Many services have been stubbed out. This means that while the files and function signatures exist, the underlying implementation is a placeholder. These stubs use in-memory data structures (like Python lists) and do not persist data. All services, including those marked as "complete" in the original `todo.md`, need to be implemented to connect to the appropriate databases and handle production-level requirements like configuration management, error handling, and security.

**Key Technologies:**
*   **Databases:** PostgreSQL, MongoDB, Neo4j, Redis, Elasticsearch
*   **Storage:** Garage (S3-compatible)
*   **Backend:** Python (FastAPI)

---

## Admin Moderation Service
**Status:** Implemented (Stub)
**Primary Database:** PostgreSQL

### Implementation Tasks
- [ ] **Connect to PostgreSQL:** Establish a connection to the PostgreSQL database.
- [ ] **Implement Database Schema:** Create the necessary tables for content reports, user bans, and moderation logs.
- [ ] **Refactor Handlers:** Re-implement all existing handlers to use the PostgreSQL database for data storage and retrieval.
- [ ] **Configuration:** Load database credentials and other configurations from environment variables or secrets files.

### Feature Checklist (from original todo.md)
- [x] **Report Content:** Create API endpoint for users to report content
- [x] **View Reported Content:** Create API endpoint for moderators to view a queue of reported content
- [x] **Approve Content:** Create API endpoint for moderators to approve reported content
- [x] **Reject Content:** Create API endpoint for moderators to reject reported content
- [x] **Delete Content:** Create API endpoint for moderators to delete reported content
- [x] **Implement Report Categories:** Create predefined categories for content reports (spam, inappropriate, false info, etc.)
- [x] **Create Report Priority System:** Implement priority levels for reports based on severity
- [x] **Implement Bulk Moderation Actions:** Create endpoints for bulk approve/reject/delete operations
- [x] **Create Auto-Moderation Rules:** Implement automated content filtering based on keywords/patterns
- [x] **Implement Content Appeal System:** Create API endpoints for users to appeal moderation decisions
- [x] **Ban User:** Create API endpoint for moderators to ban a user
- [x] **Suspend User:** Create API endpoint for moderators to suspend a user
- [x] **Implement Temporary Bans:** Create functionality for time-limited user suspensions
- [x] **Create User Warning System:** Implement progressive warning system before bans
- [x] **Implement IP-based Blocking:** Create functionality to block by IP address
- [x] **Create User Unban Process:** Implement endpoints for reviewing and lifting bans
- [x] **Create Moderation Log Schema:** Create a database schema for logging moderation actions
- [x] **Log Moderation Action:** Implement a service to log all moderation actions to the database
- [x] **Implement Moderator Performance Tracking:** Track response times and decision accuracy per moderator
- [x] **Create Moderation Statistics Dashboard:** Build dashboard showing moderation metrics and trends
- [x] **Implement Escalation System:** Create process for escalating complex cases to senior moderators

---

## Analytics Service
**Status:** Implemented (Stub)
**Primary Database:** PostgreSQL / Elasticsearch

### Implementation Tasks
- [ ] **Connect to Databases:** Establish connections to PostgreSQL (for storing analytics data) and Elasticsearch (for querying and aggregation).
- [ ] **Implement Data Pipelines:** Create a system to collect and process analytics data from other services.
- [ ] **Refactor Handlers:** Re-implement all existing handlers to use the databases.
- [ ] **Integrate with Grafana:** The `docker-compose.yml` includes Grafana. Create dashboards to visualize the analytics data. This task was unchecked in the original `todo.md`.
- [ ] **A/B Testing Frontend:** Implement the frontend for A/B testing. This task was unchecked in the original `todo.md`.

### Feature Checklist
- [x] **Track User Sign-ups:** Implement tracking for user sign-ups
- [x] **Track User Logins:** Implement tracking for user logins
- [x] **Track Session Duration:** Implement tracking for user session duration
- [x] **Track User Retention:** Implement cohort analysis for user retention rates
- [x] **Track Feature Usage:** Monitor which features are most/least used
- [x] **Track User Journey:** Implement funnel analysis for key user flows
- [x] **Track Geographic Distribution:** Monitor user distribution by location
- [x] **Track API Usage:** Implement tracking for API endpoint usage
- [x] **Track API Response Times:** Monitor average response times per endpoint
- [x] **Track Error Rates:** Monitor 4xx and 5xx error rates by endpoint
- [x] **Monitor Database Performance:** Track query performance and slow queries
- [x] **Implement Real-time Alerts:** Set up alerts for performance anomalies
- [x] **Create Daily Active Users Dashboard:** Create a dashboard to display daily active users
- [x] **Create Monthly Active Users Dashboard:** Create a dashboard to display monthly active users
- [x] **Create API Usage Dashboard:** Create a dashboard to display API usage patterns
- [x] **Create Revenue Analytics Dashboard:** Track marketplace transaction volumes and revenue
- [x] **Create Content Growth Dashboard:** Monitor family tree and profile creation rates
- [x] **Generate Demographic Reports:** Set up a process for generating weekly user demographic reports
- [x] **Generate Behavior Reports:** Set up a process for generating weekly user behavior reports
- [x] **Create Custom Report Builder:** Allow admins to create custom analytics reports
- [x] **Implement A/B Testing Backend:** Implement backend for A/B testing framework
- [x] **Create A/B Test Results Dashboard:** Build interface for analyzing test results
- [x] **Set up Data Export:** Implement functionality to export analytics data

---

## Audit History Service
**Status:** Not Implemented
**Primary Database:** PostgreSQL

### Implementation Tasks
- [ ] **Connect to PostgreSQL:** Establish a connection to the PostgreSQL database.
- [ ] **Create Log Schema:** Create a database schema for logging user actions.
- [ ] **Implement Log Handlers:** Implement the API endpoints defined in the OpenAPI specification (`/audit/logs`).
- [ ] **Log Create/Update/Delete Actions:** Implement a service to log user actions.
- [ ] **Implement Search and Filtering:** Implement the search and filtering functionality for the audit logs.
- ... (all unchecked items from the original todo.md are still valid)

---

## Auth Service
**Status:** Implemented (Stub)
**Primary Database:** PostgreSQL

### Implementation Tasks
- [ ] **Connect to PostgreSQL:** Establish a connection to the PostgreSQL database.
- [ ] **Implement User Schema:** Create the `users` table and other related tables for roles, permissions, and social accounts.
- [ ] **Refactor Handlers:** Re-implement all handlers (`register`, `login`, `MFA`, etc.) to use the PostgreSQL database.
- [ ] **Secure Secrets:** Load `JWT_SECRET` and other secrets from environment variables or the secrets files defined in `docker-compose.yml`.
- [ ] **Update OpenAPI Spec:** The current OpenAPI spec is incomplete. Update it to include all the implemented endpoints.

### Feature Checklist
- [x] **Register User:** Create API endpoint for user registration
- [x] **Login User:** Create API endpoint for user login
- [x] **Generate Tokens:** Implement JWT generation for access and refresh tokens
- [x] **Implement Token Refresh:** Create endpoint for refreshing access tokens
- [x] **Implement Token Blacklisting:** Track and invalidate compromised tokens
- [x] **Implement Session Management:** Track active user sessions across devices
- [x] **Implement Google Login:** Implement Google social login
- [x] **Implement Facebook Login:** Implement Facebook social login
- [x] **Implement Apple Login:** Implement Apple social login
- [x] **Implement LinkedIn Login:** Implement LinkedIn social login for professional networking
- [x] **Handle Social Account Linking:** Allow linking multiple social accounts to one profile
- [x] **Implement Email MFA:** Implement email-based MFA
- [x] **Implement App MFA:** Implement authenticator app-based MFA
- [x] **Implement SMS MFA:** Implement SMS-based MFA
- [x] **Implement Hardware Key Support:** Support FIDO2/WebAuthn hardware keys
- [x] **Create MFA Recovery Codes:** Generate backup codes for MFA recovery
- [x] **Create Role Schema:** Create a database schema for user roles and permissions
- [x] **Assign Role:** Create API endpoint for assigning a user role
- [x] **Revoke Role:** Create API endpoint for revoking a user role
- [x] **Implement Permission Inheritance:** Create hierarchical permission system
- [x] **Create Custom Permissions:** Allow fine-grained custom permissions per user
- [x] **Reset Password:** Implement password reset functionality via email
- [x] **Recover Account:** Implement account recovery functionality
- [x] **Implement Account Verification:** Email verification for new accounts
- [x] **Implement Account Deactivation:** Allow users to deactivate their accounts
- [x] **Implement Account Deletion:** GDPR-compliant account deletion with data retention rules
- [x] **Create Password Policy:** Enforce strong password requirements
- [x] **Implement Login Rate Limiting:** Prevent brute force attacks

---

## Community Marketplace Service
**Status:** Partially Implemented (Stub)
**Primary Database:** PostgreSQL

### Implementation Tasks
- [ ] **Connect to PostgreSQL:** Establish a connection to the PostgreSQL database.
- [ ] **Implement Database Schema:** Create tables for listings, categories, etc.
- [ ] **Refactor Existing Handlers:** Re-implement the "Listing Management" and "Search and Discovery" handlers to use the database.
- [ ] **Implement Messaging System:** This was unchecked. Design and implement a messaging system for buyers and sellers.
- [ ] **Implement Payment Processing:** This was unchecked. Integrate with a payment provider like Stripe or PayPal.
- [ ] **Implement Rating and Review System:** This was unchecked. Design and implement a rating and review system.
- [x] **Create Listing:** Create an API endpoint for users to create a new listing
- [x] **Read Listing:** Create an API endpoint for users to view a specific listing
- [x] **Read User's Listings:** Create an API endpoint for users to view their own listings
- [x] **Update Listing:** Create an API endpoint for users to update a listing
- [x] **Delete Listing:** Create an API endpoint for users to delete a listing
- [x] **Implement Listing Categories:** Create predefined categories for marketplace items
- [x] **Implement Listing Status:** Track listing states (draft, active, sold, expired)
- [x] **Implement Listing Expiration:** Automatically expire old listings
- [x] **Create Listing Analytics:** Track views, inquiries, and conversion rates per listing
- [x] **Search Listings:** Implement a search API for listings with keyword search
- [x] **Filter Listings:** Implement filtering options for search API (e.g., by category, price)
- [x] **Implement Advanced Search:** Add filters for condition, location radius, date posted
- [x] **Create Search Suggestions:** Provide autocomplete suggestions for search queries
- [x] **Implement Saved Searches:** Allow users to save and get alerts for search criteria
- [x] **Create Featured Listings:** Implement promoted/featured listing functionality

---

## Deduplication Service
**Status:** Implemented (Stub)
**Primary Database:** Neo4j / PostgreSQL

### Implementation Tasks
- [ ] **Connect to Databases:** Establish connections to Neo4j (for finding duplicate profiles in the graph) and PostgreSQL (for storing merge history, etc.).
- [ ] **Refactor Algorithms:** Re-implement the deduplication algorithms to query the Neo4j database.
- [ ] **Implement Merge/Resolution Logic:** Re-implement the merge and resolution logic to modify the data in Neo4j.
- [ ] **Implement User Interface:** The UI for reviewing and managing duplicates was unchecked. This needs to be implemented.
- [x] **Develop Name/DOB Algorithm:** Develop an algorithm to identify duplicate profiles based on name and date of birth
- [x] **Develop Email Algorithm:** Develop an algorithm to identify duplicate profiles based on email address
- [x] **Implement Fuzzy Name Matching:** Handle name variations and typos
- [x] **Develop Address Algorithm:** Identify duplicates based on address similarity
- [x] **Implement Phone Number Matching:** Detect duplicates using phone numbers
- [x] **Create Composite Scoring:** Combine multiple algorithms for confidence scoring
- [x] **Merge Profiles:** Create a process to merge two duplicate profiles
- [x] **Implement Conflict Resolution:** Implement a conflict resolution strategy for merging data
- [x] **Create Data Quality Scoring:** Prioritize higher quality data during merges
- [x] **Implement Rollback Mechanism:** Allow undoing incorrect merges
- [x] **Create Merge History:** Track all merge operations for audit purposes
- [x] **Schedule Nightly Job:** Schedule a nightly job to check for new duplicate profiles
- [x] **Monitor Accuracy:** Implement monitoring for the accuracy of the deduplication process
- [x] **Monitor Effectiveness:** Implement monitoring for the effectiveness of the deduplication process
- [x] **Create Performance Metrics:** Track false positive/negative rates

---

## Genealogy Service
**Status:** Implemented (Stub)
**Primary Database:** Neo4j

### Implementation Tasks
- [ ] **Connect to Neo4j:** Establish a connection to the Neo4j graph database.
- [ ] **Refactor Handlers:** Re-implement all handlers (Create/Read Family Tree, Add/Update/Delete Family Member, etc.) to use Neo4j for data storage and retrieval. The `README.md` provides examples of Cypher queries.
- [ ] **Implement GEDCOM Import/Export:** Re-implement the GEDCOM import/export functionality to work with the Neo4j data model.

### Feature Checklist
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
- [x] **Create DNA Integration:** Connect with DNA testing services for relationship verification
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

## Graph Query Service
**Status:** Not Implemented
**Primary Database:** Neo4j

### Implementation Tasks
- [ ] **Set up GraphQL Server:** Implement a GraphQL server (e.g., using Strawberry for FastAPI).
- [ ] **Define GraphQL Schema:** Define the GraphQL schema based on the Neo4j data model.
- [ ] **Implement Resolvers:** Implement the resolvers to query the Neo4j database.
- [ ] **Implement Security:** Add authentication and authorization middleware to the GraphQL API.
- ... (all unchecked items from the original todo.md are still valid)

---

## Localization Service
**Status:** Not Implemented
**Primary Database:** PostgreSQL or a dedicated translation management system

### Implementation Tasks
- [ ] **Choose Storage Solution:** Decide whether to store translations in PostgreSQL or use a dedicated system.
- [ ] **Implement Translation API:** Build the API for managing and retrieving translations.
- [ ] **Add Translations:** Add translations for different languages.
- ... (all unchecked items from the original todo.md are still valid)

---

## Media Storage Service
**Status:** Not Implemented
**Primary Storage:** Garage (S3-compatible)

### Implementation Tasks
- [ ] **Connect to Garage:** Establish a connection to the Garage S3-compatible storage.
- [ ] **Implement Upload/Download Handlers:** Implement the API endpoints for uploading and downloading media files.
- [ ] **Implement Media Processing:** Implement the services for compressing images, transcoding videos, and generating thumbnails.
- [ ] **Set up CDN:** Configure a CDN to serve the media files.
- ... (all unchecked items from the original todo.md are still valid)

---

## Notification Service
**Status:** Not Implemented
**Primary Database:** PostgreSQL / Redis

### Implementation Tasks
- [ ] **Connect to Databases:** Establish connections to PostgreSQL (for storing notification preferences and history) and Redis (for queuing).
- [ ] **Implement Notification Handlers:** Implement the APIs for sending notifications (Email, Push, SMS).
- [ ] **Integrate with Email/SMS providers:** Integrate with services like SendGrid (for email) or Twilio (for SMS).
- [ ] **Implement Preference Management:** Implement the API for managing user notification preferences.
- ... (all unchecked items from the original todo.md are still valid)

---

## Relationship Verification Service
**Status:** Not Implemented
**Primary Database:** Neo4j / PostgreSQL

### Implementation Tasks
- [ ] **Connect to Databases:** Establish connections to Neo4j (for storing relationship verification status in the graph) and PostgreSQL (for storing evidence documents).
- [ ] **Implement Verification Process:** Implement the API endpoints for requesting, approving, and rejecting relationship verifications.
- [ ] **Implement Evidence Management:** Implement the logic for uploading and managing evidence documents.
- ... (all unchecked items from the original todo.md are still valid)

---

## Search Discovery Service
**Status:** Not Implemented
**Primary Engine:** Elasticsearch

### Implementation Tasks
- [ ] **Connect to Elasticsearch:** Establish a connection to the Elasticsearch service.
- [ ] **Implement Indexing:** Create a process to index data from the other services (e.g., users from PostgreSQL, family tree data from Neo4j) into Elasticsearch.
- [ ] **Implement Search API:** Implement the search API with filtering and ranking.
- [ ] **Implement Recommendations:** Implement the recommendation engine.
- ... (all unchecked items from the original todo.md are still valid)

---

## Trust Access Control Service
**Status:** Not Implemented
**Primary Database:** Neo4j

### Implementation Tasks
- [ ] **Connect to Neo4j:** Establish a connection to the Neo4j database.
- [ ] **Implement Permission Schema:** Design and implement the access control model in the Neo4j graph, as described in the `README.md`.
- [ ] **Implement Access Control API:** Implement the API for granting and revoking access to data.
- [ ] **Implement UI:** Create the UI for managing privacy settings and access.
- ... (all unchecked items from the original todo.md are still valid)

---

## Additional Microservices
The following services were listed in the `todo.md` but have no corresponding files in the `services` directory. They need to be designed and implemented from scratch.

- [ ] **Content Moderation AI Service**
- [ ] **Integration Service**
- [ ] **Backup and Recovery Service**
- [ ] **Help and Support Service**
