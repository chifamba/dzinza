# 🖥️ UI Design Specification for Community Genealogy Platform

This document outlines the architecture, behavior, and UI component inventory for the genealogy platform frontend.

---

## 🎯 UI Goals

- **Intuitive canvas-like experience** for building and exploring family trees
- Balance between **openness and privacy**
- Enable **verified contribution and trust-building**
- Modular UI powered by microservices

---

## 🧩 Architecture Overview

**Stack Recommendation**:

- **Frontend**: React + TypeScript (or Next.js for SSR/SSG)
- **Styling**: TailwindCSS or Chakra UI
- **State/Data**:
  - React Query for async data + caching
  - Zustand or Redux for global state (e.g. auth, tree context)
- **API Integration**:
  - OpenAPI-generated TypeScript SDKs

**Folder Layout**:

```plaintext
src/
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

---

## 🌿 Core UI Flows

### 1. **User Onboarding & Profile**

- Register/login (Auth Service)
- Create or claim a person record (Person Service)
- Complete initial profile

### 2. **Canvas-Style Tree UI**

- Drag-and-zoom graph viewer of family branches
- Add new persons via drag-drop or click
- Visual relationship lines between nodes
- Color indicators for trust/verification status

### 3. **Person Detail View**

- Tabs: Bio, Media, Timeline, Suggestions, Relationships
- Attach media/documents
- View verification status and relationship context

### 4. **Suggestions & Verification**

- Panel to review and respond to suggestions
- Option to comment or request feedback from others
- Multi-party confirmation process

### 5. **Media Management**

- Drag-and-drop uploads
- Tag people or events
- Annotate photos (future feature)

### 6. **Search & Discovery**

- Global search bar
- Filters by DOB, location, relationship type
- Auto-preview with connection paths

### 7. **Trust & Permissions**

- UI badges for user trust level
- Trust history available in profile view
- Certain actions gated by role or trust tier

### 8. **Admin Dashboard**

- Reports table
- Moderation tools
- Access to audit logs

---

## 🧱 Component Inventory

### Layout

- `MainLayout`
- `SidebarMenu`
- `HeaderBar`
- `Footer`

### Navigation & Access

- `LoginForm`
- `RegisterForm`
- `PrivateRoute`
- `TrustBadge`

### Canvas View

- `TreeCanvas`
- `PersonNode`
- `RelationshipLine`
- `AddPersonModal`

### Person View

- `PersonTabs`
  - `BioTab`
  - `MediaTab`
  - `TimelineTab`
  - `SuggestionsTab`
- `PersonHeader`
- `VerificationStatus`

### Suggestions

- `SuggestionCard`
- `SuggestionReviewModal`
- `ConfirmButton`
- `RejectionModal`

### Media

- `MediaGallery`
- `UploadDropzone`
- `MediaViewer`

### Search & Discovery

- `GlobalSearchBar`
- `SearchResultsList`
- `PersonPreviewCard`

### Analytics & Trust

- `ContributionStats`
- `TrustHistory`

### Admin

- `ReportsTable`
- `UserManagementPanel`
- `BanUserModal`

---

## 🔁 Integration Strategy

- All services use REST APIs; React uses OpenAPI-generated SDKs
- For real-time data:
  - WebSockets (e.g. event suggestions, trust changes)
  - Or React Query with smart polling

---

## 🔒 Privacy & Access UX

- Person nodes or trees greyed out if access is limited
- Verification banners on sensitive content
- Trust indicators and tooltips
- Opt-in notifications for moderation or verification prompts

---

## 💡 Optional Enhancements

- OCR and face recognition for media
- Ancestry-based navigation with dynamic highlighting
- "Tree health" indicators (orphaned nodes, low trust links)

---

Would you like mockups or a working UI prototype scaffold next?

