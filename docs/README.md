# Open Community Family Tree Platform

## Overview


This platform is designed as a decentralized, community-driven genealogy system where users can self-register, contribute, and verify family trees and relationships. The platform is built on a microservices architecture using a mix of REST APIs and event-driven communication, with a service mesh to ensure secure and reliable inter-service calls.

**Graph Database:**
The platform uses [Neo4j](https://neo4j.com/) as the primary graph database for modeling and querying family trees, relationships, permissions, and recommendations. Neo4j is integrated as a core part of the backend stack and is deployed as a containerized service.

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
- **Graph Database (Neo4j):** Neo4j is used for all relationship-centric data, including family trees, relationships, permissions, and recommendations. Microservices interact with Neo4j via official Python drivers and high-level libraries.
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

- CRUD for persons, family trees, and relationships, all persisted in Neo4j.
- Manage personal facts (birth, death, events).
- Maintain unique person IDs.
- Retrieve family trees and branches using efficient graph traversals.
- Event sourcing of genealogy events.

### 3. Relationship Verification Service

- Suggest relationships between persons.
- Confirm or reject relationship suggestions.
- Track confirmation counts and statuses.
- Send verification events.


### 4. Trust & Access Control Service

- Manage user trust scores based on activity.
- Handle access requests for family trees/branches, with permissions and trust relationships stored in Neo4j.
- Enforce access policies based on trust levels and graph-based permissions.


### 5. Deduplication Service

- Detect duplicate persons across trees using graph queries in Neo4j.
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


## Data Model Highlights (Graph Schema in Neo4j)

The core data model is implemented as a property graph in Neo4j:

### Person (Node)
- Unique identifier (UUID)
- Multiple names with types (birth, married, nickname)
- Identifiers (e.g., external IDs, national IDs)
- Facts (birth, death, marriage events)
- Privacy settings per fact or person

### Family Tree (Node)
- Unique identifier
- Owner and collaborators
- Privacy and access controls
- Branches representing subtrees or segments

### Relationship (Edge)
- Parent-child, spousal, sibling relationships as edges between Person nodes
- Dates and events related to relationships
- Status: confirmed, suggested, rejected

### Suggestion (Node/Edge)
- Relationship or merge suggestions as nodes or edges
- Status and confirmation records
- Timestamps and originators

### Trust Level (Node/Edge)
- Numeric trust score per user (node property)
- Trust relationships as edges between users
- Influences verification power and access

### Permissions (Edge)
- Access permissions modeled as edges between users and family trees or branches

#### Example Graph Model (Cypher)
```
(Person)-[:PARENT_OF]->(Person)
(Person)-[:SPOUSE_OF]->(Person)
(Person)-[:MEMBER_OF]->(FamilyTree)
(User)-[:HAS_PERMISSION {level: 'edit'}]->(FamilyTree)
(User)-[:TRUSTS {score: 0.8}]->(User)
```

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
- **Neo4j is deployed as a dedicated service using the official Docker image.**
- Service mesh for traffic routing, monitoring, and security.
- Centralized logging and tracing for distributed diagnostics.
- Automated CI/CD pipelines with canary and blue/green deployments.

### Example: Adding Neo4j to docker-compose.yaml
```yaml
neo4j:
  image: neo4j:5
  ports:
    - "7474:7474"   # HTTP
    - "7687:7687"   # Bolt (driver)
  environment:
    - NEO4J_AUTH=neo4j/password
```

### Python Integration Example
Install the official driver:
```bash
pip install neo4j
```
Sample usage:
```python
from neo4j import GraphDatabase

driver = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "password"))
with driver.session() as session:
    result = session.run("MATCH (n) RETURN n LIMIT 5")
    for record in result:
        print(record)
```

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

