# Open Community Family Tree Platform

## Overview

This platform is designed as a decentralized, community-driven genealogy system where users can self-register, contribute, and verify family trees and relationships. The platform is built on a microservices architecture using a mix of REST APIs and event-driven communication, with a service mesh to ensure secure and reliable inter-service calls.

---

## Key Principles

- **Uniqueness of Persons:** Each person is uniquely identified; when the same person appears in different family trees or branches, these branches merge to form a connected graph.
- **Trust Model:** Users earn trust based on their contributions and validations. Trust influences access permissions and the weight of relationship confirmations.
- **Relationship Verification:** New relationships require multiple confirmations from trusted users or can be overridden by a highly trusted user.
- **Privacy and Access Control:** Users can control access to family trees or branches based on trust levels and verification status.
- **Community Marketplace:** A platform for sharing knowledge, resources, tools, and documentation to support genealogy research.

---

## Architecture Overview

- **Microservices Architecture:** Each major domain area is encapsulated in a dedicated microservice.
- **Communication:**
  - **REST APIs:** For synchronous CRUD operations and queries.
  - **Event-Driven Messaging:** For asynchronous notifications, trust updates, merges, and other side effects.
- **Service Mesh:** For secure, observable, and reliable communication between microservices.
- **Authentication & Authorization:** JWT tokens with scopes and roles; MFA support.

---

## Core Microservices and API Scopes

### 1. Authentication Service

- User registration, login, password management.
- Multi-Factor Authentication (MFA).
- JWT token issuance and validation.
- Role and permission management.

### 2. Genealogy Service

- CRUD for persons, family trees, and relationships.
- Manage personal facts (birth, death, events).
- Maintain unique person IDs.
- Retrieve family trees and branches.
- Event sourcing of genealogy events.

### 3. Relationship Verification Service

- Suggest relationships between persons.
- Confirm or reject relationship suggestions.
- Track confirmation counts and statuses.
- Send verification events.

### 4. Trust & Access Control Service

- Manage user trust scores based on activity.
- Handle access requests for family trees/branches.
- Enforce access policies based on trust levels.

### 5. Deduplication Service

- Detect duplicate persons across trees.
- Suggest merges with confidence scores.
- Approve or reject merges.
- Trigger branch merging events.

### 6. Notification Service

- Notify users of suggestions, merges, access changes.
- Manage notification read status.
- Support for multiple notification types (email, in-app).

### 7. Community Marketplace Service

- Share resources, tools, and documentation.
- CRUD marketplace items with categories and tags.
- Enable community collaboration and knowledge sharing.

---

## Data Model Highlights

### Person

- Unique identifier (UUID).
- Multiple names with types (birth, married, nickname).
- Identifiers (e.g., external IDs, national IDs).
- Facts (birth, death, marriage events).
- Privacy settings per fact or person.

### Family Tree

- Unique identifier.
- Owner and collaborators.
- Privacy and access controls.
- Branches representing subtrees or segments.

### Relationship

- Parent-child, spousal, sibling relationships.
- Dates and events related to relationships.
- Status: confirmed, suggested, rejected.

### Suggestion

- Relationship or merge suggestions.
- Status and confirmation records.
- Timestamps and originators.

### Trust Level

- Numeric trust score per user.
- Derived from activity and validations.
- Influences verification power and access.

---

## Event Catalog (Sample)

- `PersonCreated`
- `RelationshipSuggested`
- `RelationshipConfirmed`
- `TrustScoreUpdated`
- `AccessRequested`
- `DuplicateDetected`
- `PersonMerged`
- `NotificationSent`

---

## Communication Patterns

- Services emit domain events on key actions.
- Other services subscribe and react asynchronously.
- REST APIs serve synchronous data retrieval and updates.
- Service mesh handles security, retries, and observability.

---

## Deployment Considerations

- Containerized microservices with independent scaling.
- Service mesh for traffic routing, monitoring, and security.
- Centralized logging and tracing for distributed diagnostics.
- Automated CI/CD pipelines with canary and blue/green deployments.

---

## Future Extensions

- Enhanced AI-driven deduplication and relationship inference.
- Deeper integration with external genealogy databases.
- Social features: comments, discussions, shared editing.
- Advanced analytics and visualization of family trees.
- Mobile app with offline support and synchronization.

---

## Summary

This platform aims to empower individuals and communities globally, including in underrepresented regions, to collaboratively build and verify rich family histories while ensuring data privacy, integrity, and trustworthiness.

---

# Contact & Contribution

For questions or to contribute, please open issues or pull requests on the project GitHub repository.

---

