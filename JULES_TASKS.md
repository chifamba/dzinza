# Comprehensive Task Groups for Dzinza Genealogy Platform

This document outlines the 17 primary workstreams for the Dzinza Genealogy Platform, including their core tasks and suggested branch names.

## Workstream 1: DevOps, Infrastructure, and Core Backend Setup
- Branch: `ws/01-devops-infra-backend-setup`
- Tasks:
  - Phase 1: Initial Project Setup & Backend Foundation
    - [COMPLETED] Week 1: Project Setup & Infrastructure (Repository, Dev Env, CI/CD Initial, Docker Config)
    - **[ ] Week 5: Backend Infrastructure (Core) (API Server, PostgreSQL, Migrations, Basic Auth Endpoints)**
  - **[ ] Phase 2 & Ongoing: Enhancements & Production Readiness (Testing Infra, Prod Infra, Security, Microservices, Full CI/CD, General DevOps)**
  - (Detailed tasks as per `ws/01-devops-infra-backend-setup/task.md`)

## Workstream 2: UI/UX Design System & Core Frontend Components
- Branch: `ws/02-ui-ux-design-system`
- Tasks:
  - Phase 1: Core UI Development
    - **[ ] Design System Definition (Guidelines, Principles)**
    - **[ ] Core UI Component Development (Button, Input, Card, Modal, Table, Navigation)**
    - **[ ] Layout System Development (Grid, Header, Sidebar, Footer)**
  - **[ ] General Requirements & Practices (Responsiveness, Accessibility, Reusability, Storybook, Testing)**
  - **[ ] Ongoing Tasks (Maintain, Refactor, Support)**
  - (Detailed tasks as per `ws/02-ui-ux-design-system/task.md`)

## Workstream 3: User Authentication & Authorization Backend
- Branch: `ws/03-auth-backend`
- Tasks:
  - **[ ] Secure user registration (email/password, social logins).**
  - **[ ] Login/logout functionality with session management (JWTs).**
  - **[ ] Password recovery (forgot password, reset password).**
  - **[ ] Role-based access control (RBAC) implementation.**
  - **[ ] Email verification.**
  - **[ ] Secure API endpoints for authentication.**
  - **[ ] Integration with frontend authentication flows.**

## Workstream 4: User Authentication & Authorization Frontend
- Branch: `ws/04-auth-frontend`
- Tasks:
  - **[ ] Registration form and user interface.**
  - **[ ] Login form and user interface.**
  - **[ ] Profile page for password updates.**
  - **[ ] UI for social login buttons.**
  - **[ ] Handling of JWTs/session tokens in the frontend.**
  - **[ ] Protected routes based on authentication status.**
  - **[ ] UI feedback for authentication states (loading, error, success).**
  - **[ ] Integration with backend authentication APIs.**

## Workstream 5: Family Tree Core Backend Logic
- Branch: `ws/05-family-tree-backend`
- Tasks:
  - **[ ] API endpoints for creating, reading, updating, and deleting individuals.**
  - **[ ] API endpoints for establishing and managing relationships (parent-child, spouse, sibling).**
  - **[ ] Logic for calculating indirect relationships (cousins, aunts/uncles, etc.).**
  - **[ ] Data validation for family tree data (e.g., preventing cyclical relationships).**
  - **[ ] Handling of dates, places, and biographical information for individuals.**
  - **[ ] GEDCOM import/export functionality (or similar standard).**

## Workstream 6: Family Tree Core Frontend Visualization
- Branch: `ws/06-family-tree-frontend`
- Status: [PARTIALLY COMPLETED]
  - [COMPLETED] Basic visualization, add/edit profiles, and initial relationship UI are done.
  - [COMPLETED] Core data structures are defined.
- Tasks:
  - **[ ] Interactive family tree visualization component (e.g., using D3.js, Cytoscape.js, or a dedicated library) (Advanced canvas view deferred).**
  - **[ ] Navigation and zooming within the tree (deferred).**
  - **[ ] Display of individual profiles/details from the tree (further enhancements may be needed).**
  - **[ ] Responsive design for various screen sizes (specific to tree components).**

## Workstream 7: User Profile Management Backend
- Branch: `ws/07-user-profile-backend`
- Tasks:
  - **[ ] API endpoints for users to manage their profile information (name, email, avatar).**
  - **[ ] Account settings management (e.g., notification preferences, privacy settings).**
  - **[ ] Secure handling of user data.**

## Workstream 8: User Profile Management Frontend
- Branch: `ws/08-user-profile-frontend`
- Tasks:
  - **[ ] UI for displaying and editing user profile information.**
  - **[ ] Forms for updating account settings.**
  - **[ ] Avatar upload functionality.**
  - **[ ] UI for managing notification and privacy preferences.**

## Workstream 9: Media Management (Photos, Documents) Backend
- Branch: `ws/09-media-backend`
- Tasks:
  - **[ ] API endpoints for uploading images, videos, and documents.**
  - **[ ] Secure file storage solution (e.g., AWS S3, Google Cloud Storage).**
  - **[ ] Metadata extraction and storage for media files (e.g., date, location, tags).**
  - **[ ] Association of media with individuals, families, or events.**
  - **[ ] Thumbnail generation for images/videos.**

## Workstream 10: Media Management (Photos, Documents) Frontend
- Branch: `ws/10-media-frontend`
- Tasks:
  - **[ ] UI for uploading media files.**
  - **[ ] Gallery view for displaying photos and videos.**
  - **[ ] Document viewer or linking.**
  - **[ ] UI for tagging media and associating it with individuals/events.**
  - **[ ] Lightbox or similar for viewing full-size images.**

## Workstream 11: Stories & Events Backend
- Branch: `ws/11-stories-events-backend`
- Tasks:
  - **[ ] API endpoints for creating, reading, updating, and deleting stories or historical events.**
  - **[ ] Association of stories/events with individuals, families, dates, and places.**
  - **[ ] Rich text editing capabilities for story content.**
  - **[ ] Tagging and categorization of stories/events.**

## Workstream 12: Stories & Events Frontend
- Branch: `ws/12-stories-events-frontend`
- Tasks:
  - **[ ] UI for creating and editing stories/events (rich text editor).**
  - **[ ] Timeline view or list view for browsing stories/events.**
  - **[ ] UI for associating stories/events with people in the family tree.**
  - **[ ] Display of stories/events on individual profiles or family pages.**

## Workstream 13: Collaboration & Sharing Backend
- Branch: `ws/13-collaboration-backend`
- Tasks:
  - **[ ] API endpoints for inviting users to collaborate on family trees.**
  - **[ ] Permissions management for shared trees (e.g., view-only, edit access).**
  - **[ ] Notification system for updates or comments on shared trees.**
  - **[ ] Versioning or activity logging for collaborative changes.**

## Workstream 14: Collaboration & Sharing Frontend
- Branch: `ws/14-collaboration-frontend`
- Tasks:
  - **[ ] UI for inviting users and managing collaborators.**
  - **[ ] Display of shared trees and collaborator lists.**
  - **[ ] UI for managing permissions.**
  - **[ ] Notification indicators and a notification center.**
  - **[ ] Commenting system for collaborative discussions.**

## Workstream 15: Search & Discovery Backend
- Branch: `ws/15-search-backend`
- Tasks:
  - **[ ] Implement search functionality across individuals, families, stories, media.**
  - **[ ] Indexing of relevant data for efficient searching (e.g., Elasticsearch).**
  - **[ ] API endpoints for search queries with filtering and sorting options.**
  - **[ ] Advanced search capabilities (e.g., by date ranges, locations).**

## Workstream 16: Search & Discovery Frontend
- Branch: `ws/16-search-frontend`
- Tasks:
  - **[ ] Global search bar component.**
  - **[ ] Search results page with clear presentation of results.**
  - **[ ] UI for filtering and sorting search results.**
  - **[ ] Highlighting of search terms in results.**

## Workstream 17: Admin Panel & System Management
- Branch: `ws/17-admin-panel`
- Tasks:
  - **[ ] Backend and Frontend for an admin dashboard.**
  - **[ ] User management (view, edit, delete users, manage roles).**
  - **[ ] System health monitoring.**
  - **[ ] Content moderation tools (if applicable).**
  - **[ ] Management of site-wide settings.**
  - **[ ] Analytics and reporting.**
