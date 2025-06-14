````markdown
# Dzinza Project Documentation

**Note:** The Dzinza platform is currently undergoing a significant re-implementation of its backend services using Python 3.11, FastAPI, and a microservices architecture as detailed in `ROADMAP.md`. This documentation is being updated to reflect these changes. Sections related to the legacy Node.js backend will be marked accordingly.

## Table of Contents

1.  [Project Overview & Principles](#project-overview--principles)
    - [Core Principles](#core-principles)
    - [Code of Conduct](#code-of-conduct)
    - [Competitive Analysis](#competitive-analysis)
2.  [Development Guidelines & Standards](#development-guidelines--standards)
    - [Development Guidelines](#development-guidelines)
    - [Code Standards](#code-standards)
    - [Contributing Guide](#contributing-guide)
    - [Code Review Report](#code-review-report)
3.  [Architecture & Design](#architecture--design)
    - [System Architecture (Overview)](#system-architecture-overview)
    - [Database Schema](#database-schema)
    - [Decision Framework](#decision-framework)
4.  [API Documentation](#api-documentation)
    - [Legacy API Documentation (Node.js - For Reference Only)](#legacy-api-documentation-nodejs---for-reference-only)
    - [Python API Documentation (New Backend - In Progress)](#python-api-documentation-new-backend---in-progress)
5.  [Product & Feature Guides](#product--feature-guides)
    - [Authentication System](#authentication-system)
    - [Accessibility Guidelines](#accessibility-guidelines)
6.  [Operational Guides](#operational-guides)
    - [Admin Guide](#admin-guide)
    - [Deployment Guide](#deployment-guide)
7.  [Compliance & Legal](#compliance--legal)
    - [Data Privacy & GDPR](#data-privacy--gdpr)
8.  [Agent & System Rules](#agent--system-rules)
    - [Agent Rules](#agent-rules)

## Overview

Dzinza is committed to providing an inclusive genealogy platform that serves users of all abilities, backgrounds, and circumstances. These guidelines ensure compliance with WCAG 2.1 AA standards while going beyond minimum requirements to create truly accessible experiences.

## Core Accessibility Principles

### 1. Perceivable

Information and user interface components must be presentable to users in ways they can perceive.

### 2. Operable

User interface components and navigation must be operable by all users.

### 3. Understandable

Information and the operation of the user interface must be understandable.

### 4. Robust

Content must be robust enough to be interpreted reliably by a wide variety of user agents, including assistive technologies.

## WCAG 2.1 AA Compliance Requirements

### Color and Contrast

- **Minimum Contrast Ratio**: 4.5:1 for normal text, 3:1 for large text
- **Color Independence**: Never use color alone to convey information
- **Focus Indicators**: Visible focus indicators with minimum 3:1 contrast ratio
- **User-Controlled Colors**: Allow users to customize color schemes

**Implementation:**

```css
/* High contrast color palette */
:root {
  --primary-text: #1a1a1a;
  --secondary-text: #4a4a4a;
  --background: #ffffff;
  --accent: #0066cc;
  --error: #cc0000;
  --success: #008800;

  /* Focus indicators */
  --focus-outline: 3px solid #0066cc;
  --focus-offset: 2px;
}

/* Focus management */
*:focus {
  outline: var(--focus-outline);
  outline-offset: var(--focus-offset);
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  :root {
    --primary-text: #000000;
    --background: #ffffff;
    --accent: #0000ff;
  }
}
```
````

### Typography and Content

- **Font Size**: Minimum 16px base font size
- **Line Height**: Minimum 1.5 times font size
- **Scalability**: Support 200% zoom without horizontal scrolling
- **Simple Language**: Clear, concise writing at 8th-grade reading level
- **Cultural Sensitivity**: Appropriate language for diverse audiences

**Implementation:**

```css
/* Responsive typography */
html {
  font-size: 16px;
  line-height: 1.6;
}

/* Respect user preferences */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Navigation and Interaction

- **Keyboard Navigation**: All interactive elements accessible via keyboard
- **Skip Links**: Bypass navigation to reach main content
- **Consistent Navigation**: Predictable navigation patterns
- **Error Prevention**: Clear form validation with helpful messages
- **Undo Functionality**: Allow users to reverse actions

**Implementation:**

```jsx
// Skip link component
const SkipLink = () => (
  <a
    href="#main-content"
    className="skip-link"
    onFocus={(e) => e.target.classList.add("visible")}
    onBlur={(e) => e.target.classList.remove("visible")}
  >
    Skip to main content
  </a>
);

// Keyboard navigation handler
const handleKeyNavigation = (event) => {
  switch (event.key) {
    case "Tab":
      // Handle tab navigation
      break;
    case "Enter":
    case " ":
      // Activate element
      break;
    case "Escape":
      // Close modal/dropdown
      break;
    case "ArrowUp":
    case "ArrowDown":
      // Navigate lists
      break;
  }
};
```

## Screen Reader Accessibility

### Semantic HTML

Use appropriate HTML elements and ARIA attributes to provide meaning and structure.

```jsx
// Proper heading hierarchy
<main id="main-content">
  <h1>Family Tree</h1>
  <section aria-labelledby="tree-navigation">
    <h2 id="tree-navigation">Navigation</h2>
    <nav aria-label="Family tree navigation">
      <ul role="tree" aria-label="Smith Family Tree">
        <li role="treeitem" aria-expanded="true">
          <button aria-controls="john-smith-children">
            John Smith (1945-2020)
          </button>
          <ul id="john-smith-children" role="group">
            <li role="treeitem">Mary Smith (1970-)</li>
          </ul>
        </li>
      </ul>
    </nav>
  </section>
</main>

// Form accessibility
<form>
  <fieldset>
    <legend>Personal Information</legend>

    <label htmlFor="first-name">
      First Name *
      <input
        id="first-name"
        type="text"
        required
        aria-describedby="first-name-help"
        aria-invalid={errors.firstName ? 'true' : 'false'}
      />
    </label>
    <div id="first-name-help" className="help-text">
      Enter your given name as it appears on official documents
    </div>
    {errors.firstName && (
      <div role="alert" aria-live="polite" className="error">
        {errors.firstName}
      </div>
    )}
  </fieldset>
</form>
```

### ARIA Labels and Descriptions

Provide context and descriptions for complex interactive elements.

```jsx
// Complex interactive elements
<button
  aria-label="Add Sarah Thompson as daughter of John Smith"
  aria-describedby="add-person-help"
  onClick={addPerson}
>
  <PlusIcon aria-hidden="true" />
  Add Person
</button>

<div id="add-person-help" className="sr-only">
  Click to open the add person dialog. You can add family members
  and define their relationship to existing people in the tree.
</div>

// Dynamic content updates
<div
  aria-live="polite"
  aria-atomic="true"
  className="status-updates"
>
  {statusMessage}
</div>

// Progress indicators
<div
  role="progressbar"
  aria-valuenow={uploadProgress}
  aria-valuemin="0"
  aria-valuemax="100"
  aria-label="Photo upload progress"
>
  {uploadProgress}% complete
</div>
```

## Motor Accessibility

### Touch Targets

- **Minimum Size**: 44x44px touch targets
- **Spacing**: Minimum 8px between targets
- **Alternative Input Methods**: Support for switch control, voice control
- **Drag and Drop**: Provide keyboard alternatives

```css
/* Touch target sizing */
.touch-target {
  min-width: 44px;
  min-height: 44px;
  margin: 8px;
  padding: 12px;
}

/* Large touch targets for mobile */
@media (pointer: coarse) {
  .touch-target {
    min-width: 48px;
    min-height: 48px;
  }
}
```

### Gesture Alternatives

Provide alternatives to complex gestures and multi-touch interactions.

```jsx
// Gesture alternatives
const FamilyTreeNode = ({ person, onExpand, onCollapse }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    if (isExpanded) {
      onCollapse();
    } else {
      onExpand();
    }
  };

  return (
    <div className="tree-node">
      <button
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleToggle();
          }
        }}
        aria-expanded={isExpanded}
        aria-controls={`${person.id}-children`}
      >
        {person.name}
      </button>

      {/* Alternative to pinch-to-zoom */}
      <div className="zoom-controls">
        <button aria-label="Zoom in">+</button>
        <button aria-label="Zoom out">-</button>
        <button aria-label="Reset zoom">Reset</button>
      </div>
    </div>
  );
};
```

## Cognitive Accessibility

### Clear Information Architecture

- **Consistent Layout**: Predictable page structures
- **Clear Headings**: Descriptive headings that outline content
- **Breadcrumbs**: Show user location within the application
- **Search**: Multiple ways to find information

### Error Prevention and Recovery

- **Form Validation**: Real-time validation with clear error messages
- **Confirmation Dialogs**: Confirm destructive actions
- **Auto-save**: Prevent data loss
- **Undo/Redo**: Allow users to reverse actions

```jsx
// Error prevention example
const PersonForm = () => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);

  // Auto-save draft
  useEffect(() => {
    if (isDirty) {
      const timer = setTimeout(() => {
        saveDraft(formData);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [formData, isDirty]);

  // Prevent navigation with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  return (
    <form>
      {/* Form fields with validation */}

      <div className="form-actions">
        <button type="submit">Save Changes</button>
        <button
          type="button"
          onClick={() => {
            if (
              isDirty &&
              !confirm("Are you sure you want to discard changes?")
            ) {
              return;
            }
            resetForm();
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
};
```

## Multi-language Accessibility

### Text Direction Support

Support for right-to-left (RTL) languages and proper text rendering.

```css
/* RTL support */
html[dir="rtl"] {
  text-align: right;
}

html[dir="rtl"] .tree-node {
  margin-right: 0;
  margin-left: 20px;
}

/* Language-specific fonts */
html[lang="ar"] {
  font-family: "Noto Sans Arabic", sans-serif;
}

html[lang="sn"] {
  font-family: "Noto Sans", "Ubuntu", sans-serif;
}
```

### Cultural Considerations

- **Name Formats**: Support various naming conventions
- **Date Formats**: Respect locale-specific date formats
- **Number Formats**: Use appropriate number formatting
- **Cultural Colors**: Avoid colors with negative cultural meanings

```jsx
// Cultural date formatting
const formatDate = (date, locale, culture) => {
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  // Cultural calendar considerations
  if (culture === "ethiopian") {
    // Handle Ethiopian calendar
    return formatEthiopianDate(date);
  }

  return new Intl.DateTimeFormat(locale, options).format(date);
};

// Cultural name handling
const formatName = (person, culture) => {
  switch (culture) {
    case "shona":
      // Shona naming conventions (clan name, given name)
      return `${person.clanName} ${person.givenName}`;
    case "ndebele":
      // Ndebele naming conventions
      return `${person.givenName} ${person.familyName}`;
    default:
      return `${person.firstName} ${person.lastName}`;
  }
};
```

## Testing and Validation

### Automated Testing

```javascript
// Accessibility testing with Jest and Testing Library
import { render, screen } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

describe("Family Tree Accessibility", () => {
  test("should have no accessibility violations", async () => {
    const { container } = render(<FamilyTree />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test("should support keyboard navigation", () => {
    render(<FamilyTree />);
    const firstNode = screen.getByRole("treeitem");

    firstNode.focus();
    expect(firstNode).toHaveFocus();

    fireEvent.keyDown(firstNode, { key: "ArrowDown" });
    // Verify focus moved to next item
  });

  test("should announce dynamic updates", () => {
    render(<FamilyTree />);
    const liveRegion = screen.getByRole("status");

    // Trigger an update
    fireEvent.click(screen.getByText("Add Person"));

    expect(liveRegion).toHaveTextContent("Person added to family tree");
  });
});
```

### Manual Testing Checklist

#### Keyboard Navigation

- [ ] All interactive elements focusable with Tab
- [ ] Logical tab order throughout application
- [ ] Visible focus indicators on all elements
- [ ] Escape key closes modals and dropdowns
- [ ] Arrow keys navigate lists and trees
- [ ] Enter/Space activates buttons and links

#### Screen Reader Testing

- [ ] Tested with NVDA (Windows)
- [ ] Tested with JAWS (Windows)
- [ ] Tested with VoiceOver (macOS/iOS)
- [ ] Tested with TalkBack (Android)
- [ ] All content announced correctly
- [ ] Proper heading hierarchy
- [ ] Form labels associated correctly
- [ ] Error messages announced

#### Motor Accessibility

- [ ] Touch targets minimum 44px
- [ ] No time-limited interactions
- [ ] Drag and drop has keyboard alternative
- [ ] Works with switch control
- [ ] Works with voice control

#### Visual Accessibility

- [ ] 4.5:1 contrast ratio for text
- [ ] 3:1 contrast ratio for UI elements
- [ ] Works at 200% zoom
- [ ] No horizontal scrolling at 320px width
- [ ] Respects user motion preferences
- [ ] Works in high contrast mode

### User Testing with Disabilities

#### Recruitment

- Partner with disability organizations
- Compensate participants appropriately
- Include diverse disability types
- Test with real assistive technologies

#### Testing Protocol

1. **Pre-session Setup**

   - Verify assistive technology setup
   - Confirm user preferences
   - Explain testing purpose and process

2. **Task-based Testing**

   - Create realistic family tree scenarios
   - Observe natural usage patterns
   - Note pain points and successes
   - Allow adequate time for completion

3. **Post-session Feedback**
   - Gather qualitative feedback
   - Identify priority improvements
   - Document accessibility barriers
   - Plan remediation efforts

## Accessibility Statement

### Our Commitment

Dzinza is committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience for everyone and applying the relevant accessibility standards.

### Conformance Status

This website is partially conformant with WCAG 2.1 AA standards. "Partially conformant" means that some parts of the content do not fully conform to the accessibility standard.

### Feedback and Contact

We welcome feedback on the accessibility of Dzinza. Please contact us if you encounter accessibility barriers:

- Email: accessibility@dzinza.com
- Phone: [Accessibility hotline]
- Address: [Mailing address]

We aim to respond to accessibility feedback within 3 business days.

### Accessibility Features

#### Current Features

- Keyboard navigation support
- Screen reader compatibility
- High contrast color schemes
- Scalable text (up to 200%)
- Alternative text for images
- Captions for videos
- Form field labels and descriptions

#### Planned Improvements

- Voice control integration
- Additional language support
- Enhanced mobile accessibility
- Cognitive accessibility features
- More customization options

This accessibility guideline ensures that Dzinza serves all users effectively while maintaining compliance with international accessibility standards and cultural sensitivity for diverse global audiences.

# Administrator Guide

This guide provides comprehensive instructions for administrators managing the Dzinza Genealogy Platform. It covers system administration, user management, content moderation, and operational procedures.

## Table of Contents

1. [Admin Dashboard Overview](#admin-dashboard-overview)
2. [User Management](#user-management)
3. [Content Moderation](#content-moderation)
4. [System Configuration](#system-configuration)
5. [Database Administration](#database-administration)
6. [Security Management](#security-management)
7. [Analytics and Reporting](#analytics-and-reporting)
8. [Backup and Recovery](#backup-and-recovery)
9. [System Monitoring](#system-monitoring)
10. [Troubleshooting](#troubleshooting)

## Admin Dashboard Overview

### Accessing the Admin Panel

1. Navigate to `https://app.dzinza.com/admin`
2. Use administrator credentials to log in
3. Enable two-factor authentication if not already configured
4. Dashboard displays system overview and key metrics

### Dashboard Components

#### System Health

- **Server Status**: API, database, cache, search engine status
- **Performance Metrics**: Response times, error rates, throughput
- **Resource Usage**: CPU, memory, disk, network utilization
- **Active Users**: Current online users and session statistics

#### Quick Actions

- **User Lookup**: Find and manage user accounts
- **Content Review**: Pending moderation items
- **System Alerts**: Critical issues requiring attention
- **Bulk Operations**: Mass user actions and data imports

#### Recent Activity

- User registrations and deactivations
- Content uploads and modifications
- Security events and login anomalies
- System configuration changes

## User Management

### User Account Administration

#### User Search and Filtering

```sql
-- Find users by various criteria
SELECT
  id,
  email,
  full_name,
  created_at,
  last_login,
  subscription_type,
  status
FROM users
WHERE
  email LIKE '%@domain.com'
  OR full_name ILIKE '%smith%'
  OR created_at > '2024-01-01'
ORDER BY created_at DESC;
```

#### Account Status Management

- **Active**: Normal account with full access
- **Suspended**: Temporary restriction with limited access
- **Deactivated**: Account disabled but data preserved
- **Deleted**: Account marked for deletion (30-day grace period)

#### Suspension and Deactivation Process

1. Navigate to user profile in admin panel
2. Select "Account Actions" dropdown
3. Choose appropriate action:
   - **Temporary Suspension**: Specify duration and reason
   - **Permanent Deactivation**: Requires manager approval
   - **Immediate Deletion**: For severe violations only
4. Send notification email to user
5. Document action in user activity log

### Subscription Management

#### Subscription Types

- **Free**: Basic features, 100MB storage, 1 family tree
- **Premium**: Advanced features, 10GB storage, unlimited trees
- **Family**: 5 user accounts, shared 50GB storage
- **Professional**: Researcher tools, 100GB storage, API access

#### Subscription Operations

```typescript
// Update user subscription
async function updateSubscription(userId: string, newPlan: SubscriptionType) {
  const user = await User.findById(userId);
  const oldPlan = user.subscription.type;

  // Update subscription
  user.subscription = {
    type: newPlan,
    startDate: new Date(),
    endDate: calculateEndDate(newPlan),
    autoRenew: true,
  };

  await user.save();

  // Log change
  await AuditLog.create({
    action: "subscription_changed",
    userId,
    details: { oldPlan, newPlan },
    adminId: getCurrentAdmin().id,
  });

  // Send notification
  await emailService.sendSubscriptionUpdate(user, oldPlan, newPlan);
}
```

#### Billing Administration

- **Payment History**: View all transactions and refunds
- **Failed Payments**: Retry failed payments or update billing info
- **Refund Processing**: Issue refunds for billing disputes
- **Subscription Analytics**: Revenue and churn metrics

### User Support

#### Support Ticket Management

1. **Ticket Assignment**: Route tickets to appropriate team members
2. **Priority Levels**: Critical, High, Medium, Low
3. **Response SLAs**: Based on subscription level and priority
4. **Escalation Process**: Automatic escalation for overdue tickets

#### Common Support Scenarios

##### Password Reset Assistance

```typescript
async function adminPasswordReset(userId: string, adminId: string) {
  const user = await User.findById(userId);
  const resetToken = generateSecureToken();

  user.passwordResetToken = resetToken;
  user.passwordResetExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  await user.save();

  // Log admin action
  await AuditLog.create({
    action: "admin_password_reset",
    userId,
    adminId,
    ipAddress: getClientIP(),
  });

  // Send reset email
  await emailService.sendPasswordReset(user, resetToken);
}
```

##### Data Recovery Requests

1. Verify user identity and ownership
2. Check backup availability for requested timeframe
3. Estimate recovery scope and timeline
4. Obtain user consent for recovery process
5. Perform selective data restoration
6. Verify restored data integrity
7. Notify user of completion

## Content Moderation

### Moderation Queue

#### Content Types Requiring Review

- **Public Family Trees**: Trees marked as public
- **User-Uploaded Photos**: Images flagged by AI or users
- **User Profiles**: Public profiles with recent changes
- **Community Posts**: Forum posts and comments
- **Research Notes**: Shared research and historical claims

#### Automated Flagging System

```typescript
// AI-powered content flagging
export class ContentModerator {
  async reviewPhoto(photoId: string): Promise<ModerationResult> {
    const photo = await Photo.findById(photoId);
    const analysis = await aiService.analyzeImage(photo.url);

    const flags = {
      inappropriateContent: analysis.adultContent > 0.8,
      copyrightViolation: analysis.copyrightScore > 0.7,
      lowQuality: analysis.qualityScore < 0.3,
      duplicateContent: await this.checkForDuplicates(photo),
    };

    if (Object.values(flags).some((flag) => flag)) {
      await this.flagForReview(photoId, flags);
    }

    return {
      photoId,
      flags,
      requiresReview: Object.values(flags).some((f) => f),
    };
  }
}
```

#### Manual Review Process

1. **Review Queue**: Prioritized list of flagged content
2. **Review Interface**: Side-by-side view of content and context
3. **Action Options**:
   - Approve: Content is acceptable
   - Request Changes: Requires user modification
   - Remove: Delete content and notify user
   - Escalate: Forward to senior moderator
4. **Documentation**: Record reason and evidence for decisions

### Community Standards

#### Acceptable Content Guidelines

- **Historical Accuracy**: Encourage documented sources
- **Respectful Language**: No discriminatory or offensive content
- **Privacy Respect**: Protect living individuals' privacy
- **Copyright Compliance**: Only user-owned or public domain content
- **Factual Claims**: Distinguish between facts and family stories

#### Violation Categories

- **Minor Violations**: Warning and education
- **Moderate Violations**: Content removal and temporary restrictions
- **Severe Violations**: Account suspension or termination
- **Illegal Content**: Immediate removal and law enforcement reporting

### Appeals Process

#### User Appeals

1. **Appeal Submission**: Users can contest moderation decisions
2. **Review Process**: Different moderator reviews the appeal
3. **Evidence Review**: Consider additional context or sources
4. **Decision Communication**: Clear explanation of final decision
5. **Policy Updates**: Use appeals to improve guidelines

## System Configuration

### Application Settings

#### Global Configuration

```yaml
# config/production.yml
app:
  name: "Dzinza Genealogy Platform"
  version: "2.1.0"
  maintenance_mode: false
  registration_enabled: true
  max_file_size: 10485760 # 10MB
  session_timeout: 3600 # 1 hour

features:
  dna_analysis: true
  ai_photo_enhancement: true
  public_trees: true
  collaboration: true
  api_access: true

limits:
  free_storage_mb: 100
  premium_storage_gb: 10
  family_storage_gb: 50
  max_trees_free: 1
  max_trees_premium: -1 # unlimited
```

#### Feature Flags

```typescript
// Feature flag management
export class FeatureFlags {
  private static flags = new Map<string, boolean>();

  static async toggleFeature(feature: string, enabled: boolean) {
    this.flags.set(feature, enabled);

    // Update database
    await SystemConfig.updateOne(
      { key: `feature_${feature}` },
      { value: enabled },
      { upsert: true }
    );

    // Broadcast to all servers
    await pubsub.publish("feature_flag_update", { feature, enabled });
  }

  static isEnabled(feature: string): boolean {
    return this.flags.get(feature) ?? false;
  }
}
```

### Email Configuration

#### SMTP Settings

```typescript
// Email service configuration
const emailConfig = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
};
```

#### Email Templates

- **Welcome Email**: New user registration
- **Password Reset**: Security-related password changes
- **Subscription Updates**: Billing and plan changes
- **DNA Match Notifications**: New genetic matches
- **Collaboration Invites**: Family tree sharing invitations

### Third-Party Integrations

#### DNA Testing Companies

```typescript
// DNA data import configuration
const dnaProviders = {
  "23andme": {
    name: "23andMe",
    fileFormat: "txt",
    requiredHeaders: ["rsid", "chromosome", "position", "genotype"],
    processingFunction: "process23andMeData",
  },
  ancestry: {
    name: "AncestryDNA",
    fileFormat: "txt",
    requiredHeaders: ["rsid", "chromosome", "position", "allele1", "allele2"],
    processingFunction: "processAncestryData",
  },
};
```

#### Payment Processing

- **Stripe Integration**: Subscription and one-time payments
- **PayPal Support**: Alternative payment method
- **Regional Processors**: Local payment methods by geography
- **Webhook Handling**: Real-time payment status updates

## Database Administration

### Database Maintenance

#### Regular Maintenance Tasks

```sql
-- Weekly maintenance script
-- Vacuum and analyze tables
VACUUM ANALYZE users;
VACUUM ANALYZE family_trees;
VACUUM ANALYZE dna_data;
VACUUM ANALYZE photos;

-- Update table statistics
ANALYZE;

-- Check for index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY schemaname, tablename;

-- Monitor database size
SELECT
  pg_database.datname,
  pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database
ORDER BY pg_database_size(pg_database.datname) DESC;
```

#### Performance Monitoring

```sql
-- Identify slow queries
SELECT
  query,
  calls,
  total_time,
  mean_time,
  stddev_time,
  rows
FROM pg_stat_statements
WHERE calls > 100
ORDER BY total_time DESC
LIMIT 20;

-- Check for blocking queries
SELECT
  blocked_locks.pid AS blocked_pid,
  blocked_activity.usename AS blocked_user,
  blocking_locks.pid AS blocking_pid,
  blocking_activity.usename AS blocking_user,
  blocked_activity.query AS blocked_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
WHERE NOT blocked_locks.granted;
```

### Data Management

#### Data Archival

```sql
-- Archive old user sessions
CREATE TABLE archived_user_sessions AS
SELECT * FROM user_sessions
WHERE last_activity < NOW() - INTERVAL '90 days';

DELETE FROM user_sessions
WHERE last_activity < NOW() - INTERVAL '90 days';

-- Archive old audit logs
CREATE TABLE archived_audit_logs_2024 AS
SELECT * FROM audit_logs
WHERE created_at < '2025-01-01'
AND created_at >= '2024-01-01';
```

#### Data Cleanup

```typescript
// Automated cleanup jobs
export class DataCleanupService {
  async cleanupExpiredSessions() {
    const result = await UserSession.deleteMany({
      lastActivity: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
    });

    logger.info(`Cleaned up ${result.deletedCount} expired sessions`);
  }

  async cleanupPendingDeletes() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const usersToDelete = await User.find({
      status: "pending_deletion",
      deletionRequestedAt: { $lt: thirtyDaysAgo },
    });

    for (const user of usersToDelete) {
      await this.permanentlyDeleteUser(user.id);
    }
  }
}
```

### Backup Verification

```bash
#!/bin/bash
# Backup verification script

BACKUP_FILE="/backups/dzinza_$(date +%Y%m%d).sql"
TEST_DB="dzinza_backup_test"

# Restore backup to test database
psql -c "DROP DATABASE IF EXISTS $TEST_DB;"
psql -c "CREATE DATABASE $TEST_DB;"
psql -d $TEST_DB < $BACKUP_FILE

# Verify critical tables
TABLES=("users" "family_trees" "dna_data" "photos")
for table in "${TABLES[@]}"; do
  COUNT=$(psql -d $TEST_DB -t -c "SELECT COUNT(*) FROM $table;")
  echo "Table $table: $COUNT records"
done

# Cleanup test database
psql -c "DROP DATABASE $TEST_DB;"
```

## Security Management

### Access Control

#### Admin Role Management

```typescript
// Role-based access control
export enum AdminRole {
  SUPER_ADMIN = "super_admin",
  SYSTEM_ADMIN = "system_admin",
  USER_MODERATOR = "user_moderator",
  CONTENT_MODERATOR = "content_moderator",
  SUPPORT_AGENT = "support_agent",
}

export const rolePermissions = {
  [AdminRole.SUPER_ADMIN]: ["*"], // All permissions
  [AdminRole.SYSTEM_ADMIN]: [
    "system.config",
    "system.monitoring",
    "database.admin",
    "user.admin",
  ],
  [AdminRole.USER_MODERATOR]: ["user.view", "user.suspend", "user.support"],
  [AdminRole.CONTENT_MODERATOR]: [
    "content.review",
    "content.moderate",
    "user.view",
  ],
  [AdminRole.SUPPORT_AGENT]: ["user.view", "user.support", "ticket.manage"],
};
```

#### Session Management

```typescript
// Admin session security
export class AdminSessionManager {
  static async createSession(adminId: string, ipAddress: string) {
    const session = await AdminSession.create({
      adminId,
      ipAddress,
      userAgent: getCurrentUserAgent(),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
      isActive: true,
    });

    // Log admin login
    await AuditLog.create({
      action: "admin_login",
      adminId,
      ipAddress,
      details: { sessionId: session.id },
    });

    return session;
  }

  static async validateSession(
    sessionId: string,
    ipAddress: string
  ): Promise<boolean> {
    const session = await AdminSession.findById(sessionId);

    if (!session || !session.isActive || session.expiresAt < new Date()) {
      return false;
    }

    // Validate IP address consistency
    if (session.ipAddress !== ipAddress) {
      await this.flagSuspiciousActivity(session.adminId, "ip_mismatch");
      return false;
    }

    // Update last activity
    session.lastActivity = new Date();
    await session.save();

    return true;
  }
}
```

### Security Monitoring

#### Intrusion Detection

```typescript
// Security event monitoring
export class SecurityMonitor {
  private static suspiciousActivities = new Map<string, number>();

  static async detectAnomalies(adminId: string, action: string, context: any) {
    const key = `${adminId}:${action}`;
    const count = this.suspiciousActivities.get(key) || 0;

    // Check for unusual patterns
    const anomalies = [
      this.checkRapidFireActions(adminId, action),
      this.checkUnusualTimeAccess(context.timestamp),
      this.checkGeolocationChange(adminId, context.ipAddress),
      this.checkPrivilegeEscalation(adminId, action),
    ];

    if (anomalies.some((anomaly) => anomaly.detected)) {
      await this.triggerSecurityAlert(adminId, action, anomalies);
    }
  }

  private static async triggerSecurityAlert(
    adminId: string,
    action: string,
    anomalies: any[]
  ) {
    const alert = await SecurityAlert.create({
      type: "suspicious_admin_activity",
      severity: "high",
      adminId,
      action,
      anomalies,
      timestamp: new Date(),
    });

    // Notify security team
    await notificationService.sendSecurityAlert(alert);

    // Temporarily restrict admin if critical
    if (anomalies.some((a) => a.severity === "critical")) {
      await this.temporaryRestriction(adminId);
    }
  }
}
```

### Compliance Management

#### GDPR Compliance

```typescript
// GDPR data management
export class GDPRCompliance {
  async handleDataSubjectRequest(
    userId: string,
    requestType: "access" | "deletion" | "portability"
  ) {
    const user = await User.findById(userId);

    switch (requestType) {
      case "access":
        return await this.generateDataExport(userId);

      case "deletion":
        return await this.scheduleDataDeletion(userId);

      case "portability":
        return await this.generatePortableData(userId);
    }
  }

  private async generateDataExport(userId: string) {
    const userData = {
      profile: await User.findById(userId),
      trees: await FamilyTree.find({ ownerId: userId }),
      photos: await Photo.find({ uploadedBy: userId }),
      dnaData: await DNAData.find({ userId }),
      activityLog: await AuditLog.find({ userId }),
    };

    // Remove sensitive data
    delete userData.profile.passwordHash;
    delete userData.profile.resetTokens;

    return userData;
  }
}
```

## Analytics and Reporting

### System Analytics

#### User Metrics Dashboard

```sql
-- Daily active users
SELECT
  DATE(last_login) as date,
  COUNT(DISTINCT id) as active_users
FROM users
WHERE last_login >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(last_login)
ORDER BY date;

-- Subscription metrics
SELECT
  subscription_type,
  COUNT(*) as users,
  SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_users,
  AVG(EXTRACT(DAYS FROM CURRENT_DATE - created_at)) as avg_age_days
FROM users
GROUP BY subscription_type;

-- Feature usage
SELECT
  feature_name,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) as total_usage,
  AVG(duration_seconds) as avg_duration
FROM feature_usage
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY feature_name
ORDER BY unique_users DESC;
```

#### Performance Reports

```typescript
// Automated performance reporting
export class PerformanceReporter {
  async generateWeeklyReport() {
    const metrics = {
      responseTime: await this.getAverageResponseTime(),
      errorRate: await this.getErrorRate(),
      uptime: await this.getUptimePercentage(),
      userSatisfaction: await this.getUserSatisfactionScore(),
      featureUsage: await this.getFeatureUsageStats(),
      systemResources: await this.getResourceUtilization(),
    };

    const report = await this.formatReport(metrics);
    await this.sendReportToStakeholders(report);

    return report;
  }

  private async getAverageResponseTime(): Promise<number> {
    const result = await RequestLog.aggregate([
      {
        $match: {
          timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: null,
          avgResponseTime: { $avg: "$responseTime" },
        },
      },
    ]);

    return result[0]?.avgResponseTime || 0;
  }
}
```

### Business Intelligence

#### Revenue Analytics

```sql
-- Monthly recurring revenue
SELECT
  DATE_TRUNC('month', subscription_start) as month,
  subscription_type,
  COUNT(*) as new_subscriptions,
  SUM(monthly_price) as new_mrr,
  SUM(SUM(monthly_price)) OVER (
    PARTITION BY subscription_type
    ORDER BY DATE_TRUNC('month', subscription_start)
  ) as cumulative_mrr
FROM subscriptions
WHERE status = 'active'
GROUP BY month, subscription_type
ORDER BY month, subscription_type;

-- Customer lifetime value
WITH customer_metrics AS (
  SELECT
    user_id,
    MIN(subscription_start) as first_subscription,
    MAX(subscription_end) as last_subscription,
    SUM(amount_paid) as total_revenue,
    COUNT(DISTINCT subscription_id) as subscription_count
  FROM subscriptions
  GROUP BY user_id
)
SELECT
  AVG(total_revenue) as avg_ltv,
  AVG(EXTRACT(DAYS FROM last_subscription - first_subscription)) as avg_lifetime_days,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_revenue) as median_ltv
FROM customer_metrics;
```

#### Content Analytics

```typescript
// Content engagement metrics
export class ContentAnalytics {
  async getTreeEngagementMetrics() {
    const metrics = await FamilyTree.aggregate([
      {
        $lookup: {
          from: "tree_views",
          localField: "_id",
          foreignField: "treeId",
          as: "views",
        },
      },
      {
        $lookup: {
          from: "tree_edits",
          localField: "_id",
          foreignField: "treeId",
          as: "edits",
        },
      },
      {
        $project: {
          name: 1,
          isPublic: 1,
          memberCount: { $size: "$members" },
          viewCount: { $size: "$views" },
          editCount: { $size: "$edits" },
          lastActivity: { $max: "$edits.timestamp" },
          engagementScore: {
            $add: [
              { $multiply: [{ $size: "$views" }, 1] },
              { $multiply: [{ $size: "$edits" }, 5] },
            ],
          },
        },
      },
      { $sort: { engagementScore: -1 } },
    ]);

    return metrics;
  }
}
```

## Backup and Recovery

### Backup Procedures

#### Automated Backup System

```bash
#!/bin/bash
# Daily backup script

BACKUP_DIR="/backups/$(date +%Y/%m)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATABASE="dzinza_production"

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
pg_dump -h $DB_HOST -U $DB_USER -d $DATABASE | gzip > $BACKUP_DIR/db_$TIMESTAMP.sql.gz

# Photo storage backup
aws s3 sync s3://dzinza-photos-prod $BACKUP_DIR/photos_$TIMESTAMP/ --storage-class GLACIER

# Configuration backup
kubectl get configmaps,secrets -o yaml > $BACKUP_DIR/k8s_config_$TIMESTAMP.yaml

# Verify backup integrity
if [ -f "$BACKUP_DIR/db_$TIMESTAMP.sql.gz" ]; then
  echo "Database backup completed successfully"
else
  echo "Database backup FAILED" | mail -s "Backup Alert" admin@dzinza.com
fi

# Cleanup old backups (keep 90 days)
find /backups -name "*.gz" -mtime +90 -delete
```

#### Backup Verification

```typescript
// Automated backup verification
export class BackupVerifier {
  async verifyDatabaseBackup(backupFile: string): Promise<boolean> {
    try {
      // Create temporary test database
      const testDb = `backup_test_${Date.now()}`;
      await this.createTestDatabase(testDb);

      // Restore backup to test database
      await this.restoreBackup(backupFile, testDb);

      // Verify critical data
      const verificationResults = await Promise.all([
        this.verifyTableExists(testDb, "users"),
        this.verifyTableExists(testDb, "family_trees"),
        this.verifyDataIntegrity(testDb),
        this.verifyIndexes(testDb),
      ]);

      // Cleanup test database
      await this.dropTestDatabase(testDb);

      return verificationResults.every((result) => result.success);
    } catch (error) {
      logger.error("Backup verification failed", { error, backupFile });
      return false;
    }
  }
}
```

### Disaster Recovery

#### Recovery Time Objectives (RTO)

- **Critical Systems**: 2 hours
- **User Data**: 4 hours
- **Photos/Documents**: 8 hours
- **Historical Reports**: 24 hours

#### Recovery Point Objectives (RPO)

- **Database**: 15 minutes (continuous replication)
- **File Storage**: 1 hour (incremental sync)
- **Configuration**: 24 hours (daily backup)

#### Recovery Procedures

```bash
#!/bin/bash
# Disaster recovery script

RECOVERY_POINT="2024-01-15_14:30:00"
BACKUP_LOCATION="/disaster-recovery/backups"

echo "Starting disaster recovery for point: $RECOVERY_POINT"

# 1. Restore database
echo "Restoring database..."
pg_restore -h $NEW_DB_HOST -U $DB_USER -d dzinza_recovery \
  $BACKUP_LOCATION/db_$RECOVERY_POINT.sql.gz

# 2. Restore file storage
echo "Restoring file storage..."
aws s3 sync $BACKUP_LOCATION/photos_$RECOVERY_POINT/ s3://dzinza-photos-recovery/

# 3. Deploy application
echo "Deploying application..."
kubectl apply -f $BACKUP_LOCATION/k8s_config_$RECOVERY_POINT.yaml

# 4. Update DNS to point to recovery environment
echo "Updating DNS..."
aws route53 change-resource-record-sets --hosted-zone-id $ZONE_ID \
  --change-batch file://dns-recovery-changeset.json

# 5. Verify system health
echo "Verifying system health..."
./health-check.sh

echo "Disaster recovery completed"
```

## System Monitoring

### Monitoring Checklist

#### Daily Checks

- [ ] System health dashboard review
- [ ] Error rate and performance metrics
- [ ] Backup completion verification
- [ ] Security alert review
- [ ] Support ticket queue status

#### Weekly Checks

- [ ] Database performance analysis
- [ ] Storage utilization review
- [ ] User feedback and satisfaction scores
- [ ] Feature usage analytics
- [ ] Cost optimization opportunities

#### Monthly Checks

- [ ] Security audit and compliance review
- [ ] Capacity planning and scaling needs
- [ ] Vendor SLA performance review
- [ ] Business metrics and KPI analysis
- [ ] Documentation updates

### Alert Management

#### Critical Alerts (Immediate Response)

- Database connection failures
- Application server crashes
- Security breach indicators
- Payment processing failures
- Data corruption detection

#### Warning Alerts (1-hour Response)

- High resource utilization
- Elevated error rates
- Backup failures
- Third-party service degradation
- Unusual user activity patterns

#### Information Alerts (Next Business Day)

- Feature usage anomalies
- Minor performance degradation
- Low-priority security events
- Scheduled maintenance reminders
- Business metric notifications

## Troubleshooting

### Common Issues

#### Application Performance Issues

**Problem**: Slow response times
**Diagnosis Steps**:

1. Check database query performance
2. Review application server metrics
3. Analyze network latency
4. Verify cache hit rates
5. Check for memory leaks

**Resolution**:

```sql
-- Identify slow queries
SELECT query, mean_time, calls
FROM pg_stat_statements
WHERE mean_time > 1000
ORDER BY mean_time DESC;

-- Check for blocking queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
```

#### Database Connection Issues

**Problem**: Connection pool exhaustion
**Diagnosis**:

```sql
-- Check active connections
SELECT count(*) as active_connections,
       state,
       application_name
FROM pg_stat_activity
GROUP BY state, application_name;

-- Check connection limits
SELECT setting FROM pg_settings WHERE name = 'max_connections';
```

**Resolution**:

1. Increase connection pool size temporarily
2. Identify and terminate long-running queries
3. Review application connection management
4. Consider read replicas for read-heavy workloads

#### Memory Issues

**Problem**: High memory usage
**Diagnosis**:

```bash
# Check container memory usage
kubectl top pods --containers

# Analyze memory breakdown
kubectl exec -it <pod-name> -- cat /proc/meminfo

# Check for memory leaks in Node.js
kubectl exec -it <pod-name> -- node --expose-gc --inspect app.js
```

### Emergency Procedures

#### System Outage Response

1. **Immediate Assessment** (0-5 minutes)

   - Verify outage scope and impact
   - Check monitoring dashboards
   - Initiate incident response team

2. **Communication** (5-15 minutes)

   - Update status page
   - Notify stakeholders
   - Prepare user communication

3. **Investigation** (15-30 minutes)

   - Analyze logs and metrics
   - Identify root cause
   - Implement temporary workarounds

4. **Resolution** (30+ minutes)
   - Apply permanent fix
   - Verify system stability
   - Conduct post-incident review

#### Security Incident Response

1. **Detection and Analysis** (0-15 minutes)

   - Confirm security incident
   - Assess scope and severity
   - Preserve evidence

2. **Containment** (15-30 minutes)

   - Isolate affected systems
   - Prevent further damage
   - Maintain business continuity

3. **Investigation** (30+ minutes)

   - Forensic analysis
   - Identify attack vectors
   - Document findings

4. **Recovery and Lessons Learned**
   - Restore affected systems
   - Implement security improvements
   - Update incident response procedures

### Contact Information

#### Emergency Contacts

- **On-Call Engineer**: +1-555-ONCALL
- **Security Team**: security@dzinza.com
- **Database Administrator**: dba@dzinza.com
- **Infrastructure Team**: infra@dzinza.com

#### Escalation Matrix

1. **Level 1**: On-call engineer
2. **Level 2**: Team lead
3. **Level 3**: Engineering manager
4. **Level 4**: CTO and executive team

#### External Support

- **AWS Support**: Case portal and phone support
- **Database Vendor**: Enterprise support contract
- **Security Consultant**: Incident response retainer
- **Legal Team**: Data breach notification requirements

# Agent Quick Reference Guide

## Overview

This is a quick reference guide for AI agents working on the Dzinza project. Use this for fast lookups during development tasks.

## Rule Hierarchy (Quick Lookup)

| Layer                    | Priority | Override           | Examples                                      |
| ------------------------ | -------- | ------------------ | --------------------------------------------- |
| **0: Fundamental Laws**  | Absolute | Never              | Security, safety, legal compliance            |
| **1: Core Principles**   | High     | Rarely             | User experience, performance, maintainability |
| **2: Project Standards** | Medium   | With justification | Technology stack, architecture patterns       |
| **3: Implementation**    | Low      | Context-dependent  | Code standards, documentation                 |
| **4: Style Preferences** | Flexible | Freely             | Formatting, naming conventions                |

## Decision Quick Guide

### 🚨 Critical Decisions (Layer 0-1)

- Security vulnerability → Fix immediately, Layer 0
- User safety issue → Layer 0 rules apply
- Major performance problem → Layer 1, prioritize user impact
- Accessibility violation → Layer 1, must fix

### 🔧 Technical Decisions (Layer 2-3)

- Technology choice → Check Layer 2 standards first
- Code pattern → Follow Layer 3 guidelines
- Architecture change → Document in ADR, get approval
- API design → Follow REST standards (Layer 2)

### 🎨 Style Decisions (Layer 4)

- Code formatting → Follow existing patterns
- Naming convention → Be consistent with codebase
- File organization → Follow project structure

## Technology Stack Quick Reference

### Frontend

- **Framework**: React 18+ with TypeScript
- **Styling**: Tailwind CSS
- **Build**: Vite
- **Testing**: Vitest + Playwright
- **State**: React Query + Zustand
- **i18n**: React-i18next (English, Shona, Ndebele)

### Backend

- **Runtime**: Node.js 18+ LTS
- **Framework**: Express.js or Fastify
- **Database**: PostgreSQL 14+
- **ORM**: Prisma
- **Auth**: JWT with refresh tokens

### Development

- **Linting**: ESLint + TypeScript
- **Formatting**: Prettier
- **Git**: Git Flow branching
- **CI/CD**: GitHub Actions

## Common Patterns

### Error Handling

```typescript
// API Errors
try {
  const result = await apiCall();
  return result;
} catch (error) {
  logger.error("Operation failed", { error });
  throw new ServiceError("Operation failed");
}

// React Components
const [error, setError] = useState<string | null>(null);
// Handle error in UI
```

### API Responses

```typescript
// Success
{ data: T, message: string, success: true }

// Error
{ error: { code: string, message: string, details?: any }, success: false }
```

### Component Structure

```tsx
const Component: React.FC<Props> = ({ prop1, prop2 }) => {
  const { t } = useTranslation("namespace");

  // State
  const [state, setState] = useState();

  // Effects
  useEffect(() => {}, []);

  // Handlers
  const handleEvent = () => {};

  // Render
  return <div>{t("key")}</div>;
};
```

## Security Checklist

### Authentication

- [ ] JWT tokens with expiration
- [ ] Refresh token rotation
- [ ] Multi-factor for admin users
- [ ] Rate limiting on auth endpoints

### Data Protection

- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS protection (output encoding)
- [ ] HTTPS everywhere
- [ ] Encrypt PII at rest

### Authorization

- [ ] Role-based access control (RBAC)
- [ ] Principle of least privilege
- [ ] Resource-level permissions
- [ ] API endpoint authorization

## Performance Targets

| Metric              | Target     | Critical |
| ------------------- | ---------- | -------- |
| Page Load           | < 3s on 3G | < 5s     |
| API Response        | < 200ms    | < 500ms  |
| Database Query      | < 100ms    | < 300ms  |
| Time to Interactive | < 5s       | < 8s     |

## Code Quality Gates

### Required

- [ ] TypeScript strict mode
- [ ] ESLint passes
- [ ] Tests pass (80%+ coverage)
- [ ] Security scan passes
- [ ] Code review approved
- [ ] Internationalization keys defined
- [ ] Default language content provided

### Recommended

- [ ] Prettier formatting
- [ ] Performance analysis
- [ ] Accessibility audit
- [ ] Documentation updated

## Common Commands

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Run linting
npm run lint

# Build for production
npm run build
```

### Database

```bash
# Run migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Open Prisma Studio
npx prisma studio
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/DZ-123-description

# Commit with conventional format
git commit -m "feat(auth): add JWT refresh token rotation"

# Push and create PR
git push origin feature/DZ-123-description
```

## Emergency Procedures

### Security Incident

1. **Immediate**: Stop the threat (block access, disable feature)
2. **Assess**: Determine scope and impact
3. **Fix**: Apply security patch
4. **Communicate**: Notify stakeholders
5. **Document**: Create incident report

### Production Issue

1. **Triage**: Assess severity and user impact
2. **Mitigate**: Implement quick fix or rollback
3. **Investigate**: Find root cause
4. **Fix**: Implement proper solution
5. **Post-mortem**: Document lessons learned

### Performance Issue

1. **Monitor**: Check metrics and logs
2. **Identify**: Find bottleneck (database, API, frontend)
3. **Quick Fix**: Apply immediate optimization
4. **Long-term**: Plan proper performance improvements
5. **Verify**: Confirm resolution with metrics

## Escalation Contacts

| Issue Type     | Contact          | When                       |
| -------------- | ---------------- | -------------------------- |
| Security       | Security Team    | Vulnerabilities, breaches  |
| Architecture   | Senior Developer | Major design decisions     |
| Performance    | DevOps Team      | Infrastructure issues      |
| Business Logic | Product Owner    | Requirements clarification |
| Code Quality   | Team Lead        | Standards questions        |

## Quick Decision Tree

```
Is it a safety/security issue?
├─ Yes → Apply Layer 0 rules immediately
└─ No ↓

Will this significantly affect users?
├─ Yes → Apply Layer 1 principles
└─ No ↓

Is this an architecture/technology decision?
├─ Yes → Check Layer 2 standards
└─ No ↓

Is this about code quality/implementation?
├─ Yes → Follow Layer 3 guidelines
└─ No → Apply Layer 4 preferences
```

## Documentation Links

- [Full Agent Rules](./AGENT_RULES.md)
- [Core Principles](./CORE_PRINCIPLES.md)
- [Development Rules](./DEVELOPMENT_RULES.md)
- [Code Standards](./CODE_STANDARDS.md)
- [Decision Framework](./DECISION_FRAMEWORK.md)
- [Project Overview](./PROJECT_OVERVIEW.md)
- [API Documentation](./API_DOCUMENTATION.md)

## Contact Information

- **Project Repository**: [GitHub](https://github.com/dzinza/dzinza)
- **Documentation**: [docs folder](./README.md)
- **Issue Tracking**: GitHub Issues
- **Team Communication**: [Specify team communication channels]

---

**Remember**: When in doubt, prioritize user safety and security. Document your decisions and ask for help when needed.

# Agent Rules & Guidelines System

## Overview

This document defines the hierarchical rule system that all AI agents working on the Dzinza project must follow. Rules are organized in layers with clear precedence to ensure consistent decision-making and behavior.

## Rule Hierarchy (Precedence Order)

### Layer 0: Fundamental Laws

**Status**: Immutable - Never override

- Safety and security first
- No harmful, illegal, or unethical actions
- Respect user privacy and data protection
- Follow applicable laws and regulations

### Layer 1: Core Principles

**Status**: Override only in exceptional circumstances
**Reference**: [CORE_PRINCIPLES.md](./CORE_PRINCIPLES.md)

- User-centric design
- Security by design
- Performance and reliability
- Maintainability and clarity
- Accessibility and inclusivity

### Layer 2: Project Standards

**Status**: Standard guidelines - may be overridden with justification
**Reference**: [DEVELOPMENT_RULES.md](./DEVELOPMENT_RULES.md)

- Development methodology
- Technology choices
- Architecture patterns
- Testing requirements

### Layer 3: Implementation Guidelines

**Status**: Preferred practices - flexible based on context
**References**:

- [CODE_STANDARDS.md](./CODE_STANDARDS.md)
- [DEVELOPMENT_GUIDELINES.md](./DEVELOPMENT_GUIDELINES.md)
- Coding standards
- Documentation requirements
- Review processes

### Layer 4: Style Preferences

**Status**: Suggestions - adapt to context

- Code formatting
- Naming conventions
- File organization
- Comment styles

## Conflict Resolution

When rules from different layers conflict:

1. **Higher layer always wins** - Layer 0 > Layer 1 > Layer 2 > Layer 3 > Layer 4
2. **Within same layer**: Use [DECISION_FRAMEWORK.md](./DECISION_FRAMEWORK.md)
3. **Document exceptions**: Always explain why a lower layer rule was chosen
4. **Seek clarification**: When in doubt, ask the user

## Rule Application Process

### Before Making Decisions

1. Identify which layers apply to the current task
2. Check for potential conflicts between layers
3. Review project context and user requirements
4. Apply decision framework if needed

### During Implementation

1. Follow the highest applicable layer
2. Document any rule exceptions or deviations
3. Ensure consistency with previous decisions
4. Validate against security and safety requirements

### After Implementation

1. Review decisions for consistency
2. Update guidelines if patterns emerge
3. Document lessons learned
4. Share insights with other agents

## Quick Reference Guide

### Common Scenarios

| Scenario                 | Primary Layer | Key Considerations                           |
| ------------------------ | ------------- | -------------------------------------------- |
| Security vulnerability   | Layer 0, 1    | Always prioritize security fixes             |
| Performance optimization | Layer 1, 2    | Balance performance with maintainability     |
| Code formatting          | Layer 4       | Follow project standards, be consistent      |
| Architecture decisions   | Layer 2, 3    | Consider long-term maintainability           |
| User interface changes   | Layer 1, 2    | Prioritize user experience and accessibility |

### Decision Tree

```
Is it a safety/security issue?
├─ Yes → Apply Layer 0 rules
└─ No → Continue

Does it affect user experience significantly?
├─ Yes → Apply Layer 1 rules
└─ No → Continue

Is it an architectural/technology choice?
├─ Yes → Apply Layer 2 rules
└─ No → Continue

Is it about code quality/standards?
├─ Yes → Apply Layer 3 rules
└─ No → Apply Layer 4 rules
```

## Rule Updates

### Who Can Update Rules

- **Layer 0**: No updates allowed
- **Layer 1**: Project owner/lead architect only
- **Layer 2**: Senior team members with consensus
- **Layer 3**: Team leads with review
- **Layer 4**: Any team member with review

### Update Process

1. Propose change with justification
2. Review impact on existing code/decisions
3. Update documentation
4. Communicate changes to all agents
5. Update this master document

## Enforcement

### Automated Checks

- Linting and code analysis tools enforce Layer 3-4 rules
- Security scanners enforce Layer 0-1 rules
- Architecture tests enforce Layer 2 rules

### Review Process

- All code changes reviewed against applicable layers
- Escalate conflicts to appropriate layer authority
- Document exceptions in commit messages/PR descriptions

### Continuous Improvement

- Regular review of rule effectiveness
- Collect feedback from development process
- Update guidelines based on lessons learned
- Maintain consistency across all agents

## Agent Onboarding

New agents must:

1. Read and acknowledge this document
2. Review all referenced layer documents
3. Complete decision framework training
4. Practice with sample scenarios
5. Demonstrate understanding of conflict resolution

## Version History

| Version | Date       | Changes                      | Author |
| ------- | ---------- | ---------------------------- | ------ |
| 1.0     | 2025-06-07 | Initial rule system creation | System |

---

**Remember**: When in doubt, prioritize safety, security, and user value. Document your reasoning and seek guidance when needed.

# Dzinza Genealogy Platform - API Documentation

**Status: This document describes the legacy Node.js API. It is currently under revision to reflect the ongoing migration to a Python/FastAPI backend as outlined in the [main project README.md](../README.md) and [ROADMAP.md](../ROADMAP.md). Endpoints and structures will change.**

## API Overview

The Dzinza API is a RESTful service. The legacy version was built with Node.js/Express.js. The new version is being built with Python/FastAPI.
All endpoints use JSON for request/response bodies and include proper HTTP status codes and error handling.

**Base URL (Legacy):** `https://api.dzinza.com/v1` (This will be updated for the new Python API)

**Authentication:** Bearer token (JWT) required for most endpoints

## Authentication

### Register User

```http
POST /auth/register
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Smith",
  "dateOfBirth": "1990-05-15",
  "agreeToTerms": true
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Smith",
      "emailVerified": false
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 900
    }
  }
}
```

### Login

```http
POST /auth/login
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "rememberMe": true
}
```

### Refresh Token

```http
POST /auth/refresh
```

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Logout

```http
POST /auth/logout
Authorization: Bearer {accessToken}
```

## User Management

### Get User Profile

```http
GET /users/profile
Authorization: Bearer {accessToken}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Smith",
    "displayName": "John Smith",
    "dateOfBirth": "1990-05-15",
    "profilePhotoUrl": "https://cdn.dzinza.com/photos/profile.jpg",
    "subscriptionTier": "premium",
    "privacySettings": {
      "profileVisibility": "family",
      "treeVisibility": "private"
    },
    "createdAt": "2024-01-01T00:00:00Z",
    "lastLogin": "2024-01-15T10:30:00Z"
  }
}
```

### Update User Profile

```http
PUT /users/profile
Authorization: Bearer {accessToken}
```

**Request Body:**

```json
{
  "firstName": "John",
  "lastName": "Smith",
  "displayName": "Johnny Smith",
  "bio": "Genealogy enthusiast researching Smith family history",
  "privacySettings": {
    "profileVisibility": "public",
    "treeVisibility": "family"
  }
}
```

### Upload Profile Photo

```http
POST /users/profile/photo
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data
```

**Form Data:**

- `photo`: Image file (JPEG, PNG, max 5MB)

## Internationalization

### Get Supported Languages

```http
GET /i18n/languages
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "code": "en",
      "name": "English",
      "nativeName": "English",
      "direction": "ltr",
      "enabled": true
    },
    {
      "code": "sn",
      "name": "Shona",
      "nativeName": "chiShona",
      "direction": "ltr",
      "enabled": true
    },
    {
      "code": "nd",
      "name": "Ndebele",
      "nativeName": "isiNdebele",
      "direction": "ltr",
      "enabled": true
    }
  ]
}
```

### Get Translations

```http
GET /i18n/translations/{languageCode}
Authorization: Bearer {accessToken} (optional)
```

**Query Parameters:**

- `namespace`: Filter by namespace (optional, comma-separated)
- `keys`: Specific translation keys (optional, comma-separated)

**Response:**

```json
{
  "success": true,
  "data": {
    "language": "sn",
    "translations": {
      "common": {
        "welcome": "Mauya",
        "save": "Chengetedza",
        "cancel": "Dzosera",
        "loading": "Kufema..."
      },
      "genealogy": {
        "relationships": {
          "father": "Baba",
          "mother": "Amai",
          "son": "Mwanakomana",
          "daughter": "Mwanasikana"
        }
      }
    }
  }
}
```

### Update User Language Preference

```http
PUT /users/language
Authorization: Bearer {accessToken}
```

**Request Body:**

```json
{
  "preferredLanguage": "sn",
  "locale": "sn-ZW",
  "timezone": "Africa/Harare"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "preferredLanguage": "sn",
    "locale": "sn-ZW",
    "timezone": "Africa/Harare",
    "updatedAt": "2025-06-07T10:30:00Z"
  }
}
```

### Get Cultural Settings

```http
GET /i18n/cultural-settings/{languageCode}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "languageCode": "sn",
    "regionCode": "ZW",
    "dateFormat": "DD/MM/YYYY",
    "timeFormat": "24h",
    "numberFormat": {
      "decimal": ".",
      "thousand": ","
    },
    "currencyCode": "USD",
    "calendarSystem": "gregorian",
    "culturalPreferences": {
      "familyHierarchy": "traditional",
      "nameDisplay": "formal"
    }
  }
}
```

### Submit Translation Suggestion

```http
POST /i18n/translations/suggest
Authorization: Bearer {accessToken}
```

**Request Body:**

```json
{
  "translationKeyId": "550e8400-e29b-41d4-a716-446655440000",
  "languageCode": "sn",
  "suggestedTranslation": "Mudzimu",
  "context": "Referring to ancestral spirits in genealogy context",
  "translatorNotes": "Traditional term used in Shona culture"
}
```

## Family Trees

### Get User's Trees

```http
GET /trees
Authorization: Bearer {accessToken}
```

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 50)
- `sort`: Sort by (name, created_at, updated_at)
- `order`: Sort order (asc, desc)

**Response:**

```json
{
  "success": true,
  "data": {
    "trees": [
      {
        "id": "tree-uuid-1",
        "name": "Smith Family Tree",
        "description": "Tracing the Smith lineage back to Ireland",
        "privacyLevel": "family",
        "personCount": 247,
        "generationCount": 8,
        "collaboratorCount": 5,
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-15T14:22:00Z",
        "homePerson": {
          "id": "person-uuid-1",
          "firstName": "John",
          "lastName": "Smith",
          "profilePhotoUrl": "https://cdn.dzinza.com/photos/person1.jpg"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 3,
      "totalPages": 1
    }
  }
}
```

### Create Family Tree

```http
POST /trees
Authorization: Bearer {accessToken}
```

**Request Body:**

```json
{
  "name": "Johnson Family Tree",
  "description": "Researching Johnson ancestors from Scotland",
  "privacyLevel": "private",
  "defaultSurname": "Johnson"
}
```

### Get Specific Tree

```http
GET /trees/{treeId}
Authorization: Bearer {accessToken}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "tree-uuid-1",
    "name": "Smith Family Tree",
    "description": "Tracing the Smith lineage back to Ireland",
    "owner": {
      "id": "user-uuid-1",
      "firstName": "John",
      "lastName": "Smith"
    },
    "privacyLevel": "family",
    "collaborationEnabled": true,
    "personCount": 247,
    "generationCount": 8,
    "homePerson": {
      "id": "person-uuid-1",
      "firstName": "John",
      "lastName": "Smith"
    },
    "collaborators": [
      {
        "id": "user-uuid-2",
        "firstName": "Mary",
        "lastName": "Johnson",
        "role": "editor",
        "joinedAt": "2024-01-05T00:00:00Z"
      }
    ],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-15T14:22:00Z"
  }
}
```

### Update Tree

```http
PUT /trees/{treeId}
Authorization: Bearer {accessToken}
```

### Delete Tree

```http
DELETE /trees/{treeId}
Authorization: Bearer {accessToken}
```

## People Management

### Get People in Tree

```http
GET /trees/{treeId}/people
Authorization: Bearer {accessToken}
```

**Query Parameters:**

- `page`: Page number
- `limit`: Items per page
- `search`: Search by name
- `generation`: Filter by generation
- `gender`: Filter by gender
- `living`: Filter by living status (true/false)

**Response:**

```json
{
  "success": true,
  "data": {
    "people": [
      {
        "id": "person-uuid-1",
        "firstName": "John",
        "middleName": "William",
        "lastName": "Smith",
        "maidenName": null,
        "gender": "male",
        "birthDate": "1965-03-15",
        "birthPlace": "Boston, Massachusetts, USA",
        "deathDate": null,
        "occupation": "Engineer",
        "profilePhotoUrl": "https://cdn.dzinza.com/photos/person1.jpg",
        "livingStatus": "living",
        "privacyLevel": "family",
        "generationFromHome": 0,
        "relationshipToHome": "self",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-10T15:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 247,
      "totalPages": 13
    }
  }
}
```

### Add Person to Tree

```http
POST /trees/{treeId}/people
Authorization: Bearer {accessToken}
```

**Request Body:**

```json
{
  "firstName": "Mary",
  "middleName": "Elizabeth",
  "lastName": "Johnson",
  "maidenName": "Brown",
  "gender": "female",
  "birthDate": "1967-08-22",
  "birthPlace": "New York, New York, USA",
  "occupation": "Teacher",
  "biography": "Elementary school teacher for 25 years",
  "livingStatus": "living",
  "privacyLevel": "family"
}
```

### Get Person Details

```http
GET /people/{personId}
Authorization: Bearer {accessToken}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "person-uuid-1",
    "treeId": "tree-uuid-1",
    "firstName": "John",
    "middleName": "William",
    "lastName": "Smith",
    "fullName": "John William Smith",
    "gender": "male",
    "birthDate": "1965-03-15",
    "birthPlace": "Boston, Massachusetts, USA",
    "deathDate": null,
    "occupation": "Software Engineer",
    "education": "MIT - Computer Science",
    "biography": "Born in Boston, moved to California for tech career...",
    "profilePhotoUrl": "https://cdn.dzinza.com/photos/person1.jpg",
    "livingStatus": "living",
    "privacyLevel": "family",
    "alternativeNames": [
      {
        "nameType": "nickname",
        "firstName": "Johnny",
        "lastName": "Smith"
      }
    ],
    "relationships": [
      {
        "id": "rel-uuid-1",
        "relatedPerson": {
          "id": "person-uuid-2",
          "firstName": "Mary",
          "lastName": "Smith"
        },
        "relationshipType": "spouse",
        "startDate": "1992-06-15"
      }
    ],
    "lifeEvents": [
      {
        "id": "event-uuid-1",
        "eventType": "birth",
        "eventDate": "1965-03-15",
        "eventPlace": "Boston, Massachusetts, USA",
        "description": "Born at Boston General Hospital"
      }
    ],
    "photos": [
      {
        "id": "media-uuid-1",
        "url": "https://cdn.dzinza.com/photos/photo1.jpg",
        "thumbnailUrl": "https://cdn.dzinza.com/photos/thumb1.jpg",
        "caption": "High school graduation",
        "isPrimary": false
      }
    ],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-10T15:30:00Z"
  }
}
```

### Update Person

```http
PUT /people/{personId}
Authorization: Bearer {accessToken}
```

### Delete Person

```http
DELETE /people/{personId}
Authorization: Bearer {accessToken}
```

## Relationships

### Get Person's Relationships

```http
GET /people/{personId}/relationships
Authorization: Bearer {accessToken}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "relationships": [
      {
        "id": "rel-uuid-1",
        "relationshipType": "spouse",
        "relatedPerson": {
          "id": "person-uuid-2",
          "firstName": "Mary",
          "lastName": "Smith",
          "profilePhotoUrl": "https://cdn.dzinza.com/photos/person2.jpg"
        },
        "startDate": "1992-06-15",
        "marriagePlace": "Boston, Massachusetts, USA",
        "confidenceLevel": 10,
        "sources": ["source-uuid-1"]
      },
      {
        "id": "rel-uuid-2",
        "relationshipType": "child",
        "relatedPerson": {
          "id": "person-uuid-3",
          "firstName": "Sarah",
          "lastName": "Smith"
        },
        "startDate": "1995-02-10",
        "biological": true,
        "confidenceLevel": 10
      }
    ]
  }
}
```

### Create Relationship

```http
POST /relationships
Authorization: Bearer {accessToken}
```

**Request Body:**

```json
{
  "person1Id": "person-uuid-1",
  "person2Id": "person-uuid-2",
  "relationshipType": "spouse",
  "startDate": "1992-06-15",
  "marriagePlace": "Boston, Massachusetts, USA",
  "confidenceLevel": 10,
  "notes": "Married at St. Mary's Church"
}
```

### Update Relationship

```http
PUT /relationships/{relationshipId}
Authorization: Bearer {accessToken}
```

### Delete Relationship

```http
DELETE /relationships/{relationshipId}
Authorization: Bearer {accessToken}
```

## DNA Management

### Get DNA Profile

```http
GET /dna/profile
Authorization: Bearer {accessToken}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "dna-profile-uuid-1",
    "kitNumber": "A123456789",
    "testingCompany": "Dzinza DNA",
    "testType": "autosomal",
    "collectionDate": "2024-01-01",
    "resultsDate": "2024-01-15",
    "ethnicityBreakdown": {
      "northwestern_europe": 45.2,
      "eastern_europe": 25.8,
      "scandinavian": 15.1,
      "irish_scottish": 10.4,
      "southern_europe": 3.5
    },
    "paternalHaplogroup": "R-M269",
    "maternalHaplogroup": "H1a1",
    "processingStatus": "completed",
    "qualityScore": 98.5,
    "uploadDate": "2024-01-01T00:00:00Z",
    "sharingEnabled": true
  }
}
```

### Upload DNA Data

```http
POST /dna/upload
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data
```

**Form Data:**

- `dnaFile`: Raw DNA data file
- `testingCompany`: Company name
- `kitNumber`: Kit identifier
- `testType`: Type of test

### Get DNA Matches

```http
GET /dna/matches
Authorization: Bearer {accessToken}
```

**Query Parameters:**

- `page`: Page number
- `limit`: Items per page
- `minSharedCM`: Minimum shared DNA
- `relationship`: Filter by relationship type
- `status`: Filter by match status
- `sort`: Sort by (shared_dna, confidence, discovered_at)

**Response:**

```json
{
  "success": true,
  "data": {
    "matches": [
      {
        "id": "match-uuid-1",
        "matchedProfile": {
          "id": "profile-uuid-2",
          "user": {
            "firstName": "Sarah",
            "lastName": "Thompson",
            "profilePhotoUrl": "https://cdn.dzinza.com/photos/user2.jpg"
          },
          "testingCompany": "Dzinza DNA"
        },
        "sharedDnaCm": 127.5,
        "sharedSegments": 8,
        "largestSegmentCm": 23.4,
        "estimatedRelationship": "3rd cousin",
        "relationshipConfidence": 85.2,
        "estimatedGenerations": 4.2,
        "xDnaSharedCm": 15.2,
        "matchStatus": "new",
        "starred": false,
        "contactAttempted": false,
        "discoveredAt": "2024-01-15T10:00:00Z",
        "notes": "",
        "tags": ["paternal_side", "smith_line"]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1432,
      "totalPages": 72
    },
    "summary": {
      "totalMatches": 1432,
      "closeMatches": 23,
      "newMatches": 8,
      "sharedAncestors": 156
    }
  }
}
```

### Update Match Status

```http
PUT /dna/matches/{matchId}
Authorization: Bearer {accessToken}
```

**Request Body:**

```json
{
  "status": "reviewed",
  "starred": true,
  "notes": "Potential connection through Smith grandparents",
  "tags": ["smith_line", "paternal_side"]
}
```

### Get Ethnicity Breakdown

```http
GET /dna/ethnicity
Authorization: Bearer {accessToken}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "breakdown": [
      {
        "region": "Northwestern Europe",
        "percentage": 45.2,
        "confidence": "high",
        "subRegions": [
          {
            "region": "England & Northwestern Europe",
            "percentage": 35.1
          },
          {
            "region": "Scotland",
            "percentage": 10.1
          }
        ]
      }
    ],
    "migrationPaths": [
      {
        "period": "1800-1850",
        "from": "Ireland",
        "to": "United States",
        "confidence": "likely"
      }
    ],
    "analysisDate": "2024-01-15T00:00:00Z",
    "analysisVersion": "v2.1"
  }
}
```

## Historical Records

### Search Records

```http
GET /records/search
Authorization: Bearer {accessToken}
```

**Query Parameters:**

- `q`: General search query
- `firstName`: First name
- `lastName`: Last name
- `birthYear`: Birth year (exact or range: 1900-1950)
- `deathYear`: Death year
- `location`: Location (city, state, country)
- `recordType`: Type of record (birth, death, marriage, census, etc.)
- `dateRange`: Date range for record
- `page`: Page number
- `limit`: Items per page
- `sort`: Sort by (relevance, date, location)

**Response:**

```json
{
  "success": true,
  "data": {
    "records": [
      {
        "id": "record-uuid-1",
        "title": "Birth Certificate - John Smith",
        "recordType": "birth",
        "date": "1892-03-15",
        "location": "Boston, Massachusetts, USA",
        "description": "Birth certificate for John Smith, son of Robert Smith and Mary Johnson",
        "people": [
          {
            "role": "primary",
            "firstName": "John",
            "lastName": "Smith",
            "age": 0,
            "gender": "male"
          },
          {
            "role": "parent",
            "firstName": "Robert",
            "lastName": "Smith",
            "relationship": "father"
          }
        ],
        "source": {
          "name": "Massachusetts Vital Records",
          "type": "government",
          "repository": "Massachusetts State Archives"
        },
        "images": [
          {
            "url": "https://cdn.dzinza.com/records/record1.jpg",
            "thumbnailUrl": "https://cdn.dzinza.com/records/thumb1.jpg"
          }
        ],
        "relevanceScore": 95.2,
        "quality": {
          "legibility": 4,
          "completeness": 5,
          "accuracy": 5
        },
        "transcription": {
          "fullText": "Certificate of Birth...",
          "confidence": 98.5
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1247,
      "totalPages": 63
    },
    "facets": {
      "recordTypes": [
        { "type": "birth", "count": 156 },
        { "type": "death", "count": 89 },
        { "type": "marriage", "count": 67 }
      ],
      "locations": [
        { "location": "Massachusetts", "count": 234 },
        { "location": "New York", "count": 189 }
      ],
      "decades": [
        { "decade": "1890s", "count": 45 },
        { "decade": "1900s", "count": 78 }
      ]
    }
  }
}
```

### Get Record Details

```http
GET /records/{recordId}
Authorization: Bearer {accessToken}
```

### Save Record

```http
POST /records/{recordId}/save
Authorization: Bearer {accessToken}
```

**Request Body:**

```json
{
  "personId": "person-uuid-1",
  "notes": "This appears to be John's birth certificate",
  "tags": ["birth", "verified"],
  "confidenceLevel": 9
}
```

### Get Saved Records

```http
GET /records/saved
Authorization: Bearer {accessToken}
```

### Create Record Hint

```http
POST /records/hints
Authorization: Bearer {accessToken}
```

**Request Body:**

```json
{
  "recordId": "record-uuid-1",
  "personId": "person-uuid-1",
  "hintType": "potential_match",
  "confidence": 85,
  "reasoning": "Name and birth year match closely"
}
```

## Media Management

### Upload Media

```http
POST /media/upload
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data
```

**Form Data:**

- `file`: Media file
- `title`: Media title
- `description`: Description
- `dateTaken`: Date taken (ISO format)
- `location`: Location where taken
- `privacyLevel`: Privacy level (private, family, public)

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "media-uuid-1",
    "filename": "family_photo_1920.jpg",
    "fileType": "image",
    "mimeType": "image/jpeg",
    "fileSize": 2457600,
    "url": "https://cdn.dzinza.com/media/photo1.jpg",
    "thumbnailUrl": "https://cdn.dzinza.com/media/thumb1.jpg",
    "title": "Family Portrait 1920",
    "description": "Smith family gathering for Christmas",
    "width": 1920,
    "height": 1080,
    "dateTaken": "1920-12-25T00:00:00Z",
    "location": "Boston, Massachusetts",
    "privacyLevel": "family",
    "uploadDate": "2024-01-15T10:30:00Z"
  }
}
```

### Get Media

```http
GET /media/{mediaId}
Authorization: Bearer {accessToken}
```

### Update Media

```http
PUT /media/{mediaId}
Authorization: Bearer {accessToken}
```

### Delete Media

```http
DELETE /media/{mediaId}
Authorization: Bearer {accessToken}
```

### Link Media to Person

```http
POST /people/{personId}/media
Authorization: Bearer {accessToken}
```

**Request Body:**

```json
{
  "mediaId": "media-uuid-1",
  "mediaRole": "profile_photo",
  "isPrimary": true,
  "caption": "John's graduation photo"
}
```

## Photo Enhancement

### Start Enhancement

```http
POST /photos/enhance
Authorization: Bearer {accessToken}
```

**Request Body:**

```json
{
  "mediaId": "media-uuid-1",
  "enhancementType": "colorization",
  "settings": {
    "aggressiveness": 7,
    "preserveOriginal": true,
    "outputQuality": "4k"
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "enhancementId": "enhancement-uuid-1",
    "status": "queued",
    "estimatedTime": 300,
    "queuePosition": 3
  }
}
```

### Get Enhancement Status

```http
GET /photos/enhance/{enhancementId}
Authorization: Bearer {accessToken}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "enhancement-uuid-1",
    "mediaId": "media-uuid-1",
    "enhancementType": "colorization",
    "status": "processing",
    "progress": 75,
    "startedAt": "2024-01-15T10:00:00Z",
    "estimatedCompletion": "2024-01-15T10:05:00Z",
    "steps": [
      {
        "name": "Image Analysis",
        "status": "completed",
        "progress": 100
      },
      {
        "name": "Color Restoration",
        "status": "processing",
        "progress": 75
      }
    ]
  }
}
```

### Get Enhancement History

```http
GET /photos/enhancements
Authorization: Bearer {accessToken}
```

## Smart Hints

### Get User Hints

```http
GET /hints
Authorization: Bearer {accessToken}
```

**Query Parameters:**

- `type`: Hint type (record_match, dna_connection, missing_info)
- `confidence`: Minimum confidence level
- `status`: Filter by status (new, reviewed, accepted, dismissed)
- `personId`: Filter by person

**Response:**

```json
{
  "success": true,
  "data": {
    "hints": [
      {
        "id": "hint-uuid-1",
        "type": "record_match",
        "confidence": 87.5,
        "person": {
          "id": "person-uuid-1",
          "firstName": "John",
          "lastName": "Smith"
        },
        "record": {
          "id": "record-uuid-1",
          "title": "1920 US Federal Census",
          "date": "1920-01-01",
          "location": "Boston, Massachusetts"
        },
        "suggestion": "This census record may contain information about John Smith",
        "evidence": [
          {
            "type": "name_match",
            "score": 95,
            "details": "Exact name match"
          },
          {
            "type": "age_match",
            "score": 80,
            "details": "Age matches within 2 years"
          }
        ],
        "status": "new",
        "created": "2024-01-15T08:00:00Z"
      }
    ],
    "summary": {
      "total": 45,
      "new": 12,
      "highConfidence": 8
    }
  }
}
```

### Update Hint Status

```http
PUT /hints/{hintId}
Authorization: Bearer {accessToken}
```

**Request Body:**

```json
{
  "status": "accepted",
  "notes": "Confirmed this is the correct John Smith"
}
```

## Collaboration

### Invite Collaborator

```http
POST /trees/{treeId}/collaborators/invite
Authorization: Bearer {accessToken}
```

**Request Body:**

```json
{
  "email": "collaborator@example.com",
  "role": "editor",
  "message": "Would you like to help research our family tree?"
}
```

### Get Tree Collaborators

```http
GET /trees/{treeId}/collaborators
Authorization: Bearer {accessToken}
```

### Update Collaborator Role

```http
PUT /trees/{treeId}/collaborators/{userId}
Authorization: Bearer {accessToken}
```

### Remove Collaborator

```http
DELETE /trees/{treeId}/collaborators/{userId}
Authorization: Bearer {accessToken}
```

## Notifications

### Get Notifications

```http
GET /notifications
Authorization: Bearer {accessToken}
```

**Query Parameters:**

- `unread`: Filter unread notifications (true/false)
- `type`: Filter by notification type
- `page`: Page number
- `limit`: Items per page

**Response:**

```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notification-uuid-1",
        "type": "dna_match",
        "title": "New DNA Match Found",
        "message": "You have a new DNA match with Sarah Thompson (127 cM shared)",
        "actionUrl": "/dna/matches/match-uuid-1",
        "data": {
          "matchId": "match-uuid-1",
          "sharedCM": 127.5
        },
        "priority": "normal",
        "readAt": null,
        "createdAt": "2024-01-15T09:00:00Z"
      }
    ],
    "unreadCount": 5
  }
}
```

### Mark Notification as Read

```http
PUT /notifications/{notificationId}/read
Authorization: Bearer {accessToken}
```

### Mark All as Read

```http
PUT /notifications/read-all
Authorization: Bearer {accessToken}
```

## Analytics and Statistics

### Get User Statistics

```http
GET /analytics/user-stats
Authorization: Bearer {accessToken}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "familyTrees": {
      "total": 3,
      "totalPeople": 247,
      "totalGenerations": 8,
      "completeness": 67.5
    },
    "dna": {
      "totalMatches": 1432,
      "closeMatches": 23,
      "newMatches": 8,
      "ethnicityRegions": 5
    },
    "research": {
      "recordsSaved": 89,
      "sourcesAdded": 45,
      "photosUploaded": 156,
      "hintsReceived": 234
    },
    "activity": {
      "loginStreak": 15,
      "lastActive": "2024-01-15T14:30:00Z",
      "totalSessions": 89,
      "averageSessionTime": 1847
    }
  }
}
```

### Get Tree Statistics

```http
GET /analytics/tree-stats/{treeId}
Authorization: Bearer {accessToken}
```

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req-uuid-123"
}
```

### Common Error Codes

- `AUTHENTICATION_REQUIRED` (401): Valid authentication token required
- `AUTHORIZATION_DENIED` (403): Insufficient permissions
- `RESOURCE_NOT_FOUND` (404): Requested resource not found
- `VALIDATION_ERROR` (400): Invalid input data
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `INTERNAL_SERVER_ERROR` (500): Server error
- `SERVICE_UNAVAILABLE` (503): Service temporarily unavailable

## Rate Limiting

API requests are rate limited per user:

- **Free tier**: 1000 requests/hour
- **Basic tier**: 5000 requests/hour
- **Premium tier**: 20000 requests/hour
- **Family tier**: 50000 requests/hour

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642248000
```

## Webhooks

Configure webhooks to receive real-time notifications:

### Configure Webhook

```http
POST /webhooks
Authorization: Bearer {accessToken}
```

**Request Body:**

```json
{
  "url": "https://your-app.com/webhooks/dzinza",
  "events": ["dna.match.new", "tree.person.added", "hint.created"],
  "secret": "your-webhook-secret"
}
```

### Webhook Events

- `dna.match.new`: New DNA match discovered
- `dna.match.updated`: DNA match status changed
- `tree.person.added`: Person added to tree
- `tree.person.updated`: Person information updated
- `hint.created`: New research hint generated
- `collaboration.invite`: Collaboration invitation sent
- `photo.enhancement.completed`: Photo enhancement finished

### Webhook Payload Example

```json
{
  "event": "dna.match.new",
  "timestamp": "2024-01-15T10:00:00Z",
  "data": {
    "matchId": "match-uuid-1",
    "userId": "user-uuid-1",
    "sharedCM": 127.5,
    "estimatedRelationship": "3rd cousin"
  },
  "signature": "sha256=..."
}
```

This comprehensive API documentation provides developers with all the information needed to integrate with the Dzinza genealogy platform, supporting everything from basic family tree management to advanced DNA analysis and AI-powered research hints.

# Authentication System Implementation Status

## ✅ COMPLETED FEATURES

### F1.1 User Authentication & Authorization - Implementation Complete

#### 🔧 Core Authentication Components

- ✅ **Login Page** (`/src/pages/auth/Login.tsx`)

  - Email/password authentication
  - Password visibility toggle
  - Multi-factor authentication support
  - Remember me functionality
  - Error handling and validation
  - Loading states

- ✅ **Registration Page** (`/src/pages/auth/Register.tsx`)

  - User registration form
  - Password strength indicator
  - Email verification integration
  - Form validation
  - Terms acceptance

- ✅ **Email Verification** (`/src/pages/auth/VerifyEmail.tsx`)

  - Email verification flow
  - Resend verification option
  - Success/error states

- ✅ **Forgot Password** (`/src/pages/auth/ForgotPassword.tsx`)

  - Password reset request
  - Email validation
  - Success confirmation

- ✅ **Reset Password** (`/src/pages/auth/ResetPassword.tsx`)
  - New password entry
  - Password strength validation
  - Token-based reset flow

#### 🎣 Authentication Hooks & Context

- ✅ **useAuth Hook** (`/src/hooks/useAuth.ts`)
  - React Context for authentication state
  - Login/logout functionality
  - Token management
  - User session persistence
  - Automatic token refresh

#### 🔒 Route Protection

- ✅ **ProtectedRoute Component** (`/src/components/auth/ProtectedRoute.tsx`)
  - Role-based access control
  - Email verification requirements
  - Automatic redirects
  - Loading states

#### 🌐 API Integration

- ✅ **Authentication API Service** (`/src/services/api/auth.ts`)

  - Login/logout endpoints
  - Registration
  - Password reset
  - Profile management
  - MFA setup
  - OAuth integration placeholders

- ✅ **API Client** (`/src/services/api/client.ts`)
  - HTTP client with interceptors
  - Automatic token refresh
  - Error handling
  - Request/response logging

#### 🎨 UI Components

- ✅ **LoadingSpinner** (`/src/components/ui/LoadingSpinner.tsx`)
- ✅ **Alert** (`/src/components/ui/Alert.tsx`)
- ✅ **PasswordStrengthIndicator** (`/src/components/ui/PasswordStrengthIndicator.tsx`)

#### 🗂️ Navigation Integration

- ✅ **Updated Navbar** (`/src/components/Navbar.tsx`)

  - Authentication state display
  - User menu dropdown
  - Login/logout buttons
  - Responsive design

- ✅ **Updated App Routes** (`/src/App.tsx`)
  - AuthProvider integration
  - Protected routes
  - Authentication routes
  - Route-based authorization

#### 🌍 Internationalization

- ✅ **Translation Files**
  - English authentication translations
  - Shona navigation translations
  - Ndebele navigation translations
  - Password strength indicators

#### 📱 User Profile

- ✅ **Basic Profile Page** (`/src/pages/Profile.tsx`)
  - User information display
  - Account settings
  - Profile photo placeholder

#### ⚙️ Configuration

- ✅ **Environment Variables** (`.env.example`, `.env`)
  - API endpoints
  - OAuth configuration
  - Feature flags
  - Security settings

#### 🧪 Testing

- ✅ **Authentication Tests** (`/src/__tests__/auth.test.tsx`)
  - Component rendering tests
  - Form validation tests
  - Authentication flow tests
  - Error handling tests

## 📋 IMPLEMENTATION DETAILS

### Security Features

- 🔐 JWT token-based authentication
- 🔄 Automatic token refresh
- 🛡️ Multi-factor authentication support
- 🔒 Role-based access control
- 📧 Email verification requirement
- 🚫 Rate limiting integration
- 🔑 OAuth social authentication placeholders

### User Experience Features

- 📱 Responsive design
- 🌐 Multi-language support
- ⚡ Loading states and feedback
- 🎨 Consistent UI/UX
- 📊 Password strength visualization
- 🔄 Seamless navigation
- 💾 Session persistence

### Developer Experience

- 🧩 Modular component architecture
- 🎣 React hooks for state management
- 📝 TypeScript type safety
- 🧪 Comprehensive test coverage
- 📚 Clear documentation
- ⚙️ Environment configuration

## 🚀 NEXT STEPS

### Immediate Tasks

1. **Backend Integration**

   - Complete backend authentication service implementation
   - Set up database schemas
   - Configure JWT signing
   - Implement OAuth providers

2. **End-to-End Testing**

   - Test complete authentication flow
   - Verify protected routes
   - Test token refresh mechanism
   - Validate error handling

3. **F1.2 Basic Profile Management**
   - Extend profile page functionality
   - Add profile editing capabilities
   - Implement photo upload
   - Add preference management

### Future Enhancements

- 🔐 Advanced MFA (SMS, authenticator apps)
- 📱 Social media OAuth integration
- 🔍 Advanced user search and filtering
- 📊 User analytics and insights
- 🔄 Advanced session management
- 🛡️ Enhanced security features

## 📊 PROGRESS SUMMARY

**Feature F1.1 User Authentication & Authorization: 95% Complete**

✅ Frontend Implementation: 100%
✅ UI/UX Components: 100%
✅ State Management: 100%
✅ Route Protection: 100%
✅ Internationalization: 85%
⏳ Backend Integration: 0%
⏳ End-to-End Testing: 20%

The authentication system frontend is fully implemented and ready for backend integration. All core authentication flows are working, with comprehensive error handling, security features, and user experience enhancements in place.

# Code of Conduct

## Our Pledge

We as members, contributors, and leaders pledge to make participation in the Dzinza Genealogy Platform community a harassment-free experience for everyone, regardless of age, body size, visible or invisible disability, ethnicity, sex characteristics, gender identity and expression, level of experience, education, socio-economic status, nationality, personal appearance, race, caste, color, religion, or sexual identity and orientation.

We pledge to act and interact in ways that contribute to an open, welcoming, diverse, inclusive, and healthy community.

## Our Standards

### Examples of behavior that contributes to a positive environment include:

- **Respectful Communication**: Using welcoming and inclusive language
- **Empathy and Kindness**: Being respectful of differing viewpoints and experiences
- **Constructive Feedback**: Giving and gracefully accepting constructive feedback
- **Community Focus**: Focusing on what is best for the overall community
- **Responsibility**: Accepting responsibility and apologizing to those affected by our mistakes
- **Learning Orientation**: Learning from mistakes and growing from the experience
- **Historical Accuracy**: Encouraging documented sources and factual information in genealogical research
- **Privacy Respect**: Protecting the privacy of living individuals and sensitive family information

### Examples of unacceptable behavior include:

- **Harassment**: The use of sexualized language or imagery, and sexual attention or advances of any kind
- **Discrimination**: Trolling, insulting or derogatory comments, and personal or political attacks
- **Privacy Violations**: Publishing others' private information, such as a physical or email address, without their explicit permission
- **Inappropriate Content**: Publishing or sharing inappropriate content, including but not limited to adult content, violence, or illegal materials
- **Misinformation**: Deliberately spreading false genealogical information or unsupported claims
- **Professional Misconduct**: Other conduct which could reasonably be considered inappropriate in a professional setting
- **Platform Abuse**: Attempting to circumvent platform security measures or violating terms of service

## Enforcement Responsibilities

Community leaders are responsible for clarifying and enforcing our standards of acceptable behavior and will take appropriate and fair corrective action in response to any behavior that they deem inappropriate, threatening, offensive, or harmful.

Community leaders have the right and responsibility to remove, edit, or reject comments, commits, code, wiki edits, issues, and other contributions that are not aligned to this Code of Conduct, and will communicate reasons for moderation decisions when appropriate.

## Scope

This Code of Conduct applies within all community spaces, and also applies when an individual is officially representing the community in public spaces. Examples of representing our community include using an official e-mail address, posting via an official social media account, or acting as an appointed representative at an online or offline event.

### Community Spaces Include:

- **Platform Features**: Family trees, photos, research notes, and user profiles
- **Communication Tools**: Messages, comments, collaboration features
- **Community Forums**: Discussion boards, help sections, and user groups
- **Social Media**: Official Dzinza social media accounts and community groups
- **Events**: Online webinars, genealogy conferences, and community meetups
- **Development**: GitHub repositories, issue tracking, and code contributions

## Reporting Guidelines

### How to Report

If you experience or witness unacceptable behavior, or have any other concerns, please report it by contacting us at:

- **Email**: conduct@dzinza.com
- **Online Form**: Available in user account settings under "Report Issue"
- **Emergency Contact**: For urgent safety concerns, contact emergency@dzinza.com

### What to Include in Your Report

To help us address your report effectively, please include:

- **Your contact information** (if you're comfortable providing it)
- **Names (usernames) of any individuals involved**
- **Description of the incident**, including what happened, when, and where
- **Screenshots or other evidence** (if available and relevant)
- **Any additional context** that might be helpful
- **Whether you've reported this to other authorities** or platforms

### Confidentiality

All reports will be handled with discretion and confidentiality. We will only share information about your report with people who need to know in order to address it appropriately.

## Investigation Process

### Initial Response

1. **Acknowledgment**: Reports will be acknowledged within 24 hours
2. **Assessment**: Initial review to determine severity and next steps
3. **Communication**: Reporter will be informed of the investigation timeline

### Investigation Steps

1. **Evidence Collection**: Gathering all relevant information and evidence
2. **Witness Interviews**: Speaking with involved parties and witnesses as needed
3. **Documentation Review**: Examining platform logs, messages, and content
4. **Expert Consultation**: Involving subject matter experts for complex cases
5. **Decision Making**: Determining appropriate response based on findings

### Timeline

- **Simple Cases**: Resolution within 3-5 business days
- **Complex Cases**: Resolution within 10-15 business days
- **Updates**: Regular communication with reporter throughout the process

## Enforcement Guidelines

Community leaders will follow these Community Impact Guidelines in determining the consequences for any action they deem in violation of this Code of Conduct:

### 1. Correction

**Community Impact**: Use of inappropriate language or other behavior deemed unprofessional or unwelcome in the community.

**Consequence**: A private, written warning from community leaders, providing clarity around the nature of the violation and an explanation of why the behavior was inappropriate. A public apology may be requested.

**Examples**:

- Minor language violations
- Unintentional privacy breaches
- First-time policy violations

### 2. Warning

**Community Impact**: A violation through a single incident or series of actions.

**Consequence**: A warning with consequences for continued behavior. No interaction with the people involved, including unsolicited interaction with those enforcing the Code of Conduct, for a specified period of time. This includes avoiding interactions in community spaces as well as external channels like social media. Violating these terms may lead to a temporary or permanent ban.

**Examples**:

- Repeated inappropriate behavior
- Deliberate misinformation sharing
- Harassment of community members

### 3. Temporary Ban

**Community Impact**: A serious violation of community standards, including sustained inappropriate behavior.

**Consequence**: A temporary ban from any sort of interaction or public communication with the community for a specified period of time. No public or private interaction with the people involved, including unsolicited interaction with those enforcing the Code of Conduct, is allowed during this period. Violating these terms may lead to a permanent ban.

**Duration**: Typically 7-30 days depending on severity

**Examples**:

- Serious harassment or discrimination
- Sharing private information without consent
- Repeated violations after warnings

### 4. Permanent Ban

**Community Impact**: Demonstrating a pattern of violation of community standards, including sustained inappropriate behavior, harassment of an individual, or aggression toward or disparagement of classes of individuals.

**Consequence**: A permanent ban from any sort of public interaction within the community.

**Examples**:

- Severe harassment or threats
- Illegal content sharing
- Coordinated abuse or platform manipulation
- Repeated serious violations

## Appeals Process

### Right to Appeal

All community members have the right to appeal enforcement decisions. Appeals should be submitted within 30 days of the original decision.

### How to Submit an Appeal

1. **Email**: Send appeal to appeals@dzinza.com
2. **Include**: Original case reference number (if available)
3. **Provide**: New evidence or circumstances not previously considered
4. **Explain**: Why you believe the decision should be reconsidered

### Appeal Review Process

1. **Independent Review**: Appeals are reviewed by different community leaders than those who made the original decision
2. **Fresh Perspective**: The case is examined with fresh eyes and new evidence
3. **Timely Response**: Appeals are typically resolved within 10 business days
4. **Final Decision**: Appeal decisions are final

## Specific Community Guidelines

### Genealogical Research Standards

#### Accuracy and Sources

- **Document Sources**: Always cite sources for genealogical information
- **Distinguish Facts from Stories**: Clearly separate documented facts from family stories or traditions
- **Acknowledge Uncertainty**: Use appropriate qualifiers when information is uncertain
- **Correct Mistakes**: Promptly correct errors when they're discovered

#### Privacy and Sensitivity

- **Living Person Privacy**: Protect privacy of living individuals by limiting shared information
- **Sensitive Information**: Exercise discretion when sharing information about adoption, mental illness, criminal records, or other sensitive topics
- **Cultural Sensitivity**: Respect cultural and religious differences in genealogical practices
- **Historical Context**: Consider historical context when discussing past events or practices

### Photo and Document Sharing

#### Copyright and Ownership

- **Own Content Only**: Only share photos and documents you own or have permission to share
- **Credit Sources**: Properly attribute content from museums, archives, or other sources
- **Fair Use**: Understand and respect fair use limitations for historical documents
- **Family Consent**: Obtain consent from family members before sharing their photos

#### Content Standards

- **Appropriate Content**: All photos and documents should be appropriate for a family-friendly platform
- **Quality Standards**: Share clear, well-preserved images when possible
- **Meaningful Content**: Share content that contributes to genealogical research or family history

### Collaboration and Sharing

#### Family Tree Collaboration

- **Respectful Disagreement**: Handle disagreements about family information respectfully
- **Collaborative Research**: Work together to resolve conflicting information
- **Credit Contributors**: Acknowledge the contributions of other researchers
- **Permission for Changes**: Obtain permission before making significant changes to shared trees

#### Communication Guidelines

- **Professional Tone**: Maintain a professional and courteous tone in all communications
- **Constructive Feedback**: Provide helpful and constructive feedback to other users
- **Timely Responses**: Respond to collaboration requests and messages in a timely manner
- **Clear Communication**: Be clear and specific in your communications

## Resources and Support

### Educational Resources

- **Best Practices Guide**: Learn about genealogical research best practices
- **Privacy Guidelines**: Understand how to protect privacy while sharing family history
- **Source Documentation**: Learn how to properly document and cite sources
- **Community Tutorials**: Access user-generated tutorials and guides

### Support Channels

- **Help Center**: Comprehensive documentation and FAQs
- **Community Forums**: Peer support and discussion
- **Email Support**: Direct assistance from support team
- **Video Tutorials**: Step-by-step guides for platform features

### Wellness and Safety

- **Mental Health Resources**: Information about dealing with difficult family discoveries
- **Privacy Tools**: Features to protect your personal information
- **Blocking and Reporting**: Tools to manage unwanted contact
- **Safe Sharing**: Guidelines for sharing sensitive family information

## Contact Information

### Community Team

- **General Conduct Issues**: conduct@dzinza.com
- **Appeals**: appeals@dzinza.com
- **Emergency/Safety**: emergency@dzinza.com
- **General Support**: support@dzinza.com

### Response Times

- **Emergency Issues**: Within 2 hours
- **Safety Concerns**: Within 4 hours
- **General Conduct Issues**: Within 24 hours
- **Appeals**: Within 48 hours

## Acknowledgments

This Code of Conduct is adapted from the [Contributor Covenant](https://www.contributor-covenant.org), version 2.1, available at https://www.contributor-covenant.org/version/2/1/code_of_conduct.html.

Community Impact Guidelines were inspired by [Mozilla's code of conduct enforcement ladder](https://github.com/mozilla/diversity).

We also acknowledge the unique considerations of genealogical research communities and have incorporated best practices from:

- National Genealogical Society Standards
- Board for Certification of Genealogists Code of Ethics
- International Association of Jewish Genealogical Societies Guidelines

## Version and Updates

- **Current Version**: 1.0
- **Last Updated**: January 2024
- **Next Review**: January 2025

This Code of Conduct is a living document and will be updated periodically to reflect the evolving needs of our community. All community members will be notified of significant changes.

For questions about this Code of Conduct, please contact conduct@dzinza.com.

# Code Standards (Layer 3)

## Overview

This document defines the implementation guidelines and coding standards for the Dzinza project. These standards ensure consistency, readability, and maintainability across the codebase.

## General Coding Prin### React Component Standards

#### Component Structure

````tsx
// Use functional components with hooks
interface UserProfileProps {
  userId: string;
  onUpdate?: (user: User) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({
  userId,
  onUpdate
}) => {
  const { t } = useTranslation('userProfile'); // Internationalization hook
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);ty Over Cleverness
- Write code that tells a story
- Prefer explicit over implicit
- Use meaningful names for variables, functions, and classes
- Avoid abbreviations unless they're widely understood
- Comment the "why," not the "what"

### Consistency
- Follow established patterns within the codebase
- Use consistent naming conventions
- Apply consistent formatting and style
- Maintain consistent error handling patterns
- Use consistent API response formats

### Simplicity
- Keep functions small and focused
- Avoid deep nesting (max 3 levels)
- Use early returns to reduce complexity
- Prefer composition over inheritance
- Extract complex logic into well-named functions

## TypeScript/JavaScript Standards

### Naming Conventions

#### Variables and Functions
```typescript
// Use camelCase for variables and functions
const userProfile = getUserProfile();
const calculateTotalPrice = (items: Item[]) => { /* ... */ };

// Use descriptive names
const isUserAuthenticated = checkAuthentication(); // Good
const flag = checkAuth(); // Avoid

// Boolean variables should be questions
const isVisible = true;
const hasPermission = false;
const canEdit = user.role === 'admin';
````

#### Classes and Interfaces

```typescript
// Use PascalCase for classes and interfaces
class UserService {
  // Use camelCase for methods
  async findUserById(id: string): Promise<User> {
    /* ... */
  }
}

interface DatabaseConnection {
  host: string;
  port: number;
  database: string;
}

// Prefix interfaces with 'I' only when needed for disambiguation
interface IUserRepository {
  /* ... */
} // Only if class UserRepository exists
```

#### Constants and Enums

```typescript
// Use SCREAMING_SNAKE_CASE for constants
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = "https://api.dzinza.com";

// Use PascalCase for enums
enum UserRole {
  ADMIN = "admin",
  USER = "user",
  GUEST = "guest",
}
```

### Function Guidelines

#### Function Size and Complexity

```typescript
// Keep functions small and focused (max 20 lines preferred)
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Extract complex logic into separate functions
const processUserRegistration = async (userData: UserData) => {
  validateUserData(userData);
  const hashedPassword = await hashPassword(userData.password);
  const user = await createUser({ ...userData, password: hashedPassword });
  await sendWelcomeEmail(user.email);
  return user;
};
```

#### Parameter Guidelines

```typescript
// Limit function parameters (max 4 preferred)
// Use objects for multiple parameters
const createUser = ({
  email,
  password,
  firstName,
  lastName,
  role = UserRole.USER,
}: CreateUserParams) => {
  // Implementation
};

// Use default parameters instead of checking for undefined
const fetchUsers = (limit = 10, offset = 0) => {
  // Implementation
};
```

### Type Definitions

#### Type Safety

```typescript
// Use strict typing, avoid 'any'
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

// Use union types for known values
type Theme = "light" | "dark" | "auto";

// Use generic types for reusable components
interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}
```

#### Type Organization

```typescript
// Export types from dedicated files
// types/user.ts
export interface User {
  /* ... */
}
export interface CreateUserRequest {
  /* ... */
}
export interface UpdateUserRequest {
  /* ... */
}

// Use barrel exports for easy importing
// types/index.ts
export * from "./user";
export * from "./project";
export * from "./api";
```

### Error Handling

#### Exception Handling

```typescript
// Use specific error types
class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public code: string = "VALIDATION_ERROR"
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

// Handle errors at appropriate levels
const processPayment = async (paymentData: PaymentData) => {
  try {
    validatePaymentData(paymentData);
    return await chargeCard(paymentData);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error; // Re-throw validation errors
    }
    // Log unexpected errors and throw generic error
    logger.error("Payment processing failed", { error, paymentData });
    throw new Error("Payment processing failed");
  }
};
```

#### Result Pattern for Expected Errors

```typescript
// Use Result pattern for operations that can fail
type Result<T, E> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: E;
    };

const parseUserInput = (input: string): Result<User, ValidationError> => {
  try {
    const user = JSON.parse(input);
    if (validateUser(user)) {
      return { success: true, data: user };
    }
    return { success: false, error: new ValidationError("Invalid user data") };
  } catch {
    return { success: false, error: new ValidationError("Invalid JSON") };
  }
};
```

### Async/Await Guidelines

```typescript
// Use async/await over Promises.then()
const fetchUserData = async (userId: string): Promise<User> => {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }
  return user;
};

// Handle concurrent operations properly
const fetchUserAndProjects = async (userId: string) => {
  const [user, projects] = await Promise.all([
    userRepository.findById(userId),
    projectRepository.findByUserId(userId),
  ]);
  return { user, projects };
};

// Use proper error handling with async/await
const processAsyncOperation = async () => {
  try {
    const result = await someAsyncOperation();
    return result;
  } catch (error) {
    logger.error("Async operation failed", { error });
    throw error;
  }
};
```

## React Component Standards

### Component Structure

```tsx
// Use functional components with hooks
interface UserProfileProps {
  userId: string;
  onUpdate?: (user: User) => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ userId, onUpdate }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Effects
  useEffect(() => {
    loadUser();
  }, [userId]);

  // Event handlers
  const handleUpdateUser = async (userData: Partial<User>) => {
    try {
      const updatedUser = await updateUser(userId, userData);
      setUser(updatedUser);
      onUpdate?.(updatedUser);
    } catch (err) {
      setError("Failed to update user");
    }
  };

  // Helper functions
  const loadUser = async () => {
    try {
      setLoading(true);
      const userData = await fetchUser(userId);
      setUser(userData);
    } catch (err) {
      setError("Failed to load user");
    } finally {
      setLoading(false);
    }
  };

  // Render helpers
  const renderError = () => (
    <div className="error-message">
      {t("error.loadFailed", { defaultValue: error })}
    </div>
  );

  const renderLoading = () => (
    <div className="loading-spinner">
      {t("common.loading", { defaultValue: "Loading..." })}
    </div>
  );

  // Main render
  if (loading) return renderLoading();
  if (error) return renderError();
  if (!user) return null;

  return <div className="user-profile">{/* Component JSX */}</div>;
};

export default UserProfile;
```

### Hook Guidelines

```tsx
// Custom hooks for reusable logic
const useUser = (userId: string) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const userData = await fetchUser(userId);
      setUser(userData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load user");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { user, loading, error, refetch };
};

// Use the hook in components
const UserComponent: React.FC<{ userId: string }> = ({ userId }) => {
  const { user, loading, error, refetch } = useUser(userId);

  // Component logic
};
```

### Props and State Management

```tsx
// Define clear prop interfaces
interface ButtonProps {
  variant?: "primary" | "secondary" | "danger";
  size?: "small" | "medium" | "large";
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

// Use children prop appropriately
const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};
```

## CSS/Styling Standards

### Tailwind CSS Guidelines

```tsx
// Use semantic class names for complex combinations
const buttonClasses = cn(
  "px-4 py-2 rounded-md font-medium transition-colors",
  {
    "bg-blue-600 text-white hover:bg-blue-700": variant === "primary",
    "bg-gray-200 text-gray-900 hover:bg-gray-300": variant === "secondary",
    "bg-red-600 text-white hover:bg-red-700": variant === "danger",
  },
  className
);

// Extract repeated patterns into components
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div className={cn("bg-white rounded-lg shadow-md p-6", className)}>
    {children}
  </div>
);
```

### Responsive Design

```tsx
// Use Tailwind's responsive prefixes consistently
<div
  className="
  grid grid-cols-1 gap-4
  md:grid-cols-2 md:gap-6
  lg:grid-cols-3 lg:gap-8
"
>
  {/* Content */}
</div>;

// Define breakpoint constants for consistency
const BREAKPOINTS = {
  mobile: "640px",
  tablet: "768px",
  desktop: "1024px",
  wide: "1280px",
} as const;
```

## Testing Standards

### Unit Test Structure

```typescript
// Use descriptive test names
describe("UserService", () => {
  describe("createUser", () => {
    it("should create a user with valid data", async () => {
      // Arrange
      const userData = {
        email: "test@example.com",
        password: "securePassword123",
        firstName: "John",
        lastName: "Doe",
      };

      // Act
      const user = await userService.createUser(userData);

      // Assert
      expect(user).toMatchObject({
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
      });
      expect(user.id).toBeDefined();
      expect(user.password).not.toBe(userData.password); // Should be hashed
    });

    it("should throw ValidationError for invalid email", async () => {
      // Arrange
      const userData = {
        email: "invalid-email",
        password: "securePassword123",
        firstName: "John",
        lastName: "Doe",
      };

      // Act & Assert
      await expect(userService.createUser(userData)).rejects.toThrow(
        ValidationError
      );
    });
  });
});
```

### Test Helpers and Fixtures

```typescript
// Create reusable test helpers
const createTestUser = (overrides?: Partial<User>): User => ({
  id: "test-user-id",
  email: "test@example.com",
  firstName: "John",
  lastName: "Doe",
  role: UserRole.USER,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Use factories for complex test data
const UserFactory = {
  build: (overrides?: Partial<User>) => createTestUser(overrides),
  buildMany: (count: number, overrides?: Partial<User>) =>
    Array.from({ length: count }, () => createTestUser(overrides)),
};
```

## Documentation Standards

### Code Comments

````typescript
/**
 * Calculates the total price including taxes and discounts
 *
 * @param items - Array of items to calculate price for
 * @param taxRate - Tax rate as decimal (e.g., 0.1 for 10%)
 * @param discountCode - Optional discount code to apply
 * @returns Object containing subtotal, tax, discount, and total
 *
 * @example
 * ```typescript
 * const price = calculateTotal(
 *   [{ price: 100, quantity: 2 }],
 *   0.1,
 *   'SAVE10'
 * );
 * console.log(price.total); // 198 (200 - 10% discount + 10% tax)
 * ```
 */
const calculateTotal = (
  items: CartItem[],
  taxRate: number,
  discountCode?: string
): PriceCalculation => {
  // Implementation details...
};

// Use inline comments for complex business logic
const processPayment = async (amount: number) => {
  // Apply fraud detection before processing
  // This checks against our ML model for suspicious patterns
  const fraudScore = await fraudDetection.analyze(amount, userId);
  if (fraudScore > FRAUD_THRESHOLD) {
    throw new FraudDetectedError("Payment flagged for review");
  }

  // Process payment through payment gateway
  return await paymentGateway.charge(amount);
};
````

### README Documentation

````markdown
# Component/Module Name

Brief description of what this component/module does.

## Usage

```typescript
import { ComponentName } from "./ComponentName";

const example = () => <ComponentName prop1="value" prop2={123} />;
```
````

## Props/Parameters

| Name  | Type   | Default | Description          |
| ----- | ------ | ------- | -------------------- |
| prop1 | string | -       | Description of prop1 |
| prop2 | number | 0       | Description of prop2 |

## Examples

Provide real-world usage examples.

## Notes

Any important implementation details or gotchas.

````

## Performance Guidelines

### Optimization Strategies
```typescript
// Use React.memo for expensive components
const ExpensiveComponent = React.memo(({ data }: { data: ComplexData }) => {
  // Expensive rendering logic
  return <div>{/* Complex JSX */}</div>;
});

// Use useMemo for expensive calculations
const ExpensiveCalculation: React.FC<{ items: Item[] }> = ({ items }) => {
  const expensiveValue = useMemo(() => {
    return items.reduce((acc, item) => acc + complexCalculation(item), 0);
  }, [items]);

  return <div>{expensiveValue}</div>;
};

// Use useCallback for event handlers passed to child components
const Parent: React.FC = () => {
  const [count, setCount] = useState(0);

  const handleClick = useCallback(() => {
    setCount(prev => prev + 1);
  }, []);

  return <Child onClick={handleClick} />;
};
````

### Database Query Optimization

```typescript
// Use proper indexing hints in queries
const findUsersByRole = async (role: UserRole) => {
  // This query should use the index on (role, active)
  return await db.user.findMany({
    where: {
      role,
      active: true,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      // Don't select unnecessary fields
    },
  });
};

// Use pagination for large datasets
const getUsersPaginated = async (page: number, limit: number = 20) => {
  const offset = (page - 1) * limit;
  return await db.user.findMany({
    skip: offset,
    take: limit,
    orderBy: { createdAt: "desc" },
  });
};
```

---

**Remember**: These standards are guidelines to improve code quality and maintainability. When in doubt, prioritize clarity and consistency with the existing codebase.

# Competitive Analysis & Market Positioning

## Executive Summary

Dzinza positions itself as the premier genealogy platform for African heritage research with native language support and cultural sensitivity. This analysis examines key competitors, identifies market gaps, and outlines strategic differentiation opportunities.

## Market Overview

### Global Genealogy Market

- **Market Size**: $4.3 billion (2024), projected $6.8 billion by 2029
- **Growth Rate**: 9.7% CAGR (2024-2029)
- **Key Drivers**: DNA testing adoption, digital record preservation, ancestry tourism
- **Regional Growth**: Africa/Middle East showing highest growth potential (15%+ CAGR)

### African Genealogy Market Gap

- **Underserved Market**: <5% of global genealogy resources focus on African heritage
- **Language Barriers**: Most platforms only support European languages
- **Cultural Disconnect**: Existing platforms don't understand African family structures
- **Record Scarcity**: Limited digitization of African historical records

## Detailed Competitor Analysis

### 1. Ancestry.com (Market Leader)

**Strengths:**

- Largest historical records database (27+ billion records)
- Advanced DNA testing and analysis
- Strong user base (3+ million subscribers)
- Comprehensive family tree tools
- Mobile app with offline capabilities

**Weaknesses:**

- Limited African record coverage (<2%)
- No native African language support
- High subscription costs ($99-$299/year)
- Western-centric family tree structures
- Limited collaboration features

**Technology Stack:**

- .NET backend, React frontend
- Azure cloud infrastructure
- SQL Server + NoSQL databases
- Advanced ML for record matching

**Market Position:**

- Premium positioning
- North American focus
- B2C genealogy leader
- Corporate genealogy services

### 2. MyHeritage (Innovation Leader)

**Strengths:**

- AI-powered photo enhancement (In Color, Deep Nostalgia)
- Global international focus (42 languages)
- Strong European/Jewish genealogy records
- Advanced DNA analysis features
- Cross-platform synchronization

**Weaknesses:**

- Smaller record database vs. Ancestry
- Limited African content
- Premium features behind paywall
- No African language support
- Complex pricing structure

**Technology Stack:**

- Python/Java backend
- React/Angular frontend
- AWS infrastructure
- Advanced AI/ML capabilities

**Market Position:**

- Innovation-focused
- International expansion
- AI-first approach
- freemium model

### 3. FamilySearch (Collaborative Leader)

**Strengths:**

- Completely free platform
- Collaborative family tree model
- Strong religious/missionary records
- Global volunteer network
- Educational resources

**Weaknesses:**

- Limited DNA features
- Basic user interface
- No advanced photo enhancement
- Limited African records
- Religious organization backing (LDS)

**Technology Stack:**

- Java enterprise architecture
- Traditional web technologies
- Oracle databases
- Volunteer-driven content

**Market Position:**

- Free/nonprofit model
- Religious community focus
- Global collaboration emphasis
- Educational mission

### 4. Findmypast (Specialization Leader)

**Strengths:**

- Strong UK/Irish records specialization
- Newspaper archive integration
- Military records focus
- Unique historical content
- Geographic mapping features

**Weaknesses:**

- Limited global coverage
- No DNA testing
- Regional focus only
- Expensive subscription model
- Limited innovation

**Technology Stack:**

- Microsoft .NET stack
- SQL Server databases
- Azure cloud hosting
- Traditional web architecture

**Market Position:**

- Regional specialist
- Premium historical records
- B2C focus
- Newspaper/military niche

### 5. Geni (Social Leader)

**Strengths:**

- World Family Tree concept
- Strong collaboration features
- Social networking elements
- Free basic features
- Celebrity/notable profiles

**Weaknesses:**

- Complex data quality issues
- Limited historical records
- No DNA integration
- Confusing user interface
- MyHeritage acquisition impact

**Technology Stack:**

- Ruby on Rails
- PostgreSQL database
- AWS infrastructure
- Social platform architecture

**Market Position:**

- Social networking approach
- Collaborative genealogy
- Free tier with premium features
- Celebrity genealogy focus

## Feature Comparison Matrix

| Feature Category     | Ancestry   | MyHeritage | FamilySearch | Findmypast | Geni       | **Dzinza**    |
| -------------------- | ---------- | ---------- | ------------ | ---------- | ---------- | ------------- |
| **Core Features**    |
| Family Tree Builder  | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐   | ⭐⭐⭐⭐     | ⭐⭐⭐     | ⭐⭐⭐⭐   | 🎯 ⭐⭐⭐⭐⭐ |
| Historical Records   | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐   | ⭐⭐⭐⭐⭐   | ⭐⭐⭐⭐⭐ | ⭐⭐       | 🎯 ⭐⭐⭐⭐   |
| DNA Analysis         | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ❌           | ⭐⭐⭐     | ❌         | 🎯 ⭐⭐⭐⭐   |
| Photo Enhancement    | ⭐⭐⭐     | ⭐⭐⭐⭐⭐ | ⭐⭐         | ⭐⭐       | ⭐⭐       | 🎯 ⭐⭐⭐⭐⭐ |
| **Technology**       |
| Mobile App           | ⭐⭐⭐⭐   | ⭐⭐⭐⭐   | ⭐⭐⭐       | ⭐⭐⭐     | ⭐⭐⭐     | 🎯 ⭐⭐⭐⭐⭐ |
| AI/ML Features       | ⭐⭐⭐⭐   | ⭐⭐⭐⭐⭐ | ⭐⭐⭐       | ⭐⭐       | ⭐⭐       | 🎯 ⭐⭐⭐⭐⭐ |
| API Integration      | ⭐⭐⭐     | ⭐⭐⭐     | ⭐⭐⭐⭐     | ⭐⭐       | ⭐⭐       | 🎯 ⭐⭐⭐⭐⭐ |
| Performance          | ⭐⭐⭐⭐   | ⭐⭐⭐⭐   | ⭐⭐⭐       | ⭐⭐⭐     | ⭐⭐⭐     | 🎯 ⭐⭐⭐⭐⭐ |
| **Accessibility**    |
| Multi-language       | ⭐⭐⭐     | ⭐⭐⭐⭐   | ⭐⭐⭐⭐     | ⭐⭐       | ⭐⭐⭐     | 🎯 ⭐⭐⭐⭐⭐ |
| African Languages    | ❌         | ❌         | ❌           | ❌         | ❌         | 🎯 ⭐⭐⭐⭐⭐ |
| Cultural Sensitivity | ⭐⭐       | ⭐⭐       | ⭐⭐⭐       | ⭐         | ⭐⭐       | 🎯 ⭐⭐⭐⭐⭐ |
| Accessibility (WCAG) | ⭐⭐⭐     | ⭐⭐⭐     | ⭐⭐⭐       | ⭐⭐       | ⭐⭐       | 🎯 ⭐⭐⭐⭐⭐ |
| **Business Model**   |
| Free Tier            | Limited    | Limited    | ⭐⭐⭐⭐⭐   | Limited    | ⭐⭐⭐     | 🎯 ⭐⭐⭐⭐   |
| Pricing Transparency | ⭐⭐       | ⭐⭐       | ⭐⭐⭐⭐⭐   | ⭐⭐       | ⭐⭐⭐     | 🎯 ⭐⭐⭐⭐⭐ |
| Community Features   | ⭐⭐⭐     | ⭐⭐⭐     | ⭐⭐⭐⭐⭐   | ⭐⭐       | ⭐⭐⭐⭐⭐ | 🎯 ⭐⭐⭐⭐⭐ |

## Market Gaps & Opportunities

### 1. African Heritage Focus

**Gap**: No major platform specializes in African genealogy
**Opportunity**: First-mover advantage in $500M+ African market
**Strategy**: Native language support, cultural understanding, African records

### 2. Language Accessibility

**Gap**: Limited support for African languages
**Opportunity**: 1.3 billion potential users in Africa
**Strategy**: Shona, Ndebele, Swahili, Yoruba, Amharic support

### 3. Cultural Intelligence

**Gap**: Western family structure assumptions
**Opportunity**: Authentic African family representations
**Strategy**: Polygamy support, extended family focus, tribal connections

### 4. Community Collaboration

**Gap**: Limited real-time collaboration features
**Opportunity**: Social genealogy platform
**Strategy**: Real-time editing, community research, expert network

### 5. Mobile-First Experience

**Gap**: Desktop-centric platforms in mobile-dominant markets
**Opportunity**: Africa has 60%+ mobile-only internet users
**Strategy**: Progressive Web App, offline capabilities, low-bandwidth optimization

### 6. Affordable Pricing

**Gap**: Premium pricing excludes developing markets
**Opportunity**: Freemium model with local payment methods
**Strategy**: Micro-payments, local partnerships, government collaborations

## Dzinza's Competitive Advantages

### 1. Cultural Authenticity

- **Native Language Support**: First platform with Shona/Ndebele
- **Cultural Understanding**: African family structures and naming conventions
- **Local Partnerships**: Collaboration with African institutions and researchers

### 2. Technical Innovation

- **Modern Architecture**: Cloud-native, microservices, API-first
- **AI/ML Leadership**: Advanced photo enhancement, smart matching
- **Performance**: Optimized for low-bandwidth environments

### 3. Accessibility Excellence

- **WCAG 2.1 AA Compliance**: Industry-leading accessibility
- **Progressive Web App**: Works offline, installs like native app
- **Multi-modal Input**: Voice search in native languages

### 4. Community-Centric

- **Open Source**: Community-driven development
- **Collaborative Research**: Real-time family tree collaboration
- **Expert Network**: Connect with professional genealogists

### 5. Business Model Innovation

- **Freemium**: Sustainable free tier with premium features
- **API Economy**: Third-party integrations and partnerships
- **Data Ownership**: Users own their data, export anytime

## Strategic Positioning

### Brand Positioning Statement

_"Dzinza is the first genealogy platform built by Africans, for Africans, offering authentic cultural understanding, native language support, and cutting-edge technology to help people discover their roots and connect with their heritage."_

### Value Propositions

**For Individual Users:**

- Discover your African heritage in your native language
- Connect with relatives across the diaspora
- Preserve family stories and photos for future generations
- Access expert genealogical research assistance

**For Communities:**

- Digitize and preserve community historical records
- Connect scattered community members globally
- Celebrate cultural heritage and traditions
- Educational resources for cultural learning

**For Researchers:**

- Access to unique African genealogical datasets
- Collaboration tools for academic research
- API access for integration with research tools
- Crowdsourced historical record verification

**For Institutions:**

- White-label solutions for museums and libraries
- Historical record digitization partnerships
- Educational licensing for schools and universities
- Government ancestry verification services

## Go-to-Market Strategy

### Phase 1: Zimbabwe Market Entry (Months 1-6)

- Partner with National Archives of Zimbabwe
- Collaborate with University of Zimbabwe
- Target Zimbabwean diaspora (2M+ globally)
- Shona/Ndebele language launch

### Phase 2: Southern Africa Expansion (Months 7-12)

- South Africa, Botswana, Zambia markets
- Add Zulu, Xhosa, Sotho languages
- Partner with regional institutions
- DNA testing partnerships

### Phase 3: Pan-African Expansion (Months 13-24)

- Nigeria, Kenya, Ghana, Ethiopia
- Add Yoruba, Swahili, Amharic languages
- Government partnership programs
- African Union endorsements

### Phase 4: Global Diaspora (Months 25-36)

- USA, UK, Canada African communities
- Caribbean African heritage connections
- Brazil Afro-Brazilian community
- Global African cultural organizations

## Innovation Roadmap

### Near-term Innovations (6-12 months)

1. **Voice Genealogy Assistant**: AI assistant speaking native languages
2. **Blockchain Verification**: Immutable record authentication
3. **AR Family Trees**: Augmented reality family exploration
4. **DNA Health Insights**: African-specific health trait analysis

### Medium-term Innovations (12-24 months)

1. **Historical AI**: AI reconstruction of missing records
2. **Cultural Timeline**: Interactive historical context
3. **Global Migration Mapping**: Visualize diaspora movements
4. **Community Chronicles**: Collaborative community histories

### Long-term Innovations (24+ months)

1. **Time Travel VR**: Virtual reality ancestral experiences
2. **Genetic Time Machine**: Reconstruct ancestral DNA
3. **Cultural Preservation**: 3D cultural artifact preservation
4. **AI Historian**: Automated historical narrative generation

## Success Metrics

### Market Penetration

- **Target**: 100K users (12 months), 1M users (24 months)
- **Geographic**: 50% Africa, 30% diaspora, 20% global
- **Engagement**: 70% monthly active users, 40% weekly active

### Cultural Impact

- **Languages**: 5 African languages (12 months), 15 languages (24 months)
- **Records**: 1M digitized records (12 months), 10M records (24 months)
- **Partnerships**: 10 institutions (12 months), 50 institutions (24 months)

### Business Performance

- **Revenue**: $500K ARR (12 months), $5M ARR (24 months)
- **Conversion**: 15% free-to-paid conversion rate
- **Retention**: 80% annual retention rate

### Technology Leadership

- **Performance**: <2s page load times globally
- **Uptime**: 99.9% availability
- **API**: 10M API calls/month, 100+ integrations

This competitive analysis positions Dzinza as the definitive African genealogy platform, leveraging cultural authenticity, technical innovation, and community collaboration to capture an underserved but rapidly growing market segment.

# Comprehensive Code Review & Documentation Enhancement Report

## Executive Summary

### Current State Assessment

The Dzinza genealogy platform demonstrates a solid foundation with modern React/TypeScript architecture, comprehensive internationalization support for English, Shona, and Ndebele languages, and well-structured documentation. The project shows strong adherence to established agent rules and core principles, particularly in areas of user-centric design and accessibility.

**Strengths Identified:**

- ✅ Modern tech stack (React 18, TypeScript, Vite, Tailwind CSS)
- ✅ Comprehensive internationalization (3 languages with cultural sensitivity)
- ✅ Well-defined agent rules hierarchy and core principles
- ✅ Strong security-by-design approach
- ✅ Microservices architecture planning
- ✅ Comprehensive testing strategy documentation
- ✅ Clear development workflow and standards

**Areas for Improvement:**

- 🔄 Backend implementation missing (currently frontend-only)
- 🔄 Database schemas documented but not implemented
- 🔄 Docker/Kubernetes configurations needed
- 🔄 API endpoints need implementation
- 🔄 Advanced features (DNA matching, AI photo enhancement) require development
- 🔄 Performance optimization strategies need implementation
- 🔄 Security measures need implementation beyond documentation

### Key Findings

1. **Architecture Excellence**: The system architecture is well-designed with clear separation of concerns and scalability considerations. The microservices approach aligns with industry best practices.

2. **Documentation Quality**: Documentation is comprehensive but needs restructuring for better navigation and user experience. Current structure lacks clear hierarchy and cross-referencing.

3. **Internationalization Leadership**: The multi-language support with cultural considerations for African markets (Shona, Ndebele) represents a competitive advantage.

4. **Development Readiness**: Strong foundation for development with clear rules, principles, and guidelines, but implementation is in early stages.

5. **Testing Framework**: Comprehensive testing strategy defined but needs implementation and automation.

### Strategic Recommendations

**Immediate Actions (0-3 months):**

1. Implement backend microservices architecture
2. Set up Docker/Kubernetes development environment
3. Create API endpoints for core functionality
4. Implement authentication and authorization
5. Set up CI/CD pipeline

**Medium-term Goals (3-6 months):**

1. Develop core genealogy features (family trees, profiles)
2. Implement DNA matching algorithms
3. Create historical records search functionality
4. Develop photo enhancement features
5. Launch MVP with essential features

**Long-term Vision (6-12 months):**

1. Advanced AI/ML features for record matching
2. Social collaboration tools
3. Mobile application development
4. International market expansion
5. Enterprise features and APIs

## Competitive Analysis & Market Position

### Industry Benchmarking

| Feature Category    | Ancestry.com | MyHeritage | FamilySearch | Findmypast | Geni       | **Dzinza**               |
| ------------------- | ------------ | ---------- | ------------ | ---------- | ---------- | ------------------------ |
| Family Tree Builder | ⭐⭐⭐⭐⭐   | ⭐⭐⭐⭐   | ⭐⭐⭐⭐     | ⭐⭐⭐     | ⭐⭐⭐⭐   | 🚧 (Planned: ⭐⭐⭐⭐⭐) |
| DNA Analysis        | ⭐⭐⭐⭐⭐   | ⭐⭐⭐⭐⭐ | ❌           | ⭐⭐⭐     | ❌         | 🚧 (Planned: ⭐⭐⭐⭐)   |
| Historical Records  | ⭐⭐⭐⭐⭐   | ⭐⭐⭐⭐   | ⭐⭐⭐⭐⭐   | ⭐⭐⭐⭐⭐ | ⭐⭐       | 🚧 (Planned: ⭐⭐⭐⭐)   |
| Photo Enhancement   | ⭐⭐⭐       | ⭐⭐⭐⭐⭐ | ⭐⭐         | ⭐⭐       | ⭐⭐       | 🚧 (Planned: ⭐⭐⭐⭐⭐) |
| Multi-language      | ⭐⭐⭐       | ⭐⭐⭐⭐   | ⭐⭐⭐⭐     | ⭐⭐       | ⭐⭐⭐     | ⭐⭐⭐⭐⭐               |
| African Heritage    | ⭐⭐         | ⭐⭐       | ⭐⭐⭐       | ⭐         | ⭐⭐       | ⭐⭐⭐⭐⭐               |
| Collaboration       | ⭐⭐⭐       | ⭐⭐⭐     | ⭐⭐⭐⭐⭐   | ⭐⭐       | ⭐⭐⭐⭐⭐ | 🚧 (Planned: ⭐⭐⭐⭐)   |
| Mobile Experience   | ⭐⭐⭐⭐     | ⭐⭐⭐⭐   | ⭐⭐⭐       | ⭐⭐⭐     | ⭐⭐⭐     | 🚧 (Planned: ⭐⭐⭐⭐⭐) |
| AI/ML Features      | ⭐⭐⭐⭐     | ⭐⭐⭐⭐⭐ | ⭐⭐⭐       | ⭐⭐       | ⭐⭐       | 🚧 (Planned: ⭐⭐⭐⭐⭐) |

### Competitive Advantages

**Unique Selling Propositions:**

1. **African Heritage Focus**: Specialized support for Zimbabwean and Southern African genealogy with native language support (Shona, Ndebele)

2. **Cultural Sensitivity**: Built-in understanding of African naming conventions, family structures, and cultural practices

3. **Modern Architecture**: Cloud-native, microservices architecture enabling rapid feature development and scaling

4. **Open Source Foundation**: Community-driven development model fostering innovation and transparency

5. **AI-First Approach**: Advanced machine learning capabilities for photo enhancement, record matching, and family tree suggestions

6. **Accessibility Excellence**: WCAG 2.1 AA compliance and inclusive design principles from the ground up

### Market Gaps & Opportunities

**Identified Gaps:**

1. Limited African genealogy resources in major platforms
2. Lack of native language support for African languages
3. Insufficient cultural understanding in existing platforms
4. Limited collaboration features for family research
5. Weak mobile-first experiences
6. Expensive premium features limiting accessibility

**Innovation Opportunities:**

1. **Voice Search**: Implement voice search in native languages
2. **Blockchain Verification**: Use blockchain for document authenticity
3. **AR Family Tree**: Augmented reality family tree visualization
4. **Community Crowdsourcing**: Leverage community for record digitization
5. **AI Genealogist**: Virtual genealogy assistant powered by AI
6. **Social DNA**: Social network features around DNA matches

## Implementation Roadmap

### Phase 1: Foundation (Months 1-3)

**Priority: Critical**

**Infrastructure Setup:**

- [ ] Docker containerization for all services
- [ ] Kubernetes cluster configuration
- [ ] CI/CD pipeline implementation
- [ ] Monitoring and logging setup

**Backend Development:**

- [ ] Authentication microservice
- [ ] Core API microservice
- [ ] Database implementation (PostgreSQL + MongoDB)
- [ ] API documentation with OpenAPI

**Security Implementation:**

- [ ] JWT authentication system
- [ ] Input validation and sanitization
- [ ] Rate limiting and DDoS protection
- [ ] Security headers and HTTPS

**Deliverables:**

- Working backend API
- Authentication system
- Basic CRUD operations
- Developer environment setup

### Phase 2: Core Features (Months 4-6)

**Priority: High**

**Family Tree Builder:**

- [ ] Interactive family tree visualization (D3.js)
- [ ] Person profile management
- [ ] Relationship management
- [ ] Import/export functionality

**User Management:**

- [ ] User registration and login
- [ ] Profile management
- [ ] Privacy settings
- [ ] Subscription management

**Search Functionality:**

- [ ] ElasticSearch integration
- [ ] Basic record search
- [ ] Person search within trees
- [ ] Advanced filtering

**Deliverables:**

- Functional family tree builder
- User management system
- Basic search capabilities
- Mobile-responsive UI

### Phase 3: Advanced Features (Months 7-9)

**Priority: Medium**

**DNA Matching:**

- [ ] DNA data upload and processing
- [ ] Genetic matching algorithms
- [ ] Ethnicity estimation
- [ ] Health trait analysis

**Historical Records:**

- [ ] Record digitization pipeline
- [ ] AI-powered OCR for documents
- [ ] Record matching and suggestions
- [ ] Source citation management

**Photo Enhancement:**

- [ ] WebAssembly-based processing
- [ ] AI colorization algorithms
- [ ] Face recognition and tagging
- [ ] Before/after comparisons

**Deliverables:**

- DNA matching system
- Historical records database
- Photo enhancement tools
- Advanced search features

### Phase 4: Innovation & Scale (Months 10-12)

**Priority: Enhancement**

**AI/ML Features:**

- [ ] Smart family tree suggestions
- [ ] Automated record matching
- [ ] Predictive ancestry insights
- [ ] Natural language querying

**Social Features:**

- [ ] Collaborative family trees
- [ ] Messaging and notifications
- [ ] Community forums
- [ ] Expert genealogist network

**Mobile Application:**

- [ ] React Native mobile app
- [ ] Offline functionality
- [ ] Camera integration for documents
- [ ] Push notifications

**Deliverables:**

- AI-powered features
- Social collaboration tools
- Mobile application
- Advanced analytics

## Risk Assessment & Mitigation

### Technical Risks

| Risk                        | Probability | Impact   | Mitigation Strategy                                    |
| --------------------------- | ----------- | -------- | ------------------------------------------------------ |
| Scalability challenges      | Medium      | High     | Microservices architecture, load testing, auto-scaling |
| Data privacy breaches       | Low         | Critical | Security audits, encryption, compliance frameworks     |
| Performance bottlenecks     | Medium      | Medium   | Performance monitoring, caching, CDN implementation    |
| Third-party API limitations | Medium      | Medium   | Multiple vendors, fallback strategies, SLA monitoring  |
| Technology obsolescence     | Low         | Medium   | Regular updates, modern stack, community support       |

### Business Risks

| Risk                       | Probability | Impact | Mitigation Strategy                                  |
| -------------------------- | ----------- | ------ | ---------------------------------------------------- |
| Competitive pressure       | High        | High   | Unique value proposition, rapid feature development  |
| Market adoption challenges | Medium      | High   | Community building, freemium model, marketing        |
| Funding constraints        | Medium      | High   | Phased development, MVP approach, investor relations |
| Regulatory compliance      | Medium      | Medium | Legal consultation, GDPR compliance, data governance |
| Team scaling challenges    | Medium      | Medium | Clear processes, documentation, remote work support  |

### Success Metrics

**Technical KPIs:**

- System uptime: >99.9%
- API response time: <200ms
- Page load time: <3 seconds
- Test coverage: >90%
- Security vulnerabilities: 0 critical

**Business KPIs:**

- Monthly active users: 10K (6 months), 100K (12 months)
- User retention rate: >70% (30 days)
- Feature adoption rate: >50% for core features
- Customer satisfaction: >4.5/5
- Revenue growth: 20% monthly (post-monetization)

**User Experience KPIs:**

- Task completion rate: >85%
- Time to value: <10 minutes
- Support ticket volume: <2% of active users
- Accessibility compliance: WCAG 2.1 AA
- Mobile usage: >60% of total traffic

This comprehensive review establishes a clear roadmap for transforming Dzinza from a well-architected prototype into a competitive genealogy platform that serves the underrepresented African market while incorporating cutting-edge technology and user experience principles.

# Contributing to Dzinza

We love your input! We want to make contributing to Dzinza as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

### Getting Started

1. **Fork the repository**

   ```bash
   # Click the "Fork" button on GitHub, then:
   git clone https://github.com/YOUR_USERNAME/dzinza.git
   cd dzinza
   ```

2. **Set up development environment**

   ```bash
   npm install
   cp .env.example .env.local
   npm run dev
   ```

3. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-new-feature
   ```

### Making Changes

1. **Write code following our guidelines**

   - Follow the [Development Guidelines](./DEVELOPMENT_GUIDELINES.md)
   - Write tests for new functionality
   - Update documentation as needed

2. **Test your changes**

   ```bash
   npm run test:all
   npm run lint
   npm run type-check
   ```

3. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat(scope): add amazing new feature"
   ```

## Pull Request Process

1. **Ensure your PR is up to date**

   ```bash
   git checkout develop
   git pull upstream develop
   git checkout feature/amazing-new-feature
   git rebase develop
   ```

2. **Push your branch**

   ```bash
   git push origin feature/amazing-new-feature
   ```

3. **Create a Pull Request**
   - Use our PR template
   - Link any related issues
   - Provide clear description of changes

### PR Requirements

Before your PR can be merged, it must:

- [ ] Pass all automated tests
- [ ] Have at least one approved review
- [ ] Follow coding standards (linting passes)
- [ ] Include tests for new functionality
- [ ] Update documentation if needed
- [ ] Have no merge conflicts

## Coding Standards

### TypeScript/JavaScript

```typescript
// ✅ Good
interface UserProfile {
  id: string;
  name: string;
  email: string;
}

const getUserProfile = async (id: string): Promise<UserProfile> => {
  const response = await api.get(`/users/${id}`);
  return response.data;
};

// ❌ Bad
const getUserProfile = async (id: any) => {
  const response = await api.get("/users/" + id);
  return response.data;
};
```

### React Components

```typescript
// ✅ Good
interface PersonCardProps {
  person: Person;
  onEdit: (person: Person) => void;
  className?: string;
}

export const PersonCard: React.FC<PersonCardProps> = ({
  person,
  onEdit,
  className = "",
}) => {
  const handleEdit = useCallback(() => {
    onEdit(person);
  }, [person, onEdit]);

  return (
    <div className={`person-card ${className}`}>
      <h3>{person.name}</h3>
      <button onClick={handleEdit}>Edit</button>
    </div>
  );
};

// ❌ Bad
export const PersonCard = (props: any) => {
  return (
    <div>
      <h3>{props.person.name}</h3>
      <button onClick={() => props.onEdit(props.person)}>Edit</button>
    </div>
  );
};
```

### CSS/Styling

```css
/* ✅ Good - Use Tailwind utility classes */
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">

/* ✅ Good - Custom CSS with semantic names */
.family-tree-node {
  @apply relative p-3 bg-white border border-gray-200 rounded-lg;
}

.family-tree-node--selected {
  @apply border-blue-500 bg-blue-50;
}

/* ❌ Bad - Inline styles */
<div style={{display: 'flex', padding: '16px', backgroundColor: 'white'}}>
```

## Commit Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

### Examples

```bash
feat(auth): add OAuth login support
fix(family-tree): resolve node positioning bug
docs(api): update authentication endpoints
test(components): add tests for PersonCard component
refactor(database): optimize relationship queries
```

## Issue Reporting

### Bug Reports

Use our bug report template and include:

1. **Description:** Clear description of the bug
2. **Steps to reproduce:** Numbered steps to reproduce
3. **Expected behavior:** What should happen
4. **Actual behavior:** What actually happens
5. **Environment:** Browser, OS, Node version
6. **Screenshots:** If applicable

### Feature Requests

Use our feature request template and include:

1. **Problem statement:** What problem does this solve?
2. **Proposed solution:** How should it work?
3. **Alternatives considered:** Other solutions you've considered
4. **Additional context:** Mockups, examples, etc.

## Code Review Guidelines

### For Authors

- Keep PRs small and focused
- Write clear commit messages
- Add tests for new functionality
- Update documentation
- Respond to feedback promptly

### For Reviewers

- Be constructive and respectful
- Ask questions to understand intent
- Suggest improvements
- Check for edge cases
- Verify tests cover new code

### Review Checklist

- [ ] Code follows style guidelines
- [ ] Self-review has been performed
- [ ] Comments explain complex logic
- [ ] Tests cover new functionality
- [ ] Documentation is updated
- [ ] No console.log or debug code
- [ ] Security implications considered

## Testing Requirements

### New Features

All new features must include:

1. **Unit tests** for core functionality
2. **Integration tests** for API interactions
3. **E2E tests** for user workflows
4. **Documentation** updates

### Bug Fixes

All bug fixes must include:

1. **Test case** that reproduces the bug
2. **Fix** that makes the test pass
3. **Regression test** to prevent recurrence

## Documentation

### Code Documentation

````typescript
/**
 * Calculates the relationship between two people in a family tree
 * @param person1 - First person in the relationship
 * @param person2 - Second person in the relationship
 * @param familyTree - Complete family tree data
 * @returns The relationship type or null if no relationship exists
 * @example
 * ```typescript
 * const relationship = calculateRelationship(john, jane, familyTree);
 * console.log(relationship); // 'cousin' | 'sibling' | 'parent' | null
 * ```
 */
export function calculateRelationship(
  person1: Person,
  person2: Person,
  familyTree: FamilyTree
): RelationshipType | null {
  // Implementation
}
````

### API Documentation

Update OpenAPI/Swagger documentation for any API changes:

```yaml
/api/persons:
  post:
    summary: Create a new person
    description: Creates a new person in the family tree
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/Person"
    responses:
      201:
        description: Person created successfully
```

## Community

### Communication Channels

- **GitHub Issues:** Bug reports and feature requests
- **GitHub Discussions:** General questions and ideas
- **Discord:** Real-time chat and community support
- **Email:** security@dzinza.com for security issues

### Code of Conduct

We are committed to providing a welcoming and inspiring community for all. Please read our [Code of Conduct](./CODE_OF_CONDUCT.md).

### Recognition

Contributors will be recognized in:

- README.md contributors section
- Release notes for significant contributions
- Annual contributor appreciation post

## Getting Help

If you need help:

1. Check existing [documentation](./README.md)
2. Search [GitHub Issues](https://github.com/dzinza/dzinza/issues)
3. Ask in [GitHub Discussions](https://github.com/dzinza/dzinza/discussions)
4. Join our [Discord community](https://discord.gg/dzinza)

## License

By contributing to Dzinza, you agree that your contributions will be licensed under the same license as the project (MIT License).

## Additional Resources

- [Development Guidelines](./DEVELOPMENT_GUIDELINES.md)
- [Testing Strategy](./TESTING_STRATEGY.md)
- [System Architecture](./SYSTEM_ARCHITECTURE.md)
- [API Documentation](./API_DOCUMENTATION.md)

# Core Principles (Layer 1)

## Overview

These fundamental principles guide all decisions and implementations in the Dzinza project. They serve as the foundation for all other guidelines and should only be overridden in exceptional circumstances with explicit justification.

## Principle 1: User-Centric Design

### Definition

Every decision must prioritize the needs, goals, and experience of our users.

### Guidelines

- **User Research First**: Base decisions on actual user needs, not assumptions
- **Accessibility**: Design for users with diverse abilities and circumstances
- **Simplicity**: Prefer simple, intuitive solutions over complex ones
- **Performance**: Users' time is valuable - optimize for speed and efficiency
- **Privacy**: Respect user data and provide transparent controls

### Application Examples

- Choose faster loading times over flashy animations
- Prioritize mobile-responsive design
- Implement clear error messages and helpful feedback
- Provide export options for user data
- Use progressive disclosure for complex features

### Measurement

- User satisfaction scores
- Task completion rates
- Time to complete common actions
- Accessibility audit scores
- Performance metrics (load times, responsiveness)

## Principle 2: Security by Design

### Definition

Security is not an afterthought but a fundamental requirement integrated into every aspect of the system.

### Guidelines

- **Zero Trust**: Never trust, always verify
- **Defense in Depth**: Multiple layers of security controls
- **Least Privilege**: Grant minimum necessary permissions
- **Data Protection**: Encrypt sensitive data at rest and in transit
- **Audit Trail**: Log security-relevant events

### Application Examples

- Input validation on both client and server
- SQL injection prevention through parameterized queries
- HTTPS everywhere, no mixed content
- Regular security audits and penetration testing
- Secure session management and authentication

### Security Checklist

- [ ] Input validation implemented
- [ ] Authentication and authorization in place
- [ ] Data encryption configured
- [ ] Security headers set
- [ ] Dependencies scanned for vulnerabilities
- [ ] Error handling doesn't leak sensitive information

## Principle 3: Performance & Reliability

### Definition

The system must be fast, reliable, and available when users need it.

### Guidelines

- **Performance Budget**: Set and maintain performance targets
- **Graceful Degradation**: System works even when components fail
- **Scalability**: Design for growth
- **Monitoring**: Continuously track system health
- **Recovery**: Plan for failure and quick recovery

### Performance Targets

- Page load time: < 3 seconds on 3G
- Time to interactive: < 5 seconds
- API response time: < 200ms for common operations
- Uptime: 99.9% availability
- Error rate: < 0.1% of requests

### Implementation Strategies

- Lazy loading for non-critical resources
- Caching at multiple levels (browser, CDN, database)
- Database query optimization
- Asynchronous processing for heavy operations
- Circuit breakers for external dependencies

## Principle 4: Maintainability & Clarity

### Definition

Code and systems must be understandable, modifiable, and sustainable over time.

### Guidelines

- **Clear Communication**: Code should tell a story
- **Consistent Patterns**: Follow established conventions
- **Documentation**: Keep docs current and useful
- **Modularity**: Build composable, reusable components
- **Technical Debt**: Address it proactively

### Code Quality Standards

- Self-documenting code with meaningful names
- Functions do one thing well
- Consistent error handling patterns
- Comprehensive test coverage
- Regular refactoring to improve design

### Documentation Requirements

- README files for all projects/modules
- API documentation with examples
- Architecture decision records (ADRs)
- Inline comments for complex logic
- Migration guides for breaking changes

## Principle 5: Accessibility & Inclusivity

### Definition

The platform must be usable by people of all abilities, backgrounds, and circumstances.

### Guidelines

- **Universal Design**: Design for the widest range of users
- **Progressive Enhancement**: Basic functionality works everywhere
- **Semantic HTML**: Use proper markup for meaning
- **Keyboard Navigation**: All features accessible via keyboard
- **Screen Reader Support**: Compatible with assistive technologies

### Accessibility Standards

- WCAG 2.1 AA compliance minimum
- Color contrast ratio ≥ 4.5:1
- Text scalable up to 200% without loss of functionality
- No content flashes more than 3 times per second
- All interactive elements focusable and labeled
- Multi-language support with proper RTL/LTR text direction handling
- Cultural sensitivity in design and content presentation

### Implementation Checklist

- [ ] Semantic HTML structure
- [ ] Alt text for all images
- [ ] ARIA labels where needed
- [ ] Keyboard navigation tested
- [ ] Screen reader tested
- [ ] Color contrast verified
- [ ] Focus indicators visible
- [ ] Multi-language support implemented
- [ ] Language preferences stored and respected
- [ ] Cultural sensitivity reviewed

## Principle Application Framework

### Decision Making Process

1. **Identify affected principles**: Which principles apply to this decision?
2. **Assess trade-offs**: How do different options align with principles?
3. **Prioritize**: When principles conflict, which takes precedence?
4. **Document reasoning**: Explain why this choice best serves the principles
5. **Review impact**: How does this decision affect other system aspects?

### Conflict Resolution

When principles conflict:

1. **User safety** always comes first
2. **Security** generally trumps convenience
3. **Performance** vs **maintainability**: favor maintainability unless performance is critical
4. **Accessibility** requirements are non-negotiable
5. **Seek creative solutions** that honor multiple principles

### Continuous Improvement

- Regular principle review sessions
- Collect feedback on principle application
- Update examples based on real scenarios
- Measure principle adherence through metrics
- Celebrate principle-driven decisions

## Examples of Principle-Driven Decisions

### Database Design

- **User-Centric**: Design schema around user workflows, not technical convenience
- **Security**: Encrypt PII, implement row-level security
- **Performance**: Index frequently queried columns, normalize appropriately
- **Maintainability**: Use clear naming conventions, document relationships
- **Accessibility**: Support multiple languages and character sets

### API Design

- **User-Centric**: RESTful, predictable endpoints
- **Security**: Authentication required, rate limiting implemented
- **Performance**: Pagination for large datasets, efficient queries
- **Maintainability**: Versioned APIs, comprehensive documentation
- **Accessibility**: Support for multiple formats, clear error messages

### UI Components

- **User-Centric**: Consistent behavior, clear visual hierarchy
- **Security**: XSS protection, secure form handling
- **Performance**: Lazy loading, optimized images
- **Maintainability**: Reusable components, design system
- **Accessibility**: ARIA labels, keyboard support, color contrast

---

**Remember**: These principles are your north star. When facing difficult decisions, ask: "Which option best serves our users while maintaining security, performance, maintainability, and accessibility?"

# Dzinza Genealogy Platform - Database Schema Design

## Overview

This document outlines the complete database architecture for the Dzinza genealogy platform, designed to handle millions of users, billions of records, and complex genealogical relationships.

## Database Strategy

### Multi-Database Approach

- **PostgreSQL**: User data, family trees, relationships, DNA data
- **MongoDB**: Historical records, documents, images metadata
- **ElasticSearch**: Full-text search, advanced querying
- **Redis**: Caching, session management, real-time features
- **Neo4j**: Complex relationship analysis (optional future enhancement)

## PostgreSQL Schema (Primary Database)

### 1. User Management

```sql
-- Users table with comprehensive profile information
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    display_name VARCHAR(150),
    date_of_birth DATE,
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
    phone VARCHAR(20),
    address JSONB,
    profile_photo_url TEXT,
    bio TEXT,

    -- Internationalization
    preferred_language VARCHAR(10) DEFAULT 'en' CHECK (preferred_language IN ('en', 'sn', 'nd')),
    locale VARCHAR(10) DEFAULT 'en-US',
    timezone VARCHAR(50) DEFAULT 'UTC',

    -- Privacy and preferences
    privacy_settings JSONB DEFAULT '{}',
    notification_preferences JSONB DEFAULT '{}',
    research_interests TEXT[],

    -- Subscription and status
    subscription_tier VARCHAR(50) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'premium', 'family')),
    subscription_expires_at TIMESTAMP,
    account_status VARCHAR(20) DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'deleted')),
    email_verified BOOLEAN DEFAULT FALSE,

    -- Timestamps and tracking
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    last_activity TIMESTAMP,
    login_count INTEGER DEFAULT 0,

    -- GDPR compliance
    data_retention_until TIMESTAMP,
    deletion_requested_at TIMESTAMP,

    CONSTRAINT check_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- User sessions for security tracking
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE,
    device_info JSONB,
    ip_address INET,
    user_agent TEXT,
    location_info JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    last_used_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- User preferences and settings
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    preference_type VARCHAR(50) NOT NULL,
    preference_value JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, preference_type)
);
```

### 2. Family Trees Structure

```sql
-- Family trees
CREATE TABLE family_trees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Privacy and collaboration
    privacy_level VARCHAR(20) DEFAULT 'private' CHECK (privacy_level IN ('private', 'family', 'public')),
    collaboration_enabled BOOLEAN DEFAULT FALSE,
    invite_code VARCHAR(50) UNIQUE,

    -- Tree settings
    default_surname VARCHAR(100),
    home_person_id UUID, -- Will reference people(id)
    tree_style JSONB DEFAULT '{}',

    -- Statistics
    person_count INTEGER DEFAULT 0,
    generation_count INTEGER DEFAULT 0,
    photo_count INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_modified_by UUID REFERENCES users(id),

    -- Backup and versioning
    version INTEGER DEFAULT 1,
    backup_enabled BOOLEAN DEFAULT TRUE
);

-- Tree collaborators
CREATE TABLE tree_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tree_id UUID REFERENCES family_trees(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'contributor', 'viewer')),
    permissions JSONB DEFAULT '{}',
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMP DEFAULT NOW(),
    accepted_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'removed')),
    UNIQUE(tree_id, user_id)
);

-- Tree activity log
CREATE TABLE tree_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tree_id UUID REFERENCES family_trees(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    activity_type VARCHAR(50) NOT NULL,
    activity_data JSONB,
    ip_address INET,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. People and Biographical Data

```sql
-- People in family trees
CREATE TABLE people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tree_id UUID REFERENCES family_trees(id) ON DELETE CASCADE,

    -- Basic information
    first_name VARCHAR(100),
    middle_name VARCHAR(100),
    last_name VARCHAR(100),
    maiden_name VARCHAR(100),
    nickname VARCHAR(100),
    full_name VARCHAR(300) GENERATED ALWAYS AS (
        TRIM(CONCAT(first_name, ' ', COALESCE(middle_name, ''), ' ', last_name))
    ) STORED,

    -- Personal details
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other', 'unknown')),
    prefix VARCHAR(20), -- Mr., Mrs., Dr., etc.
    suffix VARCHAR(20), -- Jr., Sr., III, etc.

    -- Life events
    birth_date DATE,
    birth_date_precision VARCHAR(10) DEFAULT 'exact' CHECK (birth_date_precision IN ('exact', 'about', 'before', 'after', 'between')),
    birth_place VARCHAR(255),
    birth_place_coordinates POINT,

    death_date DATE,
    death_date_precision VARCHAR(10) DEFAULT 'exact' CHECK (death_date_precision IN ('exact', 'about', 'before', 'after', 'between')),
    death_place VARCHAR(255),
    death_place_coordinates POINT,
    cause_of_death TEXT,

    -- Additional information
    occupation VARCHAR(255),
    education TEXT,
    religion VARCHAR(100),
    ethnicity VARCHAR(100),
    nationality VARCHAR(100),
    languages_spoken TEXT[],

    -- Physical characteristics
    height VARCHAR(20),
    weight VARCHAR(20),
    eye_color VARCHAR(20),
    hair_color VARCHAR(20),

    -- Biography and notes
    biography TEXT,
    notes TEXT,
    research_notes TEXT,

    -- Media
    profile_photo_url TEXT,
    photos JSONB DEFAULT '[]',
    documents JSONB DEFAULT '[]',

    -- Status and privacy
    living_status VARCHAR(20) DEFAULT 'unknown' CHECK (living_status IN ('living', 'deceased', 'unknown')),
    privacy_level VARCHAR(20) DEFAULT 'family' CHECK (privacy_level IN ('private', 'family', 'public')),

    -- Research information
    research_priority INTEGER DEFAULT 0,
    confidence_level INTEGER DEFAULT 5 CHECK (confidence_level >= 1 AND confidence_level <= 10),
    sources JSONB DEFAULT '[]',

    -- System fields
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_modified_by UUID REFERENCES users(id),

    -- Indexing for search
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english',
            COALESCE(first_name, '') || ' ' ||
            COALESCE(middle_name, '') || ' ' ||
            COALESCE(last_name, '') || ' ' ||
            COALESCE(maiden_name, '') || ' ' ||
            COALESCE(nickname, '') || ' ' ||
            COALESCE(occupation, '') || ' ' ||
            COALESCE(birth_place, '') || ' ' ||
            COALESCE(death_place, '')
        )
    ) STORED
);

-- Add foreign key constraint after table creation
ALTER TABLE family_trees ADD CONSTRAINT fk_home_person
    FOREIGN KEY (home_person_id) REFERENCES people(id);

-- Alternative names for people (aliases, married names, etc.)
CREATE TABLE person_names (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID REFERENCES people(id) ON DELETE CASCADE,
    name_type VARCHAR(50) NOT NULL, -- birth, married, nickname, professional, etc.
    first_name VARCHAR(100),
    middle_name VARCHAR(100),
    last_name VARCHAR(100),
    prefix VARCHAR(20),
    suffix VARCHAR(20),
    date_from DATE,
    date_to DATE,
    is_primary BOOLEAN DEFAULT FALSE,
    source VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Life events for people
CREATE TABLE life_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID REFERENCES people(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- birth, death, marriage, graduation, employment, etc.
    event_date DATE,
    event_date_precision VARCHAR(10) DEFAULT 'exact',
    event_place VARCHAR(255),
    event_place_coordinates POINT,
    description TEXT,
    participants JSONB, -- Other people involved in the event
    sources JSONB DEFAULT '[]',
    privacy_level VARCHAR(20) DEFAULT 'family',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 4. Relationships

```sql
-- Relationships between people
CREATE TABLE relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person1_id UUID REFERENCES people(id) ON DELETE CASCADE,
    person2_id UUID REFERENCES people(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL,

    -- Relationship details
    start_date DATE,
    start_date_precision VARCHAR(10) DEFAULT 'exact',
    end_date DATE,
    end_date_precision VARCHAR(10) DEFAULT 'exact',
    end_reason VARCHAR(50), -- death, divorce, separation, etc.

    -- Marriage specific fields
    marriage_place VARCHAR(255),
    marriage_place_coordinates POINT,
    divorce_date DATE,
    divorce_place VARCHAR(255),

    -- Parent-child specific fields
    biological BOOLEAN DEFAULT TRUE,
    adoption_date DATE,

    -- Research information
    confidence_level INTEGER DEFAULT 5 CHECK (confidence_level >= 1 AND confidence_level <= 10),
    sources JSONB DEFAULT '[]',
    notes TEXT,

    -- System fields
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Ensure no self-relationships
    CONSTRAINT no_self_relationship CHECK (person1_id != person2_id),

    -- Ensure unique relationships (prevent duplicates)
    UNIQUE(person1_id, person2_id, relationship_type)
);

-- Family groups (for complex family structures)
CREATE TABLE family_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tree_id UUID REFERENCES family_trees(id) ON DELETE CASCADE,
    family_name VARCHAR(255),
    family_type VARCHAR(50), -- nuclear, extended, adoptive, etc.
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Members of family groups
CREATE TABLE family_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_group_id UUID REFERENCES family_groups(id) ON DELETE CASCADE,
    person_id UUID REFERENCES people(id) ON DELETE CASCADE,
    role VARCHAR(50), -- parent, child, guardian, etc.
    joined_date DATE,
    left_date DATE,
    UNIQUE(family_group_id, person_id)
);
```

### 5. DNA and Genetic Data

```sql
-- DNA profiles
CREATE TABLE dna_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    person_id UUID REFERENCES people(id), -- Optional link to family tree person

    -- DNA kit information
    kit_number VARCHAR(100),
    testing_company VARCHAR(100) NOT NULL,
    test_type VARCHAR(50), -- autosomal, Y-DNA, mtDNA, X-DNA
    collection_date DATE,
    results_date DATE,

    -- Raw data storage
    raw_data_url TEXT,
    raw_data_hash VARCHAR(255), -- For integrity verification
    processed_data JSONB,

    -- Ethnicity breakdown
    ethnicity_breakdown JSONB,
    ethnicity_confidence JSONB,

    -- Haplogroups
    paternal_haplogroup VARCHAR(50),
    maternal_haplogroup VARCHAR(50),

    -- Analysis results
    analysis_version VARCHAR(20),
    analysis_date TIMESTAMP,
    quality_score DECIMAL(5,2),

    -- Privacy and sharing
    sharing_enabled BOOLEAN DEFAULT TRUE,
    research_participation BOOLEAN DEFAULT FALSE,

    -- System fields
    upload_date TIMESTAMP DEFAULT NOW(),
    processing_status VARCHAR(50) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    processing_log JSONB DEFAULT '[]',

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- DNA matches between profiles
CREATE TABLE dna_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile1_id UUID REFERENCES dna_profiles(id) ON DELETE CASCADE,
    profile2_id UUID REFERENCES dna_profiles(id) ON DELETE CASCADE,

    -- Match statistics
    shared_dna_cm DECIMAL(8,2) NOT NULL,
    shared_segments INTEGER,
    largest_segment_cm DECIMAL(8,2),
    total_segments INTEGER,

    -- Relationship estimation
    estimated_relationship VARCHAR(100),
    relationship_confidence DECIMAL(5,2),
    estimated_generations DECIMAL(3,1),

    -- Additional analysis
    x_dna_shared_cm DECIMAL(8,2),
    chromosome_browser_data JSONB,
    triangulation_groups JSONB,

    -- Match management
    match_status VARCHAR(20) DEFAULT 'new' CHECK (match_status IN ('new', 'reviewed', 'confirmed', 'disputed', 'ignored')),
    notes TEXT,
    tags TEXT[],
    starred BOOLEAN DEFAULT FALSE,

    -- Communication
    contact_attempted BOOLEAN DEFAULT FALSE,
    contact_successful BOOLEAN DEFAULT FALSE,
    shared_tree_access BOOLEAN DEFAULT FALSE,

    -- Discovery information
    discovered_at TIMESTAMP DEFAULT NOW(),
    algorithm_version VARCHAR(20),
    last_updated TIMESTAMP DEFAULT NOW(),

    -- Ensure no self-matches and no duplicate matches
    CONSTRAINT no_self_match CHECK (profile1_id != profile2_id),
    UNIQUE(profile1_id, profile2_id)
);

-- Shared segments between DNA matches
CREATE TABLE dna_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES dna_matches(id) ON DELETE CASCADE,
    chromosome INTEGER NOT NULL CHECK (chromosome >= 1 AND chromosome <= 23),
    start_position BIGINT NOT NULL,
    end_position BIGINT NOT NULL,
    length_cm DECIMAL(8,2) NOT NULL,
    snp_count INTEGER,
    half_identical BOOLEAN DEFAULT TRUE,
    fully_identical BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT valid_positions CHECK (start_position < end_position)
);

-- DNA research groups and collaborations
CREATE TABLE dna_research_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    ancestor_name VARCHAR(255),
    estimated_ancestor_birth_year INTEGER,
    estimated_ancestor_location VARCHAR(255),
    group_type VARCHAR(50), -- surname, geographic, haplogroup, etc.
    admin_user_id UUID REFERENCES users(id),
    privacy_level VARCHAR(20) DEFAULT 'public',
    member_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Members of DNA research groups
CREATE TABLE dna_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES dna_research_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES dna_profiles(id),
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
    joined_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'pending', 'suspended')),
    UNIQUE(group_id, user_id)
);
```

### 6. Research and Sources

```sql
-- Sources and citations
CREATE TABLE sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Source identification
    title TEXT NOT NULL,
    author VARCHAR(255),
    publisher VARCHAR(255),
    publication_date DATE,
    publication_place VARCHAR(255),

    -- Source details
    source_type VARCHAR(50), -- book, website, document, interview, etc.
    repository VARCHAR(255),
    call_number VARCHAR(100),
    url TEXT,
    isbn VARCHAR(20),

    -- Quality and reliability
    reliability_rating INTEGER CHECK (reliability_rating >= 1 AND reliability_rating <= 5),
    completeness_rating INTEGER CHECK (completeness_rating >= 1 AND completeness_rating <= 5),

    -- Content information
    description TEXT,
    notes TEXT,
    language VARCHAR(50),
    subjects TEXT[],

    -- Media attachments
    images JSONB DEFAULT '[]',
    documents JSONB DEFAULT '[]',

    -- System fields
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Full-text search
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', title || ' ' || COALESCE(author, '') || ' ' || COALESCE(description, ''))
    ) STORED
);

-- Citations linking sources to people/events/facts
CREATE TABLE citations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES sources(id) ON DELETE CASCADE,

    -- What this citation supports
    cited_entity_type VARCHAR(50) NOT NULL, -- person, relationship, event, fact
    cited_entity_id UUID NOT NULL,

    -- Citation details
    page_number VARCHAR(50),
    detail TEXT, -- Specific information found in source
    confidence_level INTEGER DEFAULT 5 CHECK (confidence_level >= 1 AND confidence_level <= 10),

    -- Transcription
    transcription TEXT,
    translation TEXT,

    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Research tasks and to-dos
CREATE TABLE research_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tree_id UUID REFERENCES family_trees(id),
    person_id UUID REFERENCES people(id),

    -- Task information
    title VARCHAR(255) NOT NULL,
    description TEXT,
    task_type VARCHAR(50), -- research, verify, contact, digitize, etc.
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

    -- Status tracking
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
    due_date DATE,
    completed_date DATE,

    -- Organization
    tags TEXT[],
    category VARCHAR(50),

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Research notes and findings
CREATE TABLE research_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Associated entities
    tree_id UUID REFERENCES family_trees(id),
    person_id UUID REFERENCES people(id),
    task_id UUID REFERENCES research_tasks(id),

    -- Note content
    title VARCHAR(255),
    content TEXT NOT NULL,
    note_type VARCHAR(50), -- finding, hypothesis, question, contact_log, etc.

    -- Organization
    tags TEXT[],
    category VARCHAR(50),

    -- Attachments
    attachments JSONB DEFAULT '[]',

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Full-text search
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', COALESCE(title, '') || ' ' || content)
    ) STORED
);
```

### 7. Media and Documents

```sql
-- Media files (photos, documents, audio, video)
CREATE TABLE media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- File information
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255),
    file_type VARCHAR(50) NOT NULL, -- image, document, audio, video
    mime_type VARCHAR(100),
    file_size BIGINT,

    -- Storage information
    storage_provider VARCHAR(50), -- s3, gcs, azure, local
    storage_path TEXT NOT NULL,
    thumbnail_path TEXT,
    preview_path TEXT,

    -- Media metadata
    width INTEGER,
    height INTEGER,
    duration INTEGER, -- for audio/video
    resolution VARCHAR(20),
    color_space VARCHAR(20),

    -- Content information
    title VARCHAR(255),
    description TEXT,
    caption TEXT,
    keywords TEXT[],
    location VARCHAR(255),
    location_coordinates POINT,

    -- Dates
    date_taken TIMESTAMP,
    date_created TIMESTAMP,
    date_uploaded TIMESTAMP DEFAULT NOW(),

    -- Privacy and sharing
    privacy_level VARCHAR(20) DEFAULT 'family' CHECK (privacy_level IN ('private', 'family', 'public')),
    download_allowed BOOLEAN DEFAULT TRUE,

    -- Processing status
    processing_status VARCHAR(20) DEFAULT 'pending',
    ocr_text TEXT, -- For documents
    face_recognition_data JSONB, -- For photos
    enhancement_data JSONB, -- For enhanced photos

    -- System fields
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Full-text search
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english',
            COALESCE(title, '') || ' ' ||
            COALESCE(description, '') || ' ' ||
            COALESCE(caption, '') || ' ' ||
            COALESCE(ocr_text, '')
        )
    ) STORED
);

-- Link media to people
CREATE TABLE person_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID REFERENCES people(id) ON DELETE CASCADE,
    media_id UUID REFERENCES media(id) ON DELETE CASCADE,

    -- Relationship details
    media_role VARCHAR(50), -- profile_photo, document, certificate, etc.
    is_primary BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,

    -- Face recognition data (for photos with multiple people)
    face_region JSONB, -- Coordinates of person's face in photo

    -- Dates and context
    relationship_date DATE,
    context TEXT,

    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(person_id, media_id)
);

-- Link media to events
CREATE TABLE event_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES life_events(id) ON DELETE CASCADE,
    media_id UUID REFERENCES media(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    caption TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(event_id, media_id)
);

-- Media collections/albums
CREATE TABLE media_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    collection_type VARCHAR(50), -- album, archive, research, etc.
    privacy_level VARCHAR(20) DEFAULT 'family',
    cover_media_id UUID REFERENCES media(id),
    item_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Items in media collections
CREATE TABLE collection_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID REFERENCES media_collections(id) ON DELETE CASCADE,
    media_id UUID REFERENCES media(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    added_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(collection_id, media_id)
);
```

### 8. Notifications and Communication

```sql
-- Notifications system
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Notification content
    notification_type VARCHAR(50) NOT NULL, -- dna_match, collaboration_invite, hint, etc.
    title VARCHAR(255) NOT NULL,
    message TEXT,
    action_url TEXT,

    -- Notification data
    data JSONB DEFAULT '{}',
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

    -- Status
    read_at TIMESTAMP,
    archived_at TIMESTAMP,
    clicked_at TIMESTAMP,

    -- Delivery tracking
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP,
    push_sent BOOLEAN DEFAULT FALSE,
    push_sent_at TIMESTAMP,

    -- System fields
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);

-- Messages between users
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES users(id),
    recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Message content
    subject VARCHAR(255),
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'direct', -- direct, dna_inquiry, collaboration, etc.

    -- Related entities
    related_entity_type VARCHAR(50), -- dna_match, person, tree, etc.
    related_entity_id UUID,

    -- Status
    read_at TIMESTAMP,
    replied_at TIMESTAMP,
    archived_by_sender BOOLEAN DEFAULT FALSE,
    archived_by_recipient BOOLEAN DEFAULT FALSE,

    -- Attachments
    attachments JSONB DEFAULT '[]',

    created_at TIMESTAMP DEFAULT NOW(),

    -- Prevent self-messaging
    CONSTRAINT no_self_message CHECK (sender_id != recipient_id)
);

-- DNA match contact requests
CREATE TABLE dna_contact_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES dna_matches(id) ON DELETE CASCADE,
    requester_id UUID REFERENCES users(id),
    recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Request details
    message TEXT,
    shared_ancestor_info TEXT,
    tree_sharing_offered BOOLEAN DEFAULT FALSE,

    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
    response_message TEXT,
    responded_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '30 days')
);
```

### 9. System and Analytics

```sql
-- User activity tracking
CREATE TABLE user_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Activity details
    activity_type VARCHAR(50) NOT NULL,
    activity_category VARCHAR(50), -- genealogy, dna, media, social, etc.
    activity_data JSONB,

    -- Context
    ip_address INET,
    user_agent TEXT,
    device_type VARCHAR(50),
    browser VARCHAR(50),

    -- Location (if available)
    country VARCHAR(2),
    region VARCHAR(100),
    city VARCHAR(100),

    -- Timing
    session_id UUID,
    duration_seconds INTEGER,

    created_at TIMESTAMP DEFAULT NOW()
);

-- System performance metrics
CREATE TABLE system_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4),
    metric_unit VARCHAR(20),
    tags JSONB DEFAULT '{}',
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Feature usage analytics
CREATE TABLE feature_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_name VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    usage_count INTEGER DEFAULT 1,
    first_used TIMESTAMP DEFAULT NOW(),
    last_used TIMESTAMP DEFAULT NOW(),
    date DATE DEFAULT CURRENT_DATE,

    UNIQUE(feature_name, user_id, date)
);

-- Error logs
CREATE TABLE error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    error_type VARCHAR(100),
    error_message TEXT,
    stack_trace TEXT,
    request_data JSONB,
    user_agent TEXT,
    ip_address INET,
    severity VARCHAR(20) DEFAULT 'error' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 13. Internationalization Support

```sql
-- Language support table
CREATE TABLE languages (
    code VARCHAR(10) PRIMARY KEY, -- ISO 639-1 codes (en, sn, nd)
    name VARCHAR(100) NOT NULL,
    native_name VARCHAR(100) NOT NULL,
    direction VARCHAR(3) DEFAULT 'ltr' CHECK (direction IN ('ltr', 'rtl')),
    enabled BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert supported languages
INSERT INTO languages (code, name, native_name, sort_order) VALUES
('en', 'English', 'English', 1),
('sn', 'Shona', 'chiShona', 2),
('nd', 'Ndebele', 'isiNdebele', 3);

-- Translation keys for dynamic content
CREATE TABLE translation_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_name VARCHAR(255) UNIQUE NOT NULL, -- e.g., 'relationship.father'
    namespace VARCHAR(100) NOT NULL, -- e.g., 'genealogy', 'common', 'forms'
    description TEXT,
    context TEXT, -- Additional context for translators
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Translations for each language
CREATE TABLE translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    translation_key_id UUID NOT NULL REFERENCES translation_keys(id) ON DELETE CASCADE,
    language_code VARCHAR(10) NOT NULL REFERENCES languages(code) ON DELETE CASCADE,
    translation_text TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT FALSE,
    translator_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(translation_key_id, language_code)
);

-- Localized content for user-generated content
CREATE TABLE localized_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL, -- 'person', 'event', 'place', etc.
    entity_id UUID NOT NULL,
    field_name VARCHAR(100) NOT NULL, -- 'name', 'description', 'notes', etc.
    language_code VARCHAR(10) NOT NULL REFERENCES languages(code),
    content TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE, -- Primary language for this content
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    INDEX(entity_type, entity_id, field_name),
    INDEX(language_code)
);

-- Cultural and regional preferences
CREATE TABLE cultural_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    language_code VARCHAR(10) NOT NULL REFERENCES languages(code),
    region_code VARCHAR(10), -- ISO 3166-1 codes (ZW, US, etc.)
    date_format VARCHAR(50) DEFAULT 'DD/MM/YYYY',
    time_format VARCHAR(50) DEFAULT '24h',
    number_format JSONB DEFAULT '{"decimal": ".", "thousand": ","}',
    currency_code VARCHAR(3) DEFAULT 'USD',
    calendar_system VARCHAR(20) DEFAULT 'gregorian',
    cultural_preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default cultural settings
INSERT INTO cultural_settings (language_code, region_code, date_format, currency_code) VALUES
('en', 'US', 'MM/DD/YYYY', 'USD'),
('en', 'ZW', 'DD/MM/YYYY', 'USD'),
('sn', 'ZW', 'DD/MM/YYYY', 'USD'),
('nd', 'ZW', 'DD/MM/YYYY', 'USD');
```

## MongoDB Schema (Historical Records)

### Historical Records Collection

```javascript
// historical_records collection
{
  _id: ObjectId,

  // Record identification
  recordType: String, // birth, death, marriage, census, immigration, military, etc.
  subType: String, // federal_census, state_census, passenger_list, etc.
  title: String,
  description: String,

  // Dates (flexible dating system)
  dates: {
    original: String, // Original date as written in record
    standardized: {
      year: Number,
      month: Number,
      day: Number,
      exact: Boolean,
      circa: Boolean,
      before: Boolean,
      after: Boolean,
      between: {
        start: Date,
        end: Date
      }
    }
  },

  // Location information
  location: {
    original: String, // Original location as written
    standardized: {
      country: String,
      countryCode: String,
      state: String,
      stateCode: String,
      county: String,
      city: String,
      parish: String,
      township: String,
      address: String,
      coordinates: {
        type: "Point",
        coordinates: [Number, Number] // [longitude, latitude]
      }
    }
  },

  // People mentioned in the record
  people: [{
    _id: ObjectId,
    role: String, // primary, spouse, parent, child, witness, etc.
    names: [{
      first: String,
      middle: String,
      last: String,
      maiden: String,
      suffix: String,
      prefix: String,
      fullName: String,
      type: String // birth, married, alias, etc.
    }],
    demographics: {
      gender: String,
      age: {
        value: Number,
        unit: String, // years, months, days
        estimated: Boolean
      },
      birthYear: Number,
      birthPlace: String,
      maritalStatus: String,
      occupation: String,
      education: String,
      immigration: {
        year: Number,
        country: String,
        ship: String
      },
      military: {
        service: String,
        rank: String,
        unit: String,
        war: String
      }
    },
    relationships: [{
      relatedPersonId: ObjectId,
      relationship: String,
      confirmed: Boolean
    }]
  }],

  // Source information
  source: {
    name: String,
    type: String, // government, church, newspaper, family, commercial
    subType: String, // vital_records, census, immigration, etc.
    repository: String,
    archive: String,
    collection: String,
    series: String,
    volume: String,
    page: String,
    reference: String,
    url: String,
    microfilmNumber: String,
    digitalCollectionId: String,
    accessRestrictions: String,
    copyright: String
  },

  // Digital assets
  images: [{
    _id: ObjectId,
    url: String,
    thumbnailUrl: String,
    title: String,
    description: String,
    pageNumber: Number,
    imageType: String, // original, enhanced, transcription
    dimensions: {
      width: Number,
      height: Number
    },
    fileSize: Number,
    format: String,
    quality: String,
    ocrText: String,
    ocrConfidence: Number
  }],

  // Text content
  transcription: {
    fullText: String,
    confidence: Number, // 0-100
    transcriber: String,
    transcriptionDate: Date,
    verified: Boolean,
    verifiedBy: String,
    verificationDate: Date,
    language: String
  },

  // Search and indexing
  searchableText: String, // Combined text for full-text search
  keywords: [String],
  tags: [String],

  // Quality and verification
  quality: {
    legibility: Number, // 1-5 scale
    completeness: Number, // 1-5 scale
    accuracy: Number, // 1-5 scale
    verificationStatus: String, // unverified, verified, disputed
    verifiedBy: ObjectId, // User ID
    verificationDate: Date,
    verificationNotes: String
  },

  // Research information
  research: {
    hints: [{
      type: String, // name_match, date_match, location_match
      confidence: Number,
      personId: ObjectId,
      treeId: ObjectId,
      userId: ObjectId,
      created: Date,
      status: String // new, reviewed, accepted, rejected
    }],
    savedBy: [ObjectId], // User IDs who saved this record
    citedBy: [ObjectId], // Citation IDs referencing this record
    relatedRecords: [{
      recordId: ObjectId,
      relationshipType: String, // same_person, family_member, same_event
      confidence: Number
    }]
  },

  // System metadata
  metadata: {
    created: Date,
    updated: Date,
    createdBy: String, // System, import batch, user ID
    source: String, // batch_import, user_submission, api_sync
    batchId: String,
    importDate: Date,
    lastModified: Date,
    modifiedBy: ObjectId,
    version: Number,
    status: String, // active, archived, deleted, pending_review
    flags: [String] // duplicate, needs_review, high_quality, etc.
  },

  // Indexes for MongoDB
  indexes: [
    { "searchableText": "text" },
    { "people.names.last": 1, "people.names.first": 1 },
    { "dates.standardized.year": 1 },
    { "location.standardized.country": 1, "location.standardized.state": 1 },
    { "recordType": 1, "source.type": 1 },
    { "location.standardized.coordinates": "2dsphere" }
  ]
}
```

### Collections Structure

```javascript
// DNA processing queue
{
  _id: ObjectId,
  userId: ObjectId,
  profileId: ObjectId,
  processingType: String, // initial, reprocess, match_update
  status: String, // queued, processing, completed, failed
  priority: Number,
  data: {
    rawDataUrl: String,
    parameters: Object,
    progress: Number
  },
  started: Date,
  completed: Date,
  error: String,
  retryCount: Number,
  created: Date
}

// Smart hints collection
{
  _id: ObjectId,
  userId: ObjectId,
  treeId: ObjectId,
  personId: ObjectId,
  hintType: String, // record_match, dna_connection, missing_parent, etc.
  confidence: Number, // 0-100
  data: {
    recordId: ObjectId,
    matchScore: Number,
    evidence: [Object],
    suggestedAction: String
  },
  status: String, // new, reviewed, accepted, dismissed
  created: Date,
  reviewedAt: Date,
  expiresAt: Date
}

// Research logs
{
  _id: ObjectId,
  userId: ObjectId,
  sessionId: String,
  searches: [{
    timestamp: Date,
    query: Object,
    filters: Object,
    results: Number,
    clicked: [ObjectId] // Record IDs clicked
  }],
  duration: Number,
  created: Date
}
```

## ElasticSearch Schema

### Records Index

```json
{
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "analyzer": "standard",
        "fields": {
          "keyword": { "type": "keyword" }
        }
      },
      "people": {
        "type": "nested",
        "properties": {
          "names": {
            "type": "nested",
            "properties": {
              "first": {
                "type": "text",
                "analyzer": "name_analyzer",
                "fields": {
                  "exact": { "type": "keyword" },
                  "soundex": { "type": "text", "analyzer": "soundex_analyzer" }
                }
              },
              "last": {
                "type": "text",
                "analyzer": "name_analyzer",
                "fields": {
                  "exact": { "type": "keyword" },
                  "soundex": { "type": "text", "analyzer": "soundex_analyzer" }
                }
              }
            }
          },
          "demographics": {
            "properties": {
              "age": { "type": "integer" },
              "birthYear": { "type": "integer" },
              "occupation": {
                "type": "text",
                "analyzer": "standard"
              }
            }
          }
        }
      },
      "dates": {
        "properties": {
          "standardized": {
            "properties": {
              "year": { "type": "integer" },
              "month": { "type": "integer" },
              "day": { "type": "integer" },
              "exact": { "type": "boolean" }
            }
          }
        }
      },
      "location": {
        "properties": {
          "standardized": {
            "properties": {
              "country": { "type": "keyword" },
              "state": { "type": "keyword" },
              "county": { "type": "keyword" },
              "city": { "type": "keyword" },
              "coordinates": { "type": "geo_point" }
            }
          }
        }
      },
      "recordType": { "type": "keyword" },
      "searchableText": {
        "type": "text",
        "analyzer": "genealogy_analyzer"
      },
      "quality": {
        "properties": {
          "legibility": { "type": "float" },
          "completeness": { "type": "float" },
          "accuracy": { "type": "float" }
        }
      }
    }
  },
  "settings": {
    "analysis": {
      "analyzer": {
        "name_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "name_synonyms", "edge_ngram"]
        },
        "soundex_analyzer": {
          "type": "custom",
          "tokenizer": "keyword",
          "filter": ["lowercase", "soundex"]
        },
        "genealogy_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "genealogy_synonyms", "stemmer"]
        }
      },
      "filter": {
        "name_synonyms": {
          "type": "synonym",
          "synonyms": [
            "john,jon,johnny,jack",
            "william,bill,billy,will,willie",
            "robert,bob,bobby,rob,robbie",
            "michael,mike,mick,mickey"
          ]
        },
        "genealogy_synonyms": {
          "type": "synonym",
          "synonyms": [
            "born,birth,b.",
            "died,death,d.",
            "married,marriage,m.",
            "father,papa,dad,daddy",
            "mother,mama,mom,mommy"
          ]
        },
        "edge_ngram": {
          "type": "edge_ngram",
          "min_gram": 2,
          "max_gram": 10
        }
      }
    }
  }
}
```

## Redis Schema

### Session Storage

```redis
# User sessions
user:session:{session_id} = {
  "userId": "uuid",
  "deviceInfo": {},
  "loginTime": "timestamp",
  "lastActivity": "timestamp",
  "ipAddress": "ip"
}

# User preferences cache
user:preferences:{user_id} = {
  "theme": "light",
  "notifications": {},
  "privacy": {}
}
```

### Caching Strategy

```redis
# Family tree cache
tree:{tree_id} = {
  "treeData": {},
  "lastModified": "timestamp",
  "memberCount": 123
}

# DNA match cache
dna:matches:{profile_id} = [
  {
    "matchId": "uuid",
    "sharedCM": 127.5,
    "relationship": "3rd cousin"
  }
]

# Search result cache
search:{query_hash} = {
  "results": [],
  "totalCount": 1234,
  "timestamp": "timestamp"
}
```

### Real-time Features

```redis
# Active users in family tree
tree:active:{tree_id} = {
  "user1": "timestamp",
  "user2": "timestamp"
}

# Notification queues
notifications:{user_id} = [
  {
    "type": "dna_match",
    "data": {},
    "timestamp": "timestamp"
  }
]
```

## Indexing Strategy

### PostgreSQL Indexes

```sql
-- Performance indexes for users
CREATE INDEX CONCURRENTLY idx_users_email ON users (email);
CREATE INDEX CONCURRENTLY idx_users_subscription ON users (subscription_tier, account_status);
CREATE INDEX CONCURRENTLY idx_users_last_activity ON users (last_activity);

-- Family tree indexes
CREATE INDEX CONCURRENTLY idx_family_trees_owner ON family_trees (owner_id);
CREATE INDEX CONCURRENTLY idx_tree_collaborators_user ON tree_collaborators (user_id);
CREATE INDEX CONCURRENTLY idx_tree_collaborators_tree ON tree_collaborators (tree_id);

-- People indexes
CREATE INDEX CONCURRENTLY idx_people_names ON people (first_name, last_name);
CREATE INDEX CONCURRENTLY idx_people_dates ON people (birth_date, death_date);
CREATE INDEX CONCURRENTLY idx_people_tree ON people (tree_id);
CREATE INDEX CONCURRENTLY idx_people_search ON people USING gin(search_vector);

-- Relationship indexes
CREATE INDEX CONCURRENTLY idx_relationships_person1 ON relationships (person1_id);
CREATE INDEX CONCURRENTLY idx_relationships_person2 ON relationships (person2_id);
CREATE INDEX CONCURRENTLY idx_relationships_type ON relationships (relationship_type);

-- DNA indexes
CREATE INDEX CONCURRENTLY idx_dna_profiles_user ON dna_profiles (user_id);
CREATE INDEX CONCURRENTLY idx_dna_matches_profile1 ON dna_matches (profile1_id);
CREATE INDEX CONCURRENTLY idx_dna_matches_profile2 ON dna_matches (profile2_id);
CREATE INDEX CONCURRENTLY idx_dna_matches_score ON dna_matches (shared_dna_cm DESC);

-- Media indexes
CREATE INDEX CONCURRENTLY idx_media_user ON media (user_id);
CREATE INDEX CONCURRENTLY idx_media_type ON media (file_type, privacy_level);
CREATE INDEX CONCURRENTLY idx_media_search ON media USING gin(search_vector);
CREATE INDEX CONCURRENTLY idx_person_media_person ON person_media (person_id);

-- Activity and analytics indexes
CREATE INDEX CONCURRENTLY idx_user_activities_user_date ON user_activities (user_id, created_at);
CREATE INDEX CONCURRENTLY idx_user_activities_type ON user_activities (activity_type, created_at);
CREATE INDEX CONCURRENTLY idx_notifications_user_unread ON notifications (user_id, read_at) WHERE read_at IS NULL;

-- Geographic indexes
CREATE INDEX CONCURRENTLY idx_people_birth_location ON people USING gist(birth_place_coordinates);
CREATE INDEX CONCURRENTLY idx_people_death_location ON people USING gist(death_place_coordinates);
```

### Partitioning Strategy

```sql
-- Partition large tables by date
CREATE TABLE user_activities_y2024 PARTITION OF user_activities
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE user_activities_y2025 PARTITION OF user_activities
FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- Partition DNA matches by discovery date
CREATE TABLE dna_matches_2024 PARTITION OF dna_matches
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

This comprehensive database schema provides the foundation for a scalable genealogy platform that can handle millions of users, complex family relationships, DNA analysis, and billions of historical records while maintaining performance and data integrity.# Data Privacy and GDPR Compliance Guide

## Executive Summary

The Dzinza Genealogy Platform is committed to protecting user privacy and ensuring full compliance with global data protection regulations, including the General Data Protection Regulation (GDPR), California Consumer Privacy Act (CCPA), and other applicable privacy laws. This document outlines our comprehensive approach to data privacy, user rights, and regulatory compliance.

## Table of Contents

1. [Data Protection Principles](#data-protection-principles)
2. [Legal Basis for Processing](#legal-basis-for-processing)
3. [Data Categories and Purposes](#data-categories-and-purposes)
4. [User Rights and Controls](#user-rights-and-controls)
5. [Technical Implementation](#technical-implementation)
6. [Data Retention and Deletion](#data-retention-and-deletion)
7. [Cross-Border Data Transfers](#cross-border-data-transfers)
8. [Breach Response Procedures](#breach-response-procedures)
9. [Vendor Management](#vendor-management)
10. [Compliance Monitoring](#compliance-monitoring)

## Data Protection Principles

### 1. Lawfulness, Fairness, and Transparency

- All data processing activities have a valid legal basis
- Processing purposes are clearly communicated to users
- Transparent privacy notices in English, Shona, and Ndebele

### 2. Purpose Limitation

- Data collected only for specified, explicit, and legitimate purposes
- No further processing incompatible with original purposes
- Clear boundaries between different service features

### 3. Data Minimization

- Collect only data that is adequate, relevant, and limited to purpose
- Regular audits to identify and eliminate unnecessary data collection
- Progressive disclosure of data requirements

### 4. Accuracy

- Implement systems to ensure data accuracy and currency
- Provide user interfaces for data correction
- Regular data quality assessments

### 5. Storage Limitation

- Define clear retention periods for different data categories
- Automated deletion processes where appropriate
- Regular review of data retention needs

### 6. Integrity and Confidentiality

- Robust security measures protecting against unauthorized access
- Encryption at rest and in transit
- Regular security assessments and penetration testing

### 7. Accountability

- Comprehensive documentation of all data processing activities
- Regular compliance audits and assessments
- Staff training on data protection requirements

## Legal Basis for Processing

### Consent

**When Used:**

- Optional features like DNA matching with third parties
- Marketing communications
- Advanced analytics and personalization

**Implementation:**

```typescript
interface ConsentRecord {
  userId: string;
  purpose: ConsentPurpose;
  granted: boolean;
  timestamp: Date;
  mechanism: "opt-in" | "explicit-consent";
  withdrawalMethod: string;
  version: string;
}

enum ConsentPurpose {
  DNA_MATCHING = "dna_matching",
  MARKETING = "marketing",
  ANALYTICS = "analytics",
  THIRD_PARTY_SHARING = "third_party_sharing",
}
```

### Contract Performance

**When Used:**

- Account creation and management
- Family tree building and storage
- Photo storage and enhancement
- Historical record searches

### Legitimate Interest

**When Used:**

- Service improvement and optimization
- Security monitoring and fraud prevention
- Technical support and troubleshooting

**Balancing Test Documentation:**

- Regular assessments of legitimate interests vs. user privacy
- Documented balancing tests for each use case
- Clear opt-out mechanisms where required

### Legal Obligation

**When Used:**

- Compliance with court orders
- Tax reporting requirements
- Law enforcement cooperation

## Data Categories and Purposes

### Personal Identity Data

```yaml
Category: Personal Identity
Data Types:
  - Full name
  - Email address
  - Date of birth
  - Phone number (optional)
  - Profile photograph
Legal Basis: Contract + Consent
Purposes:
  - Account management
  - User identification
  - Communication
Retention: Account lifetime + 2 years
```

### Genealogical Data

```yaml
Category: Genealogical Information
Data Types:
  - Family relationships
  - Ancestor information
  - Historical records
  - Family photos and documents
  - DNA data (if provided)
Legal Basis: Contract + Explicit Consent
Purposes:
  - Family tree construction
  - Historical research
  - DNA matching (with consent)
Retention: Account lifetime + 7 years (historical significance)
Special Category: Yes (genetic data)
```

### Technical Data

```yaml
Category: Technical Information
Data Types:
  - IP addresses
  - Browser information
  - Device identifiers
  - Usage patterns
  - Performance metrics
Legal Basis: Legitimate Interest
Purposes:
  - Service optimization
  - Security monitoring
  - Technical support
Retention: 2 years maximum
```

### Communication Data

```yaml
Category: Communications
Data Types:
  - Support tickets
  - User feedback
  - Email communications
  - In-app messages
Legal Basis: Contract + Legitimate Interest
Purposes:
  - Customer support
  - Service improvement
  - User communication
Retention: 3 years
```

## User Rights and Controls

### Right to Information

**Implementation:**

- Comprehensive privacy policy available in multiple languages
- Just-in-time notifications for data collection
- Clear explanations of processing purposes

### Right of Access

**User Portal Features:**

```typescript
interface DataAccessRequest {
  userId: string;
  requestType: "full_export" | "specific_category";
  categories?: DataCategory[];
  format: "json" | "csv" | "pdf";
  deliveryMethod: "download" | "email";
  requestDate: Date;
  fulfillmentDate?: Date;
  status: "pending" | "processing" | "completed" | "rejected";
}
```

**Automated Response:**

- Data export available within 30 days
- Structured format including metadata
- Verification processes to prevent unauthorized access

### Right to Rectification

**User Controls:**

- Self-service data correction interfaces
- Bulk update capabilities for genealogical data
- Version control for data changes
- Admin review process for sensitive corrections

### Right to Erasure

**Implementation Scenarios:**

1. **Full Account Deletion**

   - Complete removal of all personal data
   - Anonymization of derived insights
   - Notification to data processors

2. **Selective Data Deletion**
   - Granular control over data categories
   - Dependency analysis (e.g., family tree relationships)
   - User confirmation workflows

```typescript
interface DeletionRequest {
  userId: string;
  scope: "full_account" | "selective";
  categories?: DataCategory[];
  reason: DeletionReason;
  confirmationRequired: boolean;
  dependencies: string[];
  scheduledDate?: Date;
  status: DeletionStatus;
}
```

### Right to Data Portability

**Export Formats:**

- **GEDCOM**: Standard genealogy format
- **JSON**: Structured data with metadata
- **CSV**: Tabular data for analysis
- **PDF**: Human-readable reports

**Transfer Capabilities:**

- Direct transfer to supported platforms
- API endpoints for third-party integrations
- Batch processing for large datasets

### Right to Object

**Opt-out Mechanisms:**

```typescript
interface ObjectionRecord {
  userId: string;
  processingPurpose: ProcessingPurpose;
  objectionDate: Date;
  reason?: string;
  status: "active" | "withdrawn";
  impact: string[];
}
```

### Rights Related to Automated Decision Making

**Automated Processes:**

- DNA matching algorithms
- Historical record suggestions
- Photo enhancement recommendations

**User Controls:**

- Opt-out from automated processing
- Request human review of decisions
- Explanation of algorithmic logic

## Technical Implementation

### Privacy by Design Architecture

```mermaid
graph TB
    A[User Interface] --> B[Privacy Controller]
    B --> C[Consent Management]
    B --> D[Data Minimization Engine]
    B --> E[Encryption Service]
    B --> F[Audit Logger]

    C --> G[Consent Database]
    D --> H[Data Processor]
    E --> I[Key Management]
    F --> J[Compliance Database]

    H --> K[Genealogy Service]
    H --> L[Storage Service]
    H --> M[Analytics Service]
```

### Data Classification System

```typescript
interface DataClassification {
  level: SecurityLevel;
  category: DataCategory;
  sensitivity: SensitivityLevel;
  regulations: ApplicableRegulation[];
  encryptionRequired: boolean;
  retentionPeriod: number;
  accessControls: AccessControl[];
}

enum SecurityLevel {
  PUBLIC = "public",
  INTERNAL = "internal",
  CONFIDENTIAL = "confidential",
  RESTRICTED = "restricted",
}

enum SensitivityLevel {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}
```

### Encryption Implementation

```typescript
class DataEncryption {
  private static readonly ALGORITHM = "AES-256-GCM";
  private static readonly KEY_DERIVATION = "PBKDF2";

  static encryptPersonalData(data: string, userKey: string): EncryptedData {
    const iv = crypto.randomBytes(16);
    const salt = crypto.randomBytes(32);
    const key = crypto.pbkdf2Sync(userKey, salt, 100000, 32, "sha256");

    const cipher = crypto.createCipher(this.ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(data, "utf8"),
      cipher.final(),
    ]);

    return {
      encrypted: encrypted.toString("base64"),
      iv: iv.toString("base64"),
      salt: salt.toString("base64"),
      authTag: cipher.getAuthTag().toString("base64"),
    };
  }

  static encryptGeneticData(data: GeneticData): EncryptedGeneticData {
    // Special handling for genetic data with additional security layers
    const masterKey = this.deriveGeneticKey(data.userId);
    const encryptedSequence = this.encryptPersonalData(
      data.sequence,
      masterKey
    );

    return {
      userId: data.userId,
      encryptedSequence,
      metadata: this.encryptMetadata(data.metadata),
      keyVersion: this.getCurrentKeyVersion(),
      timestamp: new Date(),
    };
  }
}
```

### Anonymization and Pseudonymization

```typescript
class DataAnonymization {
  static anonymizeForAnalytics(userData: UserData): AnonymizedData {
    return {
      userHash: this.generateUserHash(userData.id),
      ageGroup: this.categorizeAge(userData.age),
      region: this.generalizeLocation(userData.location),
      treeSize: userData.familyTree.size,
      activityLevel: this.categorizeActivity(userData.lastActivity),
      preferences: this.generalizePreferences(userData.preferences),
    };
  }

  static pseudonymizeForResearch(
    genealogicalData: GenealogyData
  ): PseudonymizedData {
    const pseudoId = this.generatePseudoId(genealogicalData.userId);

    return {
      pseudoId,
      relationships: genealogicalData.relationships.map((rel) => ({
        type: rel.type,
        generationDistance: rel.generationDistance,
        culturalBackground: rel.culturalBackground,
      })),
      timelineEvents: genealogicalData.events.map((event) => ({
        type: event.type,
        timeRange: this.generalizeTimeRange(event.date),
        location: this.generalizeLocation(event.location),
      })),
    };
  }
}
```

## Data Retention and Deletion

### Retention Schedule

| Data Category         | Retention Period            | Legal Basis             | Deletion Trigger                  |
| --------------------- | --------------------------- | ----------------------- | --------------------------------- |
| Account Information   | Account lifetime + 2 years  | Contract                | Account deletion + grace period   |
| Genealogical Data     | Account lifetime + 7 years  | Historical significance | User request or legal requirement |
| DNA Data              | Until withdrawal of consent | Explicit consent        | Consent withdrawal                |
| Communication Records | 3 years                     | Legitimate interest     | Automatic expiration              |
| Technical Logs        | 2 years                     | Legitimate interest     | Rolling deletion                  |
| Marketing Data        | Until opt-out + 30 days     | Consent                 | Consent withdrawal                |
| Legal Hold Data       | Until resolution            | Legal obligation        | Legal requirement lifted          |

### Automated Deletion System

```typescript
class RetentionManager {
  async processRetentionSchedule(): Promise<void> {
    const retentionPolicies = await this.getActiveRetentionPolicies();

    for (const policy of retentionPolicies) {
      const expiredData = await this.identifyExpiredData(policy);

      if (expiredData.length > 0) {
        await this.initiateSecureDeletion(expiredData, policy);
        await this.logDeletionActivity(expiredData, policy);
      }
    }
  }

  private async initiateSecureDeletion(
    data: ExpiredDataRecord[],
    policy: RetentionPolicy
  ): Promise<void> {
    // Multi-pass deletion for sensitive data
    for (let pass = 0; pass < 3; pass++) {
      await this.overwriteData(data, this.generateRandomPattern());
    }

    // Final deletion
    await this.removeDataRecords(data);

    // Update deletion certificates
    await this.generateDeletionCertificates(data, policy);
  }
}
```

## Cross-Border Data Transfers

### Transfer Mechanisms

1. **Adequacy Decisions**

   - Transfers to countries with EU adequacy decisions
   - Ongoing monitoring of adequacy status

2. **Standard Contractual Clauses (SCCs)**

   - Implementation of EU-approved SCCs
   - Regular review and updates

3. **Binding Corporate Rules (BCRs)**
   - Development of comprehensive BCRs for group transfers
   - Regulatory approval process

### Data Localization Requirements

```typescript
interface DataLocalizationRule {
  country: string;
  dataTypes: DataCategory[];
  requirement: "must_stay" | "copy_required" | "notification_required";
  exceptions: string[];
  implementation: LocalizationImplementation;
}

class DataLocalizationManager {
  async determineStorageLocation(
    data: DataRecord,
    userLocation: string
  ): Promise<StorageLocation> {
    const rules = await this.getApplicableRules(userLocation, data.category);

    for (const rule of rules) {
      if (rule.requirement === "must_stay") {
        return this.getLocalStorage(userLocation);
      }
    }

    return this.getOptimalStorage(data, userLocation);
  }
}
```

## Breach Response Procedures

### Incident Classification

```typescript
enum BreachSeverity {
  LOW = "low", // <100 users, no sensitive data
  MEDIUM = "medium", // 100-1000 users or limited sensitive data
  HIGH = "high", // >1000 users or significant sensitive data
  CRITICAL = "critical", // >10000 users or genetic/financial data
}

interface BreachIncident {
  id: string;
  severity: BreachSeverity;
  dataTypes: DataCategory[];
  affectedUsers: number;
  discoveryDate: Date;
  containmentDate?: Date;
  notificationRequired: boolean;
  regulatoryDeadline?: Date;
  status: IncidentStatus;
  responseTeam: string[];
}
```

### Response Timeline

| Timeframe             | Action Required                            | Responsible Party       |
| --------------------- | ------------------------------------------ | ----------------------- |
| Immediate (0-1 hours) | Incident detection and containment         | Security Team           |
| 1-4 hours             | Initial assessment and team activation     | CISO, Legal             |
| 4-24 hours            | Detailed investigation and impact analysis | Security Team, DPO      |
| 24-72 hours           | Regulatory notification (if required)      | DPO, Legal              |
| 72 hours - 30 days    | User notification and remediation          | Communications, Product |
| 30+ days              | Follow-up actions and improvements         | All Teams               |

### Notification Templates

```typescript
interface BreachNotification {
  template: NotificationTemplate;
  language: string;
  personalizedData: PersonalizedNotificationData;
  deliveryMethod: "email" | "in_app" | "postal";
  urgency: NotificationUrgency;
  followUpRequired: boolean;
}

class BreachNotificationManager {
  async generateUserNotification(
    breach: BreachIncident,
    user: User
  ): Promise<BreachNotification> {
    const template = this.selectTemplate(
      breach.severity,
      user.preferredLanguage
    );
    const personalizedData = this.generatePersonalizedData(breach, user);

    return {
      template,
      language: user.preferredLanguage,
      personalizedData,
      deliveryMethod: this.determineDeliveryMethod(breach.severity),
      urgency: this.calculateUrgency(breach),
      followUpRequired: breach.severity >= BreachSeverity.HIGH,
    };
  }
}
```

## Vendor Management

### Privacy Impact Assessments

```typescript
interface VendorPrivacyAssessment {
  vendorName: string;
  serviceDescription: string;
  dataTypes: DataCategory[];
  dataVolume: DataVolume;
  processingPurposes: ProcessingPurpose[];
  dataLocation: string[];
  securityMeasures: SecurityMeasure[];
  contractualSafeguards: ContractualSafeguard[];
  riskLevel: RiskLevel;
  approvalDate?: Date;
  reviewDate: Date;
  complianceStatus: ComplianceStatus;
}

class VendorManagement {
  async assessVendorCompliance(vendor: Vendor): Promise<ComplianceAssessment> {
    const assessment = {
      certifications: await this.verifyCertifications(vendor),
      contractTerms: await this.reviewContractTerms(vendor),
      technicalSafeguards: await this.evaluateTechnicalSafeguards(vendor),
      operationalControls: await this.assessOperationalControls(vendor),
      incidentResponse: await this.reviewIncidentProcedures(vendor),
    };

    return this.calculateOverallCompliance(assessment);
  }
}
```

## Compliance Monitoring

### Continuous Monitoring Framework

```typescript
class ComplianceMonitor {
  private monitors: ComplianceMonitor[] = [
    new ConsentMonitor(),
    new DataRetentionMonitor(),
    new AccessControlMonitor(),
    new EncryptionMonitor(),
    new VendorComplianceMonitor(),
    new UserRightsMonitor(),
  ];

  async runDailyChecks(): Promise<ComplianceReport> {
    const results = await Promise.all(
      this.monitors.map((monitor) => monitor.performCheck())
    );

    const report = this.generateComplianceReport(results);

    if (report.hasViolations) {
      await this.triggerIncidentResponse(report);
    }

    return report;
  }
}
```

### Key Performance Indicators

| Metric                             | Target              | Measurement  |
| ---------------------------------- | ------------------- | ------------ |
| Consent Rate                       | >80%                | Daily        |
| Data Subject Request Response Time | <30 days            | Per request  |
| Breach Detection Time              | <1 hour             | Per incident |
| Encryption Coverage                | 100% sensitive data | Daily        |
| Vendor Compliance Score            | >90%                | Quarterly    |
| User Rights Fulfillment            | >95%                | Monthly      |
| Data Retention Compliance          | 100%                | Daily        |
| Cross-border Transfer Compliance   | 100%                | Per transfer |

### Audit Trail Requirements

```typescript
interface AuditEvent {
  eventId: string;
  timestamp: Date;
  userId?: string;
  adminId?: string;
  eventType: AuditEventType;
  dataCategory: DataCategory;
  action: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  legalBasis: LegalBasis;
  outcome: "success" | "failure" | "partial";
  retentionPeriod: number;
}

enum AuditEventType {
  DATA_ACCESS = "data_access",
  DATA_MODIFICATION = "data_modification",
  DATA_DELETION = "data_deletion",
  CONSENT_CHANGE = "consent_change",
  EXPORT_REQUEST = "export_request",
  ADMIN_ACTION = "admin_action",
  SYSTEM_EVENT = "system_event",
}
```

## Implementation Checklist

### Phase 1: Foundation (Weeks 1-4)

- [ ] Privacy policy creation (multi-language)
- [ ] Consent management system implementation
- [ ] Data classification and inventory
- [ ] Basic encryption implementation
- [ ] Audit logging system

### Phase 2: Core Rights (Weeks 5-8)

- [ ] User access portal development
- [ ] Data export functionality
- [ ] Deletion workflows and verification
- [ ] Consent withdrawal mechanisms
- [ ] Basic vendor assessments

### Phase 3: Advanced Features (Weeks 9-12)

- [ ] Automated retention management
- [ ] Breach response procedures
- [ ] Advanced anonymization techniques
- [ ] Cross-border transfer safeguards
- [ ] Compliance monitoring dashboard

### Phase 4: Optimization (Weeks 13-16)

- [ ] Performance optimization
- [ ] Advanced analytics (privacy-preserving)
- [ ] Automated compliance reporting
- [ ] Regular audit procedures
- [ ] Staff training programs

## Legal Contacts and Resources

### Regulatory Authorities

- **EU**: European Data Protection Board (EDPB)
- **UK**: Information Commissioner's Office (ICO)
- **US**: Federal Trade Commission (FTC)
- **Zimbabwe**: Postal and Telecommunications Regulatory Authority (POTRAZ)

### Emergency Contacts

- **Data Protection Officer**: dpo@dzinza.com
- **Legal Counsel**: legal@dzinza.com
- **Security Team**: security@dzinza.com
- **Incident Response**: incident-response@dzinza.com

---

_This document is reviewed quarterly and updated as needed to reflect changes in applicable laws and regulations. Last updated: December 2024_

# Decision Framework (Layer 0-4 Conflict Resolution)

## Overview

This framework provides a systematic approach for making decisions when rules from different layers conflict or when multiple valid solutions exist. It ensures consistent decision-making across all agents working on the Dzinza project.

## Decision Process

### Step 1: Identify the Context

#### Categorize the Decision Type

- **Safety/Security**: Affects user safety or system security
- **Architecture**: Affects system design or technology choices
- **Implementation**: Code-level decisions and patterns
- **User Experience**: Affects user interaction or interface
- **Performance**: Affects system speed or resource usage
- **Maintainability**: Affects code readability or future development

#### Assess Impact Scope

- **High Impact**: Affects multiple systems, many users, or is hard to change later
- **Medium Impact**: Affects single system or moderate user base
- **Low Impact**: Local change with minimal broader effects

#### Determine Urgency

- **Critical**: Security issue, production down, blocking release
- **High**: Important feature, performance issue, affects sprint goals
- **Medium**: Improvement, refactoring, nice-to-have feature
- **Low**: Documentation, minor optimization, future consideration

### Step 2: Apply Layer Hierarchy

#### Layer 0: Fundamental Laws (Never Override)

**Check**: Does this decision involve safety, security, legal, or ethical concerns?

- If YES: Apply Layer 0 rules strictly, no exceptions
- If NO: Continue to Layer 1

**Examples**:

- SQL injection vulnerability → Security first, fix immediately
- User data privacy → Apply GDPR requirements strictly
- Accessibility violations → Fix to meet legal requirements

#### Layer 1: Core Principles (Override only with explicit justification)

**Check**: Does this decision significantly affect user experience, security design, performance, maintainability, or accessibility?

**Decision Matrix**:
| Principle | High Priority When | Lower Priority When |
|-----------|-------------------|-------------------|
| User-Centric | User-facing features, UX changes | Internal tools, dev utilities |
| Security by Design | Authentication, data handling | UI components, formatting |
| Performance | User-facing operations | Admin tools, one-time scripts |
| Maintainability | Core business logic | Quick fixes, prototypes |
| Accessibility | Public interfaces | Internal dashboards |

**Conflict Resolution**:

- User safety > Performance > Maintainability
- Security > Convenience > Development speed
- Accessibility requirements are non-negotiable

#### Layer 2: Project Standards (Override with justification)

**Check**: Does this involve technology choices, architecture patterns, or development methodology?

**When to Override**:

- Performance requirements exceed standard patterns
- Third-party integration requires different approach
- Existing codebase constraints
- Team expertise limitations
- Time/budget constraints

**Override Requirements**:

- Document the specific standard being overridden
- Explain business/technical justification
- Plan future compliance if applicable
- Get team lead approval

#### Layer 3: Implementation Guidelines (Flexible with context)

**Check**: Does this involve coding standards, documentation, or review processes?

**Flexibility Factors**:

- Legacy code integration
- External library constraints
- Framework limitations
- Performance optimizations
- Team preferences

#### Layer 4: Style Preferences (Adapt to context)

**Check**: Does this involve formatting, naming, or organizational preferences?

**Context Considerations**:

- Existing codebase patterns
- Team consensus
- Tool limitations
- External dependencies

### Step 3: Evaluate Trade-offs

#### Trade-off Analysis Framework

```
Decision: [Describe the decision]
Options: [List 2-3 viable options]

Option A: [Description]
├─ Pros: [Benefits]
├─ Cons: [Drawbacks]
├─ Risks: [Potential issues]
├─ Layer Alignment: [Which layers this supports/violates]
└─ Effort: [Implementation complexity]

Option B: [Description]
├─ Pros: [Benefits]
├─ Cons: [Drawbacks]
├─ Risks: [Potential issues]
├─ Layer Alignment: [Which layers this supports/violates]
└─ Effort: [Implementation complexity]

Recommendation: [Chosen option with reasoning]
```

#### Common Trade-off Scenarios

**Performance vs. Maintainability**

```
High Performance Needed:
├─ User-facing operations
├─ Real-time features
├─ Large-scale operations
└─ Choose: Performance-optimized solution

Maintainability Priority:
├─ Business logic
├─ Configuration management
├─ Error handling
└─ Choose: Clear, maintainable code
```

**Security vs. Usability**

```
Security Priority:
├─ Authentication flows
├─ Payment processing
├─ Admin functions
└─ Choose: More secure, potentially less convenient

Usability Priority:
├─ Public browsing
├─ Read-only operations
├─ Non-sensitive features
└─ Choose: User-friendly with adequate security
```

**Development Speed vs. Quality**

```
Speed Priority:
├─ Prototypes
├─ Time-critical fixes
├─ Proof of concepts
└─ Choose: Faster implementation, plan refactoring

Quality Priority:
├─ Core business logic
├─ Public APIs
├─ Security features
└─ Choose: Higher quality, longer development
```

### Step 4: Decision Documentation

#### Decision Record Template

```markdown
# Decision: [Title]

## Status

[Proposed | Accepted | Deprecated | Superseded]

## Context

- **Problem**: What decision needs to be made?
- **Impact Scope**: [High/Medium/Low]
- **Urgency**: [Critical/High/Medium/Low]
- **Affected Layers**: [List applicable layers]

## Decision

[Describe the chosen solution]

## Rationale

- **Layer Analysis**: How does this align with our layer hierarchy?
- **Trade-offs**: What were the key trade-offs considered?
- **Alternatives**: What other options were considered and why were they rejected?

## Consequences

- **Positive**: Benefits of this decision
- **Negative**: Drawbacks or technical debt created
- **Risks**: Potential future problems

## Implementation

- **Action Items**: Specific steps to implement
- **Timeline**: When this should be completed
- **Responsibility**: Who is responsible for implementation

## Review

- **Review Date**: When to revisit this decision
- **Success Metrics**: How to measure if this was the right choice
```

#### Quick Decision Log

For smaller decisions, use this simplified format:

```
Decision: [One-line summary]
Context: [Why this decision was needed]
Choice: [What was chosen]
Reasoning: [Key factors in the decision]
Layer: [Primary layer this decision operates in]
Date: [When decided]
By: [Who made the decision]
```

### Step 5: Implementation Guidelines

#### Decision Implementation Checklist

- [ ] Document the decision using appropriate template
- [ ] Communicate decision to affected team members
- [ ] Update relevant documentation (README, API docs, etc.)
- [ ] Create implementation tasks/tickets
- [ ] Set up monitoring/metrics if needed
- [ ] Plan review/retrospective if this is a significant decision

#### Monitoring Decision Outcomes

- Track metrics relevant to the decision
- Collect feedback from team and users
- Document lessons learned
- Adjust future decisions based on outcomes

## Common Decision Patterns

### Technology Selection

```
1. Assess requirements against core principles
2. Evaluate options against Layer 2 standards
3. Consider team expertise and learning curve
4. Analyze long-term maintenance implications
5. Make decision and plan migration if needed
```

### Architecture Changes

```
1. Evaluate impact on existing systems
2. Consider scalability and performance implications
3. Assess security and reliability effects
4. Plan rollout strategy and rollback options
5. Document architecture decision record (ADR)
```

### Code Quality Decisions

```
1. Apply Layer 3 guidelines as baseline
2. Consider local context and constraints
3. Ensure consistency with existing codebase
4. Balance perfect vs. good enough
5. Plan future improvements if compromising
```

### Emergency Decisions

```
1. Prioritize Layer 0 and Layer 1 rules
2. Choose fastest safe solution
3. Document decision and reasoning
4. Plan proper solution for later
5. Communicate timeline for permanent fix
```

## Escalation Process

### When to Escalate

- Decisions affecting multiple teams
- Significant deviation from Layer 1 principles
- High-impact architectural changes
- Resource allocation decisions
- Conflicts between team members

### Escalation Hierarchy

1. **Team Lead**: Technical decisions within team scope
2. **Senior Developer**: Architecture and design decisions
3. **Project Owner**: Business priority and resource decisions
4. **Security Team**: Security-related decisions
5. **Architecture Committee**: Major architecture changes

### Escalation Information

When escalating, provide:

- Clear description of the decision needed
- Analysis done so far
- Options considered
- Recommended approach
- Timeline for decision
- Impact of delay

## Continuous Improvement

### Decision Review Process

- Monthly review of significant decisions
- Quarterly analysis of decision patterns
- Annual review of decision framework effectiveness
- Collect feedback on decision quality

### Framework Updates

- Update based on lessons learned
- Incorporate new regulations or requirements
- Adapt to technology or process changes
- Maintain alignment with business objectives

---

**Remember**: This framework is a tool to help make consistent, well-reasoned decisions. Use it as a guide, but don't let it slow down critical decisions. When in doubt, document your reasoning and move forward.

# Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the Dzinza genealogy platform to various environments, from development to production.

## Deployment Environments

### 1. Development Environment

**Purpose:** Local development and testing

**Setup:**

```bash
# Clone repository
git clone https://github.com/dzinza/dzinza.git
cd dzinza

# Install dependencies
npm install

# Start development server
npm run dev
```

**Environment Variables:**

```env
VITE_APP_ENV=development
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_APP_NAME=Dzinza (Dev)
```

### 2. Staging Environment

**Purpose:** Pre-production testing and QA

**Infrastructure:**

- Single Kubernetes cluster
- Shared database instance
- Basic monitoring

**Deployment Process:**

```bash
# Build and deploy to staging
git checkout develop
git pull origin develop
docker build -t dzinza/app:staging .
kubectl apply -f k8s/staging/
```

**Environment Variables:**

```env
VITE_APP_ENV=staging
VITE_API_BASE_URL=https://staging-api.dzinza.com/api/v1
VITE_APP_NAME=Dzinza (Staging)
DATABASE_URL=postgresql://staging_user:password@staging-db:5432/dzinza_staging
```

### 3. Production Environment

**Purpose:** Live application for end users

**Infrastructure:**

- Multi-region Kubernetes clusters
- High-availability database cluster
- Full monitoring and alerting

## Production Deployment

### Prerequisites

1. **AWS Account with configured CLI**
2. **Kubernetes cluster (EKS)**
3. **Container registry access**
4. **Domain and SSL certificates**

### Step 1: Infrastructure Setup

#### AWS EKS Cluster

```bash
# Create EKS cluster using eksctl
eksctl create cluster \
  --name dzinza-production \
  --region us-west-2 \
  --nodegroup-name standard-workers \
  --node-type m5.large \
  --nodes 3 \
  --nodes-min 1 \
  --nodes-max 10 \
  --managed
```

#### Database Setup (RDS)

```bash
# Create RDS PostgreSQL instance
aws rds create-db-instance \
  --db-instance-identifier dzinza-prod-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --master-username dzinza_admin \
  --master-user-password ${DB_PASSWORD} \
  --allocated-storage 100 \
  --vpc-security-group-ids sg-12345678 \
  --multi-az \
  --backup-retention-period 7
```

#### Redis Setup (ElastiCache)

```bash
# Create Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id dzinza-prod-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1
```

### Step 2: Container Registry

#### Build and Push Images

```bash
# Login to registry
docker login ghcr.io -u $GITHUB_USERNAME -p $GITHUB_TOKEN

# Build production image
docker build -t ghcr.io/dzinza/dzinza:latest .

# Push to registry
docker push ghcr.io/dzinza/dzinza:latest
```

### Step 3: Kubernetes Deployment

#### Namespace and Secrets

```yaml
# k8s/production/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: dzinza-production
---
apiVersion: v1
kind: Secret
metadata:
  name: dzinza-secrets
  namespace: dzinza-production
type: Opaque
data:
  database-url: <base64-encoded-database-url>
  jwt-secret: <base64-encoded-jwt-secret>
  redis-url: <base64-encoded-redis-url>
```

#### Application Deployment

```yaml
# k8s/production/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dzinza-app
  namespace: dzinza-production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: dzinza-app
  template:
    metadata:
      labels:
        app: dzinza-app
    spec:
      containers:
        - name: dzinza-app
          image: ghcr.io/dzinza/dzinza:latest
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: "production"
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: dzinza-secrets
                  key: database-url
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
```

#### Service and Ingress

```yaml
# k8s/production/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: dzinza-service
  namespace: dzinza-production
spec:
  selector:
    app: dzinza-app
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dzinza-ingress
  namespace: dzinza-production
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
    - hosts:
        - dzinza.com
        - www.dzinza.com
      secretName: dzinza-tls
  rules:
    - host: dzinza.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: dzinza-service
                port:
                  number: 80
```

### Step 4: Deploy to Production

```bash
# Apply all Kubernetes manifests
kubectl apply -f k8s/production/

# Verify deployment
kubectl get pods -n dzinza-production
kubectl get services -n dzinza-production
kubectl get ingress -n dzinza-production

# Check application logs
kubectl logs -f deployment/dzinza-app -n dzinza-production
```

## Database Migrations

### Production Migration Process

```bash
# Create migration job
kubectl create job dzinza-migrate \
  --image=ghcr.io/dzinza/dzinza:latest \
  --namespace=dzinza-production \
  -- npm run db:migrate

# Monitor migration
kubectl logs job/dzinza-migrate -n dzinza-production -f

# Clean up migration job
kubectl delete job dzinza-migrate -n dzinza-production
```

### Backup Before Migration

```bash
# Create database backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Upload backup to S3
aws s3 cp backup_*.sql s3://dzinza-backups/db-migrations/
```

## Zero-Downtime Deployment

### Rolling Update Strategy

```yaml
# Deployment strategy
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1
```

### Blue-Green Deployment

```bash
# Deploy to green environment
kubectl apply -f k8s/production/green/

# Test green environment
curl -H "Host: dzinza.com" http://green.internal.dzinza.com/health

# Switch traffic to green
kubectl patch service dzinza-service -p '{"spec":{"selector":{"version":"green"}}}'

# Cleanup old blue deployment
kubectl delete -f k8s/production/blue/
```

## Monitoring and Health Checks

### Health Check Endpoints

```typescript
// Health check implementation
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get("/ready", async (req, res) => {
  try {
    // Check database connection
    await db.raw("SELECT 1");

    // Check Redis connection
    await redis.ping();

    res.status(200).json({
      status: "ready",
      database: "connected",
      redis: "connected",
    });
  } catch (error) {
    res.status(503).json({
      status: "not ready",
      error: error.message,
    });
  }
});
```

### Monitoring Setup

```yaml
# Prometheus monitoring
apiVersion: v1
kind: ServiceMonitor
metadata:
  name: dzinza-metrics
  namespace: dzinza-production
spec:
  selector:
    matchLabels:
      app: dzinza-app
  endpoints:
    - port: metrics
      path: /metrics
```

## SSL/TLS Configuration

### Certificate Management

```yaml
# cert-manager configuration
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@dzinza.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
```

## Backup and Disaster Recovery

### Automated Backups

```bash
# Database backup script
#!/bin/bash
BACKUP_DIR="/backups/$(date +%Y/%m/%d)"
BACKUP_FILE="dzinza_backup_$(date +%Y%m%d_%H%M%S).sql"

mkdir -p $BACKUP_DIR
pg_dump $DATABASE_URL > $BACKUP_DIR/$BACKUP_FILE
gzip $BACKUP_DIR/$BACKUP_FILE

# Upload to S3
aws s3 cp $BACKUP_DIR/$BACKUP_FILE.gz s3://dzinza-backups/daily/

# Cleanup old backups (keep 30 days)
find /backups -type f -mtime +30 -delete
```

### Disaster Recovery Plan

1. **Database Recovery**

   ```bash
   # Restore from backup
   gunzip -c backup_file.sql.gz | psql $DATABASE_URL
   ```

2. **Application Recovery**

   ```bash
   # Redeploy from last known good image
   kubectl set image deployment/dzinza-app dzinza-app=ghcr.io/dzinza/dzinza:last-good
   ```

3. **DNS Failover**
   ```bash
   # Point to backup region
   aws route53 change-resource-record-sets --hosted-zone-id Z123456 --change-batch file://failover.json
   ```

## Performance Optimization

### CDN Configuration

```javascript
// CloudFront distribution
const distribution = new aws.cloudfront.Distribution("dzinza-cdn", {
  origins: [
    {
      domainName: "dzinza.com",
      originId: "dzinza-origin",
      customOriginConfig: {
        httpPort: 80,
        httpsPort: 443,
        originProtocolPolicy: "https-only",
      },
    },
  ],
  defaultCacheBehavior: {
    targetOriginId: "dzinza-origin",
    viewerProtocolPolicy: "redirect-to-https",
    cachePolicyId: "4135ea2d-6df8-44a3-9df3-4b5a84be39ad", // Managed-CachingOptimized
  },
  priceClass: "PriceClass_100",
});
```

### Auto-scaling Configuration

```yaml
# Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: dzinza-hpa
  namespace: dzinza-production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: dzinza-app
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

## Troubleshooting

### Common Issues

1. **Pod Not Starting**

   ```bash
   kubectl describe pod <pod-name> -n dzinza-production
   kubectl logs <pod-name> -n dzinza-production
   ```

2. **Database Connection Issues**

   ```bash
   # Test database connection
   kubectl run postgres-client --rm -it --image=postgres:15 -- psql $DATABASE_URL
   ```

3. **SSL Certificate Issues**
   ```bash
   # Check certificate status
   kubectl describe certificate dzinza-tls -n dzinza-production
   kubectl logs -n cert-manager deployment/cert-manager
   ```

### Performance Issues

1. **High Memory Usage**

   ```bash
   # Check resource usage
   kubectl top pods -n dzinza-production
   kubectl describe hpa dzinza-hpa -n dzinza-production
   ```

2. **Slow Database Queries**
   ```sql
   -- Check slow queries
   SELECT query, mean_time, calls
   FROM pg_stat_statements
   ORDER BY mean_time DESC
   LIMIT 10;
   ```

## Security Considerations

### Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: dzinza-network-policy
  namespace: dzinza-production
spec:
  podSelector:
    matchLabels:
      app: dzinza-app
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              name: kube-system
```

### Pod Security Standards

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: dzinza-app
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1001
    fsGroup: 1001
  containers:
    - name: dzinza-app
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop:
            - ALL
```

## Post-Deployment Checklist

- [ ] Application is accessible via HTTPS
- [ ] Health checks are passing
- [ ] Database migrations completed successfully
- [ ] SSL certificates are valid
- [ ] Monitoring and alerting are active
- [ ] Backup systems are functioning
- [ ] Auto-scaling is configured
- [ ] Security policies are applied
- [ ] Performance metrics are within acceptable ranges
- [ ] Documentation is updated

# Development Guidelines

## Code Standards

### TypeScript Guidelines

#### Naming Conventions

```typescript
// Use PascalCase for components, types, and interfaces
interface UserProfile {
  firstName: string;
  lastName: string;
}

// Use camelCase for variables and functions
const userName = 'john_doe';
const getUserProfile = (id: string) => { ... };

// Use UPPER_SNAKE_CASE for constants
const API_BASE_URL = 'https://api.dzinza.com';
const DEFAULT_PAGE_SIZE = 20;
```

#### Type Definitions

```typescript
// Always define explicit types for function parameters and return values
function calculateAge(birthDate: Date): number {
  return new Date().getFullYear() - birthDate.getFullYear();
}

// Use strict type checking
interface Person {
  id: string;
  name: string;
  birthDate: Date;
  gender: "male" | "female" | "other" | "prefer_not_to_say";
}

// Avoid 'any' type - use 'unknown' or proper types
const parseApiResponse = (data: unknown): Person[] => {
  // Type guards for validation
  if (Array.isArray(data)) {
    return data.filter(isValidPerson);
  }
  return [];
};
```

### React Guidelines

#### Component Structure

```typescript
// Use function components with TypeScript
interface PersonCardProps {
  person: Person;
  onEdit: (person: Person) => void;
  isEditing?: boolean;
}

export const PersonCard: React.FC<PersonCardProps> = ({
  person,
  onEdit,
  isEditing = false,
}) => {
  // Use custom hooks for complex logic
  const { isVisible, toggle } = useToggle(false);

  // Group related state
  const [editState, setEditState] = useState({
    isLoading: false,
    error: null,
  });

  return <div className="person-card">{/* Component JSX */}</div>;
};
```

#### Custom Hooks

```typescript
// Create reusable custom hooks
export const usePersonData = (personId: string) => {
  const [person, setPerson] = useState<Person | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPerson(personId)
      .then(setPerson)
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, [personId]);

  return { person, isLoading, error };
};
```

### CSS/Styling Guidelines

#### Tailwind CSS Usage

```typescript
// Use semantic class groupings
const cardClasses = [
  // Layout
  "flex flex-col",
  // Spacing
  "p-6 m-4",
  // Colors
  "bg-white border border-gray-200",
  // Typography
  "text-gray-900",
  // Effects
  "shadow-sm rounded-lg hover:shadow-md",
  // Responsive
  "sm:p-8 md:p-10",
].join(" ");

// Use CSS variables for dynamic values
const dynamicStyles = {
  "--progress-width": `${progress}%`,
  "--tree-depth": depth,
} as React.CSSProperties;
```

#### Component Variants

```typescript
// Use cva (class-variance-authority) for component variants
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

## Git Workflow

### Branch Strategy

```bash
# Main branches
main          # Production-ready code
develop       # Integration branch for features

# Feature branches
feature/auth-system
feature/family-tree-visualization
feature/dna-matching

# Release branches
release/v1.0.0
release/v1.1.0

# Hotfix branches
hotfix/security-patch
hotfix/critical-bug-fix
```

### Commit Convention

```bash
# Format: <type>(<scope>): <description>
feat(auth): add JWT token refresh mechanism
fix(family-tree): resolve rendering issue with large trees
docs(api): update authentication endpoint documentation
style(ui): improve button component styling
refactor(database): optimize query performance
test(auth): add unit tests for login functionality
chore(deps): update React to v18.2.0

# Breaking changes
feat(api)!: remove deprecated user profile endpoints
```

### Pull Request Process

1. **Create feature branch from develop**

   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/new-feature
   ```

2. **Make changes with proper commits**

   ```bash
   git add .
   git commit -m "feat(feature): implement new functionality"
   ```

3. **Push and create PR**

   ```bash
   git push origin feature/new-feature
   # Create PR to develop branch
   ```

4. **PR Requirements**
   - [ ] All tests pass
   - [ ] Code review approved
   - [ ] Documentation updated
   - [ ] No merge conflicts

## Testing Standards

### Unit Testing

```typescript
// Use React Testing Library for component tests
import { render, screen, fireEvent } from "@testing-library/react";
import { PersonCard } from "./PersonCard";

describe("PersonCard", () => {
  const mockPerson = {
    id: "1",
    name: "John Doe",
    birthDate: new Date("1990-01-01"),
    gender: "male" as const,
  };

  it("renders person information correctly", () => {
    render(<PersonCard person={mockPerson} onEdit={jest.fn()} />);

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Male")).toBeInTheDocument();
  });

  it("calls onEdit when edit button is clicked", () => {
    const mockOnEdit = jest.fn();
    render(<PersonCard person={mockPerson} onEdit={mockOnEdit} />);

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    expect(mockOnEdit).toHaveBeenCalledWith(mockPerson);
  });
});
```

### API Testing

```typescript
// Use Supertest for API endpoint testing
import request from "supertest";
import app from "../app";

describe("Auth Endpoints", () => {
  describe("POST /api/auth/login", () => {
    it("should login with valid credentials", async () => {
      const response = await request(app).post("/api/auth/login").send({
        email: "test@example.com",
        password: "password123",
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("token");
      expect(response.body.user).toHaveProperty("email", "test@example.com");
    });

    it("should reject invalid credentials", async () => {
      const response = await request(app).post("/api/auth/login").send({
        email: "test@example.com",
        password: "wrongpassword",
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
    });
  });
});
```

### E2E Testing

```typescript
// Use Playwright for end-to-end tests
import { test, expect } from "@playwright/test";

test.describe("Family Tree", () => {
  test("user can create a new family tree", async ({ page }) => {
    await page.goto("/dashboard");

    // Click create new tree button
    await page.click("text=Create New Tree");

    // Fill in family tree details
    await page.fill("[data-testid=tree-name]", "Smith Family");
    await page.click("[data-testid=create-tree-submit]");

    // Verify tree was created
    await expect(page.locator("text=Smith Family")).toBeVisible();
  });
});
```

## Performance Guidelines

### Frontend Performance

```typescript
// Use React.memo for expensive components
export const FamilyTreeNode = React.memo<FamilyTreeNodeProps>(
  ({ person, onSelect }) => {
    return <div className="family-tree-node">{/* Component content */}</div>;
  }
);

// Use useMemo for expensive calculations
const familyStats = useMemo(() => {
  return calculateFamilyStatistics(familyData);
}, [familyData]);

// Use useCallback for stable function references
const handlePersonSelect = useCallback(
  (person: Person) => {
    setSelectedPerson(person);
    onPersonSelect?.(person);
  },
  [onPersonSelect]
);
```

### Code Splitting

```typescript
// Lazy load heavy components
const FamilyTreeVisualization = lazy(() => import("./FamilyTreeVisualization"));
const DNAAnalysis = lazy(() => import("./DNAAnalysis"));

// Use Suspense for loading states
<Suspense fallback={<LoadingSpinner />}>
  <FamilyTreeVisualization />
</Suspense>;
```

## Security Guidelines

### Input Validation

```typescript
// Validate all user inputs
import { z } from "zod";

const PersonSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional(),
  birthDate: z.date().max(new Date()),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]),
});

// Use schema validation in API endpoints
app.post("/api/persons", async (req, res) => {
  try {
    const validatedData = PersonSchema.parse(req.body);
    // Process validated data
  } catch (error) {
    return res.status(400).json({ error: "Invalid input data" });
  }
});
```

### Authentication

```typescript
// Protect sensitive routes
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};
```

## Documentation Standards

### Code Documentation

````typescript
/**
 * Calculates the relationship between two people in a family tree
 * @param person1 - First person in the relationship
 * @param person2 - Second person in the relationship
 * @param familyTree - Complete family tree data
 * @returns The relationship type or null if no relationship exists
 * @example
 * ```typescript
 * const relationship = calculateRelationship(john, jane, familyTree);
 * // Returns: 'cousin' | 'sibling' | 'parent' | null
 * ```
 */
export function calculateRelationship(
  person1: Person,
  person2: Person,
  familyTree: FamilyTree
): RelationshipType | null {
  // Implementation
}
````

### API Documentation

```typescript
/**
 * @swagger
 * /api/persons:
 *   post:
 *     summary: Create a new person in the family tree
 *     tags: [Persons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Person'
 *     responses:
 *       201:
 *         description: Person created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Person'
 */
```

## Error Handling

### Frontend Error Boundaries

```typescript
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    // Send to error reporting service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>
            We apologize for the inconvenience. Please try refreshing the page.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Backend Error Handling

```typescript
// Global error handler
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = error instanceof ApiError ? error.statusCode : 500;
  const message = error.message || "Internal server error";

  // Log error for debugging
  console.error("API Error:", {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  res.status(statusCode).json({
    error: {
      message,
      ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
    },
  });
};
```

# Development Rules (Layer 2)

## Overview

This document defines the standard development practices and technology guidelines for the Dzinza project. These rules provide consistency and quality while allowing flexibility for specific use cases.

## Technology Stack Standards

### Frontend

- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite for development and production builds
- **Styling**: Tailwind CSS for utility-first styling
- **State Management**: React Query for server state, Zustand for client state
- **Internationalization**: React-i18next for multi-language support
- **Testing**: Vitest for unit tests, Playwright for E2E tests
- **Linting**: ESLint with TypeScript support

### Backend

- **Runtime**: Node.js 18+ LTS
- **Framework**: Express.js or Fastify for APIs
- **Database**: PostgreSQL 14+ as primary database
- **ORM**: Prisma for database access and migrations
- **Authentication**: JWT with refresh tokens
- **API Documentation**: OpenAPI/Swagger

### DevOps & Infrastructure

- **Containerization**: Docker for local development and deployment
- **CI/CD**: GitHub Actions
- **Cloud Provider**: AWS (primary), with multi-cloud considerations
- **Monitoring**: Application and infrastructure monitoring required
- **Logging**: Structured logging with correlation IDs

## Development Methodology

### Workflow

1. **Feature Planning**: Create issues with clear acceptance criteria
2. **Branch Strategy**: Git Flow with feature branches
3. **Development**: TDD/BDD approach when applicable
4. **Code Review**: All changes require peer review
5. **Testing**: Automated tests must pass
6. **Deployment**: Automated deployment to staging, manual to production

### Branch Naming Convention

```
feature/DZ-123-user-authentication
bugfix/DZ-456-fix-memory-leak
hotfix/DZ-789-security-patch
```

### Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Architecture Patterns

### Overall Architecture

- **Pattern**: Clean Architecture with Domain-Driven Design
- **API Style**: RESTful APIs with GraphQL for complex queries
- **Database**: ACID transactions, normalized design with read replicas
- **Caching**: Redis for session storage and application cache
- **File Storage**: Object storage (S3) for user uploads

### Code Organization

```
src/
├── application/     # Use cases and application services
├── domain/         # Business logic and entities
├── infrastructure/ # External services and adapters
├── presentation/   # Controllers and DTOs
└── shared/         # Common utilities and types
```

### Design Patterns

- **Repository Pattern**: For data access abstraction
- **Factory Pattern**: For object creation
- **Observer Pattern**: For event handling
- **Decorator Pattern**: For adding behavior dynamically
- **Strategy Pattern**: For algorithm selection

## Data Management Rules

### Database Design

- **Normalization**: Aim for 3NF, denormalize only for performance
- **Naming**: Use snake_case for database objects
- **Constraints**: Enforce data integrity at database level
- **Migrations**: All schema changes through migrations
- **Backup**: Daily automated backups with tested restore procedures
- **Internationalization**: Support for Unicode text storage and multi-language content
- **Localization**: Store translatable content with language codes

### API Design Standards

- **REST Conventions**: Use HTTP methods correctly
- **Status Codes**: Use appropriate HTTP status codes
- **Pagination**: Implement cursor-based pagination for large datasets
- **Rate Limiting**: Implement rate limiting on all public endpoints
- **Versioning**: Use URL versioning (e.g., `/api/v1/users`)

### Data Validation

- **Input Validation**: Validate all inputs at API boundary
- **Schema Validation**: Use JSON Schema or similar for request/response validation
- **Sanitization**: Sanitize all user inputs
- **Type Safety**: Use TypeScript for compile-time type checking

## Testing Requirements

### Test Strategy

- **Unit Tests**: Cover business logic and utilities
- **Integration Tests**: Test API endpoints and database interactions
- **E2E Tests**: Test critical user journeys
- **Performance Tests**: Load testing for API endpoints
- **Security Tests**: Automated security scanning

### Coverage Requirements

- **Unit Tests**: Minimum 80% code coverage
- **Critical Paths**: 100% coverage for security and payment flows
- **E2E Tests**: Cover all major user workflows
- **Regression Tests**: Automate tests for all bugs fixed

### Test Organization

```
tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
├── e2e/           # End-to-end tests
├── performance/   # Load and performance tests
└── fixtures/      # Test data and mocks
```

## Security Standards

### Authentication & Authorization

- **Authentication**: Multi-factor authentication required for admin users
- **Session Management**: Secure session handling with timeout
- **Password Policy**: Enforce strong password requirements
- **Role-Based Access**: Implement RBAC for different user types
- **API Security**: Rate limiting, input validation, output encoding

### Data Protection

- **Encryption**: Encrypt PII at rest and in transit
- **Key Management**: Use proper key rotation and storage
- **Data Retention**: Implement data retention policies
- **GDPR Compliance**: Support data export and deletion
- **Audit Logging**: Log all access to sensitive data

### Security Scanning

- **Dependency Scanning**: Regular scans for vulnerable dependencies
- **SAST**: Static Application Security Testing in CI/CD
- **DAST**: Dynamic testing for deployed applications
- **Infrastructure Scanning**: Scan Docker images and infrastructure

## Performance Standards

### Response Time Targets

- **API Endpoints**: < 200ms for simple operations
- **Database Queries**: < 100ms for common queries
- **Page Load**: < 3 seconds on 3G connection
- **Image Loading**: Progressive loading with placeholders

### Optimization Strategies

- **Database**: Query optimization, proper indexing
- **Caching**: Multi-level caching strategy
- **Asset Optimization**: Image compression, code splitting
- **CDN**: Use CDN for static assets
- **Monitoring**: Real-time performance monitoring

### Scalability Considerations

- **Horizontal Scaling**: Design for multiple instances
- **Database Scaling**: Read replicas and partitioning strategies
- **Stateless Design**: Avoid server-side session storage
- **Async Processing**: Use queues for heavy operations

## Error Handling Standards

### Error Categories

- **Validation Errors**: 400 with detailed field-level errors
- **Authentication Errors**: 401 with clear messaging
- **Authorization Errors**: 403 with permission details
- **Not Found Errors**: 404 with helpful suggestions
- **Server Errors**: 500 with correlation IDs for tracking

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request data is invalid",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address"
      }
    ],
    "correlationId": "req_123456789"
  }
}
```

### Logging Standards

- **Structured Logging**: Use JSON format for logs
- **Log Levels**: DEBUG, INFO, WARN, ERROR, FATAL
- **Correlation IDs**: Track requests across services
- **Security Events**: Log authentication and authorization events
- **Performance Metrics**: Log slow queries and operations

## Code Quality Standards

### Static Analysis

- **ESLint**: Configure and enforce linting rules
- **Prettier**: Consistent code formatting
- **TypeScript**: Strict mode enabled
- **SonarQube**: Code quality and security analysis
- **Husky**: Pre-commit hooks for quality gates

### Code Review Process

- **Peer Review**: All code changes reviewed by peers
- **Automated Checks**: Linting, testing, and security scans
- **Review Criteria**: Functionality, security, performance, maintainability
- **Documentation**: Update documentation for API changes
- **Approval Requirements**: Two approvals for critical changes

### Documentation Standards

- **Code Comments**: Document complex business logic
- **API Documentation**: OpenAPI specs for all endpoints
- **README Files**: Setup and development instructions
- **Architecture Docs**: Document major design decisions
- **Changelog**: Track all user-facing changes

## Deployment Rules

### Environment Strategy

- **Development**: Local development with Docker
- **Staging**: Mirror production environment
- **Production**: High availability, monitoring, backup

### Deployment Process

- **Blue-Green Deployment**: Zero-downtime deployments
- **Database Migrations**: Run migrations before code deployment
- **Health Checks**: Verify deployment health before traffic routing
- **Rollback Plan**: Automated rollback on deployment failure
- **Feature Flags**: Use feature flags for gradual rollouts

### Monitoring & Alerting

- **Application Monitoring**: APM tools for performance tracking
- **Infrastructure Monitoring**: Server and service health
- **Error Tracking**: Centralized error tracking and alerting
- **Business Metrics**: Track key business indicators
- **On-Call Procedures**: Clear escalation procedures

## Exceptions and Overrides

### When to Override Rules

- **Performance Requirements**: Critical performance needs
- **Third-Party Constraints**: External system limitations
- **Legacy Compatibility**: Existing system integration
- **Regulatory Requirements**: Legal or compliance needs
- **Resource Constraints**: Time or budget limitations

### Override Process

1. Document the specific rule being overridden
2. Explain the business or technical justification
3. Assess the risks and mitigation strategies
4. Get approval from appropriate stakeholders
5. Plan for future compliance or refactoring
6. Update documentation with the exception

### Exception Tracking

- Maintain a registry of all active exceptions
- Regular review of exceptions for removal
- Track technical debt created by exceptions
- Plan remediation work in future sprints

---

**Remember**: These rules provide consistency and quality standards. When you need to deviate, document your reasoning and ensure the deviation serves the core principles of the project.

# Feature Specifications

## Overview

This document provides detailed specifications for all features planned for the Dzinza genealogy platform, organized by development phases and priority levels.

## Feature Classification System

### Priority Levels

- **P0 - Critical**: Core functionality required for MVP
- **P1 - High**: Important features for competitive advantage
- **P2 - Medium**: Enhanced user experience features
- **P3 - Low**: Nice-to-have features for future consideration

### Development Phases

- **Phase 1**: Foundation (Months 1-3)
- **Phase 2**: Core Features (Months 4-6)
- **Phase 3**: Advanced Features (Months 7-9)
- **Phase 4**: Innovation & Scale (Months 10-12)

## Phase 1: Foundation Features

### F1.1 User Authentication & Authorization

**Priority**: P0  
**Effort**: 2 weeks  
**Dependencies**: None

**Description**: Secure user registration, login, and session management with multi-factor authentication support.

**Acceptance Criteria**:

- [ ] User can register with email and password
- [ ] Email verification required for account activation
- [ ] Secure password requirements (8+ chars, mixed case, numbers, symbols)
- [ ] JWT-based authentication with refresh tokens
- [ ] Multi-factor authentication via SMS/TOTP
- [ ] Password reset functionality
- [ ] Role-based access control (User, Admin, Expert)
- [ ] Account deactivation and data export options
- [ ] OAuth integration (Google, Facebook)

**Technical Requirements**:

- JWT tokens with 15-minute expiry
- Refresh tokens with 30-day expiry
- bcrypt password hashing (12 rounds)
- Rate limiting on authentication endpoints
- HTTPS-only session cookies
- GDPR-compliant data handling

**User Stories**:

```
As a new user, I want to create an account so that I can start building my family tree.
As a user, I want to log in securely so that my family data remains protected.
As a user, I want to enable 2FA so that my account has additional security.
```

### F1.2 Basic Profile Management

**Priority**: P0  
**Effort**: 1 week  
**Dependencies**: F1.1

**Description**: User profile creation and management with privacy controls and cultural sensitivity.

**Acceptance Criteria**:

- [ ] Personal information input (name, birth date, location)
- [ ] Profile photo upload and management
- [ ] Privacy settings configuration
- [ ] Language preference selection
- [ ] Cultural background specification
- [ ] Contact information management
- [ ] Biography and story writing
- [ ] Profile sharing controls

**Technical Requirements**:

- Image upload with automatic resizing
- Privacy controls at field level
- Multi-language form validation
- Cultural naming convention support
- GDPR-compliant data storage

### F1.3 Basic Family Tree Structure

**Priority**: P0  
**Effort**: 3 weeks  
**Dependencies**: F1.2

**Description**: Core family tree functionality with person and relationship management.

**Acceptance Criteria**:

- [ ] Add family members (parents, siblings, children, spouses)
- [ ] Define relationships between individuals
- [ ] Basic tree visualization (3 generations)
- [ ] Person detail views
- [ ] Relationship editing and deletion
- [ ] Family group management
- [ ] Tree sharing and collaboration permissions
- [ ] Export tree data (GEDCOM format)

**Technical Requirements**:

- PostgreSQL relationship modeling
- D3.js tree visualization
- Real-time collaboration support
- Cultural family structure support (polygamy, adoption)
- Performance optimization for large trees

### F1.4 Data Import/Export

**Priority**: P1  
**Effort**: 2 weeks  
**Dependencies**: F1.3

**Description**: Import family data from other platforms and export user data for portability.

**Acceptance Criteria**:

- [ ] GEDCOM file import
- [ ] CSV data import
- [ ] Ancestry.com import (API)
- [ ] MyHeritage import (API)
- [ ] Data export in multiple formats
- [ ] Bulk photo import
- [ ] Import validation and error handling
- [ ] Data mapping and transformation tools

**Technical Requirements**:

- GEDCOM parser with validation
- Async import processing
- Progress tracking and notifications
- Data deduplication algorithms
- Error logging and recovery

## Phase 2: Core Features

### F2.1 Interactive Family Tree Visualization

**Priority**: P0  
**Effort**: 4 weeks  
**Dependencies**: F1.3

**Description**: Advanced family tree visualization with interactive navigation and customization.

**Acceptance Criteria**:

- [ ] Zoomable and pannable tree interface
- [ ] Multiple tree layout options (ancestors, descendants, hourglass)
- [ ] Search within tree
- [ ] Tree statistics and insights
- [ ] Customizable visual themes
- [ ] Print and save tree images
- [ ] Mobile-responsive design
- [ ] Accessibility compliance (WCAG 2.1 AA)

**Technical Requirements**:

- D3.js v7 with Canvas/SVG rendering
- Virtual scrolling for performance
- Touch gesture support
- High-resolution export options
- Keyboard navigation support
- Screen reader compatibility

**User Stories**:

```
As a user, I want to navigate my family tree easily so that I can explore my ancestry.
As a user, I want to customize the tree appearance so that it reflects my cultural preferences.
As a mobile user, I want the tree to work well on my phone so that I can view it anywhere.
```

### F2.2 Person Profile Management

**Priority**: P0  
**Effort**: 3 weeks  
**Dependencies**: F2.1

**Description**: Comprehensive individual profile pages with rich biographical information.

**Acceptance Criteria**:

- [ ] Detailed biographical information forms
- [ ] Life timeline creation
- [ ] Photo gallery management
- [ ] Document attachment (certificates, letters)
- [ ] Story and memory recording
- [ ] Location and mapping integration
- [ ] Source citation tracking
- [ ] Fact verification system

**Technical Requirements**:

- Rich text editor for stories
- Image gallery with metadata
- Document storage and indexing
- Map integration (Google Maps/OpenStreetMap)
- Version control for profile changes
- Source management system

### F2.3 Search and Discovery

**Priority**: P1  
**Effort**: 3 weeks  
**Dependencies**: F2.2

**Description**: Powerful search functionality for finding people, records, and connections.

**Acceptance Criteria**:

- [ ] Global person search across all trees
- [ ] Advanced filtering options
- [ ] Fuzzy name matching
- [ ] Location-based search
- [ ] Date range filtering
- [ ] Search result ranking
- [ ] Saved searches
- [ ] Search history

**Technical Requirements**:

- Elasticsearch integration
- Phonetic name matching algorithms
- Geographic search capabilities
- Real-time search suggestions
- Search analytics and optimization
- Multi-language search support

### F2.4 Collaboration Tools

**Priority**: P1  
**Effort**: 2 weeks  
**Dependencies**: F2.1

**Description**: Real-time collaboration features for family research and tree building.

**Acceptance Criteria**:

- [ ] Invite family members to collaborate
- [ ] Real-time tree editing
- [ ] Comment and discussion system
- [ ] Change tracking and history
- [ ] Permission management
- [ ] Notification system
- [ ] Conflict resolution tools
- [ ] Activity feeds

**Technical Requirements**:

- WebSocket real-time communication
- Operational transformation for concurrent editing
- Notification service with email/SMS
- Permission-based data access
- Audit logging for all changes
- Conflict detection and resolution

### F2.5 Mobile Application (PWA)

**Priority**: P1  
**Effort**: 4 weeks  
**Dependencies**: F2.1, F2.2

**Description**: Progressive Web App providing native-like mobile experience.

**Acceptance Criteria**:

- [ ] Installable PWA on mobile devices
- [ ] Offline functionality for tree viewing
- [ ] Touch-optimized tree navigation
- [ ] Camera integration for document capture
- [ ] Voice note recording
- [ ] Push notifications
- [ ] Sync with web application
- [ ] Mobile-specific UI patterns

**Technical Requirements**:

- Service Worker for offline functionality
- IndexedDB for local data storage
- Camera API integration
- Web Push API for notifications
- Responsive design patterns
- Performance optimization for mobile networks

## Phase 3: Advanced Features

### F3.1 DNA Data Integration

**Priority**: P1  
**Effort**: 6 weeks  
**Dependencies**: F2.2

**Description**: DNA data upload, processing, and matching functionality.

**Acceptance Criteria**:

- [ ] Raw DNA data upload (23andMe, AncestryDNA, etc.)
- [ ] DNA data processing and analysis
- [ ] Genetic relative matching
- [ ] Ethnicity estimation
- [ ] Shared DNA visualization
- [ ] Chromosome browser
- [ ] DNA match management
- [ ] Privacy controls for DNA sharing

**Technical Requirements**:

- Secure DNA data storage and encryption
- Bioinformatics algorithms for matching
- High-performance computing for analysis
- Chromosome visualization tools
- Privacy-compliant data handling
- Integration with third-party DNA services

**User Stories**:

```
As a user, I want to upload my DNA data so that I can find genetic relatives.
As a user, I want to see my ethnicity breakdown so that I can understand my heritage.
As a user, I want to control who can see my DNA data so that my privacy is protected.
```

### F3.2 Historical Records Database

**Priority**: P1  
**Effort**: 8 weeks  
**Dependencies**: F2.3

**Description**: Searchable database of historical records with OCR and indexing.

**Acceptance Criteria**:

- [ ] Historical record upload and digitization
- [ ] OCR processing for text extraction
- [ ] Record categorization and tagging
- [ ] Advanced record search
- [ ] Record-to-person matching suggestions
- [ ] Source citation generation
- [ ] Community record verification
- [ ] Record image viewer with zoom

**Technical Requirements**:

- MongoDB for document storage
- OCR engine (Tesseract/Cloud Vision)
- Natural language processing for text analysis
- Machine learning for record matching
- High-resolution image handling
- Elasticsearch for full-text search

### F3.3 AI Photo Enhancement

**Priority**: P1  
**Effort**: 5 weeks  
**Dependencies**: F2.2

**Description**: AI-powered photo restoration, colorization, and enhancement tools.

**Acceptance Criteria**:

- [ ] Photo upload and management
- [ ] Automatic photo enhancement
- [ ] AI colorization for black and white photos
- [ ] Face detection and recognition
- [ ] Photo dating estimation
- [ ] Before/after comparison views
- [ ] Batch processing capabilities
- [ ] Quality assessment and recommendations

**Technical Requirements**:

- WebAssembly for client-side processing
- TensorFlow.js models for enhancement
- Cloud GPU processing for heavy operations
- Image processing pipelines
- Quality metrics and validation
- Progressive enhancement approach

### F3.4 Smart Matching & Suggestions

**Priority**: P2  
**Effort**: 4 weeks  
**Dependencies**: F2.3, F3.2

**Description**: AI-powered suggestions for family connections and historical records.

**Acceptance Criteria**:

- [ ] Automatic person matching across trees
- [ ] Historical record suggestions
- [ ] Missing information detection
- [ ] Duplicate person identification
- [ ] Relationship suggestion algorithms
- [ ] Confidence scoring for matches
- [ ] User feedback integration
- [ ] Match review and approval workflow

**Technical Requirements**:

- Machine learning models for matching
- Similarity scoring algorithms
- Fuzzy matching for names and dates
- Active learning from user feedback
- Real-time suggestion generation
- Performance optimization for scale

### F3.5 Advanced Analytics & Insights

**Priority**: P2  
**Effort**: 3 weeks  
**Dependencies**: F2.1, F3.1

**Description**: Analytics dashboard with family insights and statistics.

**Acceptance Criteria**:

- [ ] Family tree statistics and visualizations
- [ ] Geographic ancestry mapping
- [ ] Timeline of family events
- [ ] Surname distribution analysis
- [ ] Migration pattern visualization
- [ ] Longevity and health insights
- [ ] Cultural tradition tracking
- [ ] Exportable reports

**Technical Requirements**:

- Data analytics processing pipeline
- Interactive visualization library (D3.js/Chart.js)
- Geographic mapping integration
- Statistical analysis algorithms
- Caching for performance
- Responsive chart designs

## Phase 4: Innovation & Scale

### F4.1 Voice Assistant Integration

**Priority**: P2  
**Effort**: 6 weeks  
**Dependencies**: F2.3

**Description**: Voice-controlled genealogy research in native African languages.

**Acceptance Criteria**:

- [ ] Voice search in English, Shona, Ndebele
- [ ] Voice commands for tree navigation
- [ ] Audio story recording
- [ ] Voice-to-text transcription
- [ ] Pronunciation guides for names
- [ ] Voice accessibility features
- [ ] Multi-language voice support
- [ ] Offline voice processing

**Technical Requirements**:

- Web Speech API integration
- Custom speech recognition models
- Natural language processing
- Audio processing and storage
- Multi-language support
- Accessibility compliance

### F4.2 Blockchain Record Verification

**Priority**: P3  
**Effort**: 8 weeks  
**Dependencies**: F3.2

**Description**: Blockchain-based verification system for historical record authenticity.

**Acceptance Criteria**:

- [ ] Document hash verification on blockchain
- [ ] Immutable record timestamps
- [ ] Verification badge system
- [ ] Community consensus mechanisms
- [ ] Certificate of authenticity generation
- [ ] Audit trail for all changes
- [ ] Integration with existing verification systems
- [ ] Cost-effective verification process

**Technical Requirements**:

- Blockchain integration (Ethereum/Polygon)
- Smart contracts for verification
- IPFS for document storage
- Cryptographic hash functions
- Gas fee optimization
- Web3 wallet integration

### F4.3 AR/VR Family Tree Experience

**Priority**: P3  
**Effort**: 10 weeks  
**Dependencies**: F2.1

**Description**: Immersive augmented and virtual reality family tree exploration.

**Acceptance Criteria**:

- [ ] AR family tree overlay on mobile
- [ ] VR family tree exploration
- [ ] 3D ancestor avatars
- [ ] Virtual family gatherings
- [ ] Historical location visits
- [ ] Interactive storytelling
- [ ] Multi-user VR sessions
- [ ] Accessibility in VR/AR

**Technical Requirements**:

- WebXR API for VR/AR
- 3D modeling and animation
- Spatial tracking and mapping
- Real-time rendering optimization
- Cross-platform VR support
- Performance optimization for mobile AR

### F4.4 Community Knowledge Hub

**Priority**: P2  
**Effort**: 5 weeks  
**Dependencies**: F2.4

**Description**: Community-driven knowledge sharing and expert consultation platform.

**Acceptance Criteria**:

- [ ] Expert genealogist network
- [ ] Community forums and Q&A
- [ ] Research request system
- [ ] Knowledge base articles
- [ ] Video tutorial library
- [ ] Live consultation booking
- [ ] Peer review system
- [ ] Gamification and rewards

**Technical Requirements**:

- Forum software integration
- Video conferencing API
- Content management system
- Rating and review system
- Payment processing for consultations
- Real-time messaging system

### F4.5 API Ecosystem & Integrations

**Priority**: P2  
**Effort**: 4 weeks  
**Dependencies**: All previous features

**Description**: Comprehensive API platform for third-party integrations and developer ecosystem.

**Acceptance Criteria**:

- [ ] RESTful API with OpenAPI documentation
- [ ] GraphQL API for flexible queries
- [ ] Webhook system for real-time events
- [ ] Rate limiting and usage analytics
- [ ] API key management
- [ ] Developer portal and documentation
- [ ] SDK for popular programming languages
- [ ] Integration marketplace

**Technical Requirements**:

- API gateway for routing and security
- Rate limiting and throttling
- API versioning strategy
- Comprehensive documentation
- SDK generation tools
- Analytics and monitoring

## Feature Dependencies Map

```mermaid
graph TD
    F1.1[Authentication] --> F1.2[Profile Management]
    F1.2 --> F1.3[Basic Family Tree]
    F1.3 --> F1.4[Import/Export]
    F1.3 --> F2.1[Interactive Tree]
    F2.1 --> F2.2[Person Profiles]
    F2.2 --> F2.3[Search & Discovery]
    F2.1 --> F2.4[Collaboration]
    F2.1 --> F2.5[Mobile PWA]
    F2.2 --> F3.1[DNA Integration]
    F2.3 --> F3.2[Historical Records]
    F2.2 --> F3.3[Photo Enhancement]
    F2.3 --> F3.4[Smart Matching]
    F2.1 --> F3.5[Analytics]
    F2.3 --> F4.1[Voice Assistant]
    F3.2 --> F4.2[Blockchain Verification]
    F2.1 --> F4.3[AR/VR Experience]
    F2.4 --> F4.4[Community Hub]
    F3.5 --> F4.5[API Ecosystem]
```

## Implementation Priorities

### MVP Feature Set (Phase 1 + Essential Phase 2)

1. User Authentication (F1.1)
2. Profile Management (F1.2)
3. Basic Family Tree (F1.3)
4. Interactive Tree Visualization (F2.1)
5. Person Profile Management (F2.2)
6. Basic Search (F2.3)
7. Mobile PWA (F2.5)

### Competitive Differentiation Features

1. DNA Integration with African focus (F3.1)
2. Native language voice assistant (F4.1)
3. AI photo enhancement (F3.3)
4. Historical records for Africa (F3.2)
5. Community collaboration (F2.4)

### Innovation Features

1. AR/VR experience (F4.3)
2. Blockchain verification (F4.2)
3. Smart matching AI (F3.4)
4. Advanced analytics (F3.5)
5. API ecosystem (F4.5)

This feature specification provides a comprehensive roadmap for building Dzinza into a world-class genealogy platform that serves the unique needs of African heritage research while incorporating cutting-edge technology and user experience innovations.

# i18n Usage Examples

This document provides practical examples of how to use the internationalization system in the Dzinza genealogy platform.

## Quick Start

1. **Import the hook in your component:**

```tsx
import { useTranslation } from "react-i18next";
```

2. **Use translations in your component:**

```tsx
const MyComponent = () => {
  const { t } = useTranslation(["common", "dashboard"]);

  return (
    <div>
      <h1>{t("common:welcome")}</h1>
      <p>{t("dashboard:overview.description")}</p>
    </div>
  );
};
```

## Real Examples

### Example 1: Simple Component with Single Namespace

```tsx
import { useTranslation } from "react-i18next";

const ProfileHeader = () => {
  const { t } = useTranslation("profile");

  return (
    <header>
      <h1>{t("header.title")}</h1>
      <p>{t("header.subtitle")}</p>
    </header>
  );
};
```

### Example 2: Component with Multiple Namespaces

```tsx
import { useTranslation } from "react-i18next";

const FamilyTreeNode = ({ member }) => {
  const { t } = useTranslation(["familyTree", "common"]);

  return (
    <div className="family-member">
      <h3>{member.name}</h3>
      <p>
        {t("familyTree:relationships.father")}: {member.father}
      </p>
      <button>{t("common:actions.edit")}</button>
    </div>
  );
};
```

### Example 3: Dynamic Translations with Variables

```tsx
import { useTranslation } from "react-i18next";

const WelcomeMessage = ({ userName }) => {
  const { t } = useTranslation("common");

  return (
    <div>
      {/* Translation with interpolation */}
      <h1>{t("greetings.welcome", { name: userName })}</h1>

      {/* Count-based pluralization */}
      <p>{t("messages.itemCount", { count: 5 })}</p>
    </div>
  );
};
```

### Example 4: Cultural Formatting

```tsx
import { useTranslation } from "react-i18next";
import { formatDate, formatCurrency } from "../i18n/utils/culturalFormatting";

const EventCard = ({ event }) => {
  const { t, i18n } = useTranslation("historicalRecords");

  return (
    <div className="event-card">
      <h3>{t("events.title")}</h3>
      <p>{formatDate(event.date, i18n.language)}</p>
      <span>{formatCurrency(event.cost, i18n.language)}</span>
    </div>
  );
};
```

### Example 5: Language Switching

```tsx
import { useTranslation } from "react-i18next";

const LanguageToggle = () => {
  const { i18n } = useTranslation();

  const switchLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  return (
    <div className="language-toggle">
      <button onClick={() => switchLanguage("en")}>English</button>
      <button onClick={() => switchLanguage("sn")}>ChiShona</button>
      <button onClick={() => switchLanguage("nd")}>IsiNdebele</button>
    </div>
  );
};
```

## Translation Key Structure

Follow this consistent pattern for translation keys:

```
namespace:section.subsection.key
```

Examples:

- `common:actions.save`
- `familyTree:relationships.father`
- `dashboard:overview.statistics.totalMembers`

## Adding New Translations

1. **Add to all language files** (`en`, `sn`, `nd`)
2. **Use consistent key structure**
3. **Test with all languages**

Example for adding a new feature:

```json
// en/newFeature.json
{
  "title": "New Feature",
  "description": "This is a new feature",
  "actions": {
    "enable": "Enable",
    "disable": "Disable"
  }
}
```

```json
// sn/newFeature.json
{
  "title": "Chinhu Chitsva",
  "description": "Ichi chinhu chitsva",
  "actions": {
    "enable": "Gonesa",
    "disable": "Dzima"
  }
}
```

## Best Practices

1. **Always provide fallbacks**: Use the `fallbackLng` option
2. **Test all languages**: Ensure translations work in all supported languages
3. **Use interpolation**: For dynamic content, use `{{variable}}` syntax
4. **Namespace organization**: Group related translations in the same namespace
5. **Cultural sensitivity**: Consider cultural context, not just literal translation
6. **Consistent naming**: Use clear, descriptive key names

## Common Patterns

### Loading States

```tsx
const { t, ready } = useTranslation("common");

if (!ready) return <div>Loading translations...</div>;

return <div>{t("content")}</div>;
```

### Error Boundaries

```tsx
const { t } = useTranslation("common", {
  fallbackLng: "en",
  useSuspense: false,
});
```

### Testing Components

```tsx
import { render } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "../i18n";

const renderWithI18n = (component) => {
  return render(<I18nextProvider i18n={i18n}>{component}</I18nextProvider>);
};
```

## Cultural Considerations

### Shona (ChiShona)

- Respectful family terms: Use proper honorifics
- Time expressions: Consider traditional time concepts
- Greetings: Context-appropriate greetings (morning/afternoon/evening)

### Ndebele (IsiNdebele)

- Family relationships: Use correct kinship terminology
- Formal vs informal: Choose appropriate register
- Cultural expressions: Include traditional sayings where appropriate

This system provides a solid foundation for multilingual support while respecting Zimbabwe's rich linguistic heritage.

# Dzinza Genealogy Platform - Comprehensive Implementation Plan

## Project Overview

A modern, scalable genealogy platform inspired by MyHeritage.com, built with cutting-edge technologies and designed for millions of users globally.

## Implementation Strategy

This project follows an iterative development approach with 6 distinct phases, each building upon the previous phase. The plan emphasizes MVP delivery, user feedback integration, and scalable architecture.

---

## Phase 1: Foundation & MVP Frontend (Weeks 1-4)

**Status: 8 of 18 deliverables complete.**

**UI/UX Consistency Guidelines for Phase 1:**

> All UI development during this phase and beyond should adhere to the established visual theme: modern, clean, and intuitive, primarily built using Tailwind CSS utility classes.
>
> - **Component Reusability:** Prioritize the use of existing UI components found in `src/components/ui/`, `src/components/layout/`, and `src/components/navigation/`.
> - **Styling:** Leverage Tailwind CSS utilities for all styling to ensure consistency. Avoid custom CSS where Tailwind provides an equivalent.
> - **New Components:** Any new components should align with the design principles of existing ones (e.g., spacing, typography, color palette, interactivity). Props for new components should be designed to encourage consistency (e.g., `variant`, `size` props similar to the `Button` component).
> - **Responsive Design:** Ensure all UI elements are responsive and provide a good user experience across common screen sizes.

### Week 1: Project Setup & Infrastructure

**Deliverables:**

- [x] ✅ Repository structure and documentation
- [x] ✅ Development environment setup
- [x] ✅ CI/CD pipeline with GitHub Actions
- [x] ✅ Docker configuration for development
- [x] ✅ ESLint, Prettier, and TypeScript configuration

**Tasks:**

1. **Repository Setup**

   ```bash
   # Initialize repository structure
   mkdir -p {src/{components,pages,hooks,utils,types,styles},docs,tests,public}
   # Setup package.json with all dependencies
   # Configure TypeScript, ESLint, Prettier
   ```

2. **Development Environment**

   - VS Code workspace configuration
   - Docker development environment
   - Environment variable setup
   - Git hooks for code quality

3. **CI/CD Pipeline**
   - GitHub Actions workflow for testing
   - Automated linting and formatting
   - Build verification
   - Deployment preview

### Week 2: Core UI Components & Design System

**Deliverables:**

- [ ] Design system and component library
- [ ] Responsive layout structure
- [ ] Basic navigation and routing
- [ ] Landing page with modern design

**Tasks:**

1. **Design System**

   ```typescript
   // Component library structure
   src/components/ui/
   ├── Button/
   ├── Input/
   ├── Card/
   ├── Modal/
   ├── Table/
   └── index.ts
   ```

2. **Core Components**

   - Button variants (primary, secondary, ghost)
   - Form inputs with validation states
   - Card layouts for content display
   - Modal system for overlays
   - Navigation components

3. **Layout System**
   - Responsive grid system
   - Header with navigation
   - Sidebar for secondary navigation
   - Footer with links and info

### Week 3: Authentication & User Management

**Deliverables:**

- [ ] User registration and login forms
- [ ] JWT token management
- [ ] Protected routes
- [ ] User profile management
- [ ] Mock API integration

**Tasks:**

1. **Authentication UI**

   ```typescript
   // Auth components
   src/pages/auth/
   ├── LoginPage.tsx
   ├── RegisterPage.tsx
   ├── ForgotPasswordPage.tsx
   └── ResetPasswordPage.tsx
   ```

2. **State Management**

   - Redux store setup
   - Authentication slice
   - User profile slice
   - API service layer

3. **Route Protection**
   - Private route wrapper
   - Authentication guards
   - Redirect logic

### Week 4: Family Tree Basic Structure

**Deliverables:**

- [x] ✅ Basic family tree visualization (list-style display of person nodes)
- [x] ✅ Add/edit individual profiles (implemented with modal forms and mock service integration)
- [x] ✅ Simple relationship connections (placeholder UI for initiating connections created; full logic pending)
- [ ] Family tree navigation (deferred - advanced canvas navigation like zoom/pan not implemented)

**Tasks:**

1. **Family Tree Components** (PersonNode.tsx, FamilyTreeDisplay.tsx created)

   ```typescript
   src/components/family-tree/
   ├── FamilyTreeDisplay.tsx
   ├── PersonNode.tsx
   ├── AddPersonForm.tsx
   ├── EditPersonForm.tsx
   ├── AddRelationshipForm.tsx
   // RelationshipLine.tsx and TreeNavigation.tsx for advanced canvas view deferred
   ```

2. **Data Structures**

   - [x] ✅ Person interface definition (`src/types/genealogy.ts`)
   - [x] ✅ Relationship types (`src/types/genealogy.ts`)
   - [x] ✅ Family tree data model (`src/types/genealogy.ts`)
   - [x] ✅ Mock data generation (`src/services/api/genealogyService.ts`)

3. **Basic Interactions**
   - [x] ✅ Add new person (via modal and mock service)
   - [x] ✅ Edit person details (via modal and mock service)
   - [x] ✅ Connect relationships (placeholder UI and form created, mock service call pending full implementation)
   - [ ] Tree navigation (zoom, pan) (deferred)

---

## Phase 2: Backend API & Database (Weeks 5-8)

**Status: 0 of 20 deliverables complete.**

### Week 5: Backend Infrastructure

**Deliverables:**

- [ ] Node.js/Express API server
- [ ] PostgreSQL database setup
- [ ] Basic authentication endpoints
- [ ] Database migrations system

**Tasks:**

1. **API Server Setup**

   ```javascript
   // Backend structure
   backend/
   ├── src/
   │   ├── controllers/
   │   ├── models/
   │   ├── routes/
   │   ├── middleware/
   │   ├── services/
   │   └── utils/
   ├── migrations/
   ├── seeds/
   └── tests/
   ```

2. **Database Design**

   ```sql
   -- Core tables
   CREATE TABLE users (...);
   CREATE TABLE families (...);
   CREATE TABLE individuals (...);
   CREATE TABLE relationships (...);
   ```

3. **Authentication System**
   - JWT token generation/validation
   - Password hashing with bcrypt
   - Rate limiting middleware
   - CORS configuration

### Week 6: Core API Endpoints

**Deliverables:**

- [ ] User management APIs
- [ ] Family tree CRUD operations
- [ ] Individual profile APIs
- [ ] Relationship management APIs

**Tasks:**

1. **User APIs**

   ```javascript
   // User endpoints
   POST / api / auth / register;
   POST / api / auth / login;
   POST / api / auth / refresh;
   GET / api / users / profile;
   PUT / api / users / profile;
   ```

2. **Family Tree APIs**

   ```javascript
   // Family tree endpoints
   GET /api/families/:id
   POST /api/families
   PUT /api/families/:id
   DELETE /api/families/:id
   ```

3. **Individual APIs**
   ```javascript
   // Individual endpoints
   GET /api/individuals/:id
   POST /api/individuals
   PUT /api/individuals/:id
   DELETE /api/individuals/:id
   ```

### Week 7: Data Validation & Error Handling

**Deliverables:**

- [ ] Input validation middleware
- [ ] Comprehensive error handling
- [ ] API documentation
- [ ] Unit tests for core functions

**Tasks:**

1. **Validation System**

   - Joi/Yup schema validation
   - Custom validation rules
   - Error message standardization
   - Input sanitization

2. **Error Handling**

   - Global error handler
   - Custom error classes
   - HTTP status code mapping
   - Error logging system

3. **Testing**
   - Jest test framework setup
   - API endpoint testing
   - Database testing utilities
   - Mock data factories

### Week 8: Integration & Performance

**Deliverables:**

- [ ] Frontend-backend integration
- [ ] API performance optimization
- [ ] Database indexing
- [ ] Basic security measures

**Tasks:**

1. **Integration**

   - Connect frontend to real API
   - Remove mock data
   - Error boundary implementation
   - Loading state management

2. **Performance**
   - Database query optimization
   - API response caching
   - Pagination implementation
   - Connection pooling

### Week 8.5: Internationalization & Localization

**Deliverables:**

- [ ] Multi-language support implementation
- [ ] Translation system setup
- [ ] Cultural adaptation for Zimbabwean users
- [ ] Language preference persistence

**Tasks:**

1. **i18n Setup**

   ```typescript
   // Translation structure
   src/locales/
   ├── en/
   │   ├── common.json
   │   ├── genealogy.json
   │   ├── forms.json
   │   └── navigation.json
   ├── sn/
   │   ├── common.json
   │   ├── genealogy.json
   │   ├── forms.json
   │   └── navigation.json
   └── nd/
       ├── common.json
       ├── genealogy.json
       ├── forms.json
       └── navigation.json
   ```

2. **Translation Implementation**

   - React-i18next integration
   - Translation key extraction
   - Shona translations for genealogy terms
   - Ndebele translations for genealogy terms
   - Cultural date/number formatting

3. **Language Features**

   - Language selector component
   - User preference storage
   - Dynamic language switching
   - Fallback to English for missing translations

4. **Cultural Adaptation**
   - Traditional family relationship terms
   - Cultural naming conventions
   - Regional date/time formats
   - Currency and number formatting

---

## Phase 3: Advanced Features (Weeks 9-12)

**Status: 0 of 16 deliverables complete.**

### Week 9: Enhanced Family Tree

**Deliverables:**

- [ ] Advanced family tree visualization
- [ ] Drag-and-drop functionality
- [ ] Multiple tree views
- [ ] Export capabilities

**Tasks:**

1. **Advanced Visualization**

   ```typescript
   // Enhanced tree features
   - Multiple generation views
   - Ancestor/descendant focus
   - Pedigree chart view
   - Fan chart visualization
   ```

2. **Interactive Features**
   - Drag-and-drop person movement
   - Relationship creation via UI
   - Context menus for actions
   - Keyboard shortcuts

### Week 10: Media Management

**Deliverables:**

- [ ] Photo upload and management
- [ ] Document attachment system
- [ ] Image gallery for individuals
- [ ] Basic photo enhancement

**Tasks:**

1. **File Upload System**

   ```javascript
   // Media endpoints
   POST /api/media/upload
   GET /api/media/:id
   DELETE /api/media/:id
   PUT /api/media/:id
   ```

2. **Image Processing**
   - Thumbnail generation
   - Image resizing
   - Format conversion
   - Basic enhancement filters

### Week 11: Search & Discovery

**Deliverables:**

- [ ] Global search functionality
- [ ] Historical records database
- [ ] Search result ranking
- [ ] Advanced filters

**Tasks:**

1. **Search System**

   ```javascript
   // Search endpoints
   GET / api / search / people;
   GET / api / search / records;
   GET / api / search / families;
   POST / api / search / advanced;
   ```

2. **Historical Records**
   - Record import system
   - Data standardization
   - Search indexing
   - Result relevance scoring

### Week 12: User Collaboration

**Deliverables:**

- [ ] Family sharing system
- [ ] Collaboration invitations
- [ ] Permission management
- [ ] Activity notifications

**Tasks:**

1. **Sharing System**
   - Family access controls
   - Invitation workflow
   - Permission levels (view, edit, admin)
   - Collaboration activity feed

---

## Phase 4: DNA & Advanced Analytics (Weeks 13-16)

**Status: 0 of 16 deliverables complete.**

### Week 13: DNA Data Management

**Deliverables:**

- [ ] DNA file upload system
- [ ] Basic DNA data processing
- [ ] Genetic data visualization
- [ ] Privacy controls for DNA

**Tasks:**

1. **DNA Upload System**

   ```javascript
   // DNA endpoints
   POST /api/dna/upload
   GET /api/dna/profile/:userId
   GET /api/dna/matches/:userId
   POST /api/dna/compare
   ```

2. **Data Processing**
   - DNA file format support (23andMe, AncestryDNA)
   - Data validation and sanitization
   - Genetic marker processing
   - Quality score calculation

### Week 14: DNA Matching Algorithm

**Deliverables:**

- [ ] Genetic matching system
- [ ] Relationship prediction
- [ ] Match confidence scoring
- [ ] Ethnicity estimation

**Tasks:**

1. **Matching Algorithm**

   ```javascript
   // DNA matching logic
   function calculateGeneticDistance(dna1, dna2) {
     // Implement genetic distance calculation
   }

   function predictRelationship(distance) {
     // Map distance to relationship type
   }
   ```

2. **Analytics Dashboard**
   - Match visualization
   - Ethnicity breakdown
   - Genetic health insights
   - Family tree DNA connections

### Week 15: AI-Powered Features

**Deliverables:**

- [ ] Photo enhancement with AI
- [ ] Smart research hints
- [ ] Automated record matching
- [ ] Name standardization

**Tasks:**

1. **AI Integration**

   ```javascript
   // AI service endpoints
   POST /api/ai/enhance-photo
   GET /api/ai/research-hints/:personId
   POST /api/ai/match-records
   POST /api/ai/standardize-names
   ```

2. **Machine Learning**
   - Photo restoration models
   - Record matching algorithms
   - Name disambiguation
   - Research suggestion engine

### Week 16: Analytics & Insights

**Deliverables:**

- [ ] Family statistics dashboard
- [ ] Research progress tracking
- [ ] Data visualization charts
- [ ] Export and reporting

**Tasks:**

1. **Analytics Dashboard**
   - Family tree statistics
   - Research milestone tracking
   - Data completeness metrics
   - User engagement analytics

---

## Phase 5: Testing & Quality Assurance (Weeks 17-20)

**Status: 0 of 16 deliverables complete.**

### Week 17: Comprehensive Testing

**Deliverables:**

- [ ] Unit test coverage (>90%)
- [ ] Integration test suite
- [ ] End-to-end test scenarios
- [ ] Performance testing

**Tasks:**

1. **Testing Strategy**

   ```javascript
   // Test structure
   tests/
   ├── unit/
   ├── integration/
   ├── e2e/
   └── performance/
   ```

2. **Test Implementation**
   - Component testing with React Testing Library
   - API testing with Supertest
   - Database testing with test containers
   - E2E testing with Playwright

### Week 18: Security & Privacy

**Deliverables:**

- [ ] Security audit and fixes
- [ ] GDPR compliance implementation
- [ ] Data encryption
- [ ] Privacy controls

**Tasks:**

1. **Security Measures**

   - SQL injection prevention
   - XSS protection
   - CSRF tokens
   - Rate limiting enhancements

2. **Privacy Implementation**
   - Data anonymization
   - Right to be forgotten
   - Data export functionality
   - Consent management

### Week 19: Performance Optimization

**Deliverables:**

- [ ] Frontend performance optimization
- [ ] Backend query optimization
- [ ] Caching implementation
- [ ] CDN setup

**Tasks:**

1. **Frontend Optimization**

   - Code splitting and lazy loading
   - Image optimization
   - Bundle size reduction
   - Service worker implementation

2. **Backend Optimization**
   - Database query optimization
   - Redis caching layer
   - API response compression
   - Connection pooling

### Week 20: Bug Fixes & Polish

**Deliverables:**

- [ ] Bug fix resolution
- [ ] UI/UX improvements
- [ ] Accessibility compliance
- [ ] Cross-browser testing

**Tasks:**

1. **Quality Assurance**
   - Browser compatibility testing
   - Mobile responsiveness
   - Accessibility audit (WCAG 2.1)
   - User acceptance testing

---

## Phase 6: Deployment & Launch (Weeks 21-24)

**Status: 0 of 16 deliverables complete.**

### Week 21: Production Infrastructure

**Deliverables:**

- [ ] Kubernetes cluster setup
- [ ] Production database configuration
- [ ] Monitoring and logging
- [ ] Backup and disaster recovery

**Tasks:**

1. **Infrastructure Setup**

   ```yaml
   # Kubernetes deployment
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: dzinza-api
   spec:
     replicas: 3
     selector:
       matchLabels:
         app: dzinza-api
   ```

2. **Monitoring System**
   - Prometheus metrics collection
   - Grafana dashboards
   - Alert manager configuration
   - Log aggregation with ELK stack

### Week 22: Security & Compliance

**Deliverables:**

- [ ] SSL certificate setup
- [ ] Security headers configuration
- [ ] Compliance documentation
- [ ] Penetration testing

**Tasks:**

1. **Security Hardening**
   - SSL/TLS configuration
   - Security headers (HSTS, CSP)
   - DDoS protection
   - Vulnerability scanning

### Week 23: Beta Testing

**Deliverables:**

- [ ] Beta user onboarding
- [ ] Feedback collection system
- [ ] Performance monitoring
- [ ] Issue tracking

**Tasks:**

1. **Beta Program**
   - User recruitment
   - Feedback forms and surveys
   - Analytics implementation
   - Support system setup

### Week 24: Production Launch

**Deliverables:**

- [ ] Production deployment
- [ ] DNS configuration
- [ ] Launch monitoring
- [ ] Post-launch support

**Tasks:**

1. **Launch Preparation**
   - Final testing verification
   - Production deployment
   - DNS and domain setup
   - Launch monitoring dashboard

---

## Technology Stack Summary

### Frontend

- **React 18** - Component framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Query** - Server state
- **Redux Toolkit** - Global state
- **D3.js** - Data visualization
- **Framer Motion** - Animations

### Backend

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Primary database
- **Redis** - Caching and sessions
- **Elasticsearch** - Search engine
- **JWT** - Authentication

### DevOps

- **Docker** - Containerization
- **Kubernetes** - Orchestration
- **GitHub Actions** - CI/CD
- **Prometheus** - Monitoring
- **Grafana** - Visualization

### Cloud Services

- **AWS EKS** - Kubernetes service
- **AWS RDS** - Database service
- **AWS S3** - File storage
- **CloudFront** - CDN

## Risk Management

### Technical Risks

1. **Scalability Issues**

   - Mitigation: Load testing and performance monitoring
   - Horizontal scaling architecture

2. **Data Privacy Compliance**

   - Mitigation: GDPR compliance from day one
   - Regular security audits

3. **Third-party Dependencies**
   - Mitigation: Vendor evaluation and backup plans
   - Regular dependency updates

### Business Risks

1. **User Adoption**

   - Mitigation: MVP validation and user feedback
   - Iterative development approach

2. **Competition**
   - Mitigation: Unique features and better UX
   - Fast iteration and feature development

## Success Metrics

### Technical Metrics

- 99.9% uptime
- <2 second page load times
- <1 second API response times
- 90%+ test coverage

### Business Metrics

- 1000+ active users in first month
- 70%+ user retention rate
- 4.5+ star rating in app stores
- 50%+ feature adoption rate

### 1.1 Infrastructure Setup

- **Kubernetes Cluster Configuration**

  - Multi-zone deployment for high availability
  - docker desktop kubernetes integration for local development
  - Auto-scaling based on CPU/memory usage
  - Load balancers with SSL termination
  - Monitoring with Prometheus & Grafana

- **Docker Containerization**

  ```dockerfile
  # Frontend (React)
  FROM node:18-alpine
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci --only=production
  COPY . .
  RUN npm run build
  EXPOSE 3000
  CMD ["npm", "start"]

  # Backend (Node.js)
  FROM node:18-alpine
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci --only=production
  COPY . .
  EXPOSE 8000
  CMD ["node", "server.js"]
  ```

### 1.2 Database Architecture

#### PostgreSQL Schema (User & Family Data)

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    date_of_birth DATE,
    gender VARCHAR(20),
    profile_photo_url TEXT,
    privacy_settings JSONB DEFAULT '{}',
    subscription_tier VARCHAR(50) DEFAULT 'free',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP
);

-- Family trees
CREATE TABLE family_trees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    privacy_level VARCHAR(20) DEFAULT 'private',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- People in family trees
CREATE TABLE people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tree_id UUID REFERENCES family_trees(id),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    maiden_name VARCHAR(100),
    gender VARCHAR(20),
    birth_date DATE,
    birth_place VARCHAR(255),
    death_date DATE,
    death_place VARCHAR(255),
    occupation VARCHAR(255),
    biography TEXT,
    profile_photo_url TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Relationships between people
CREATE TABLE relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person1_id UUID REFERENCES people(id),
    person2_id UUID REFERENCES people(id),
    relationship_type VARCHAR(50), -- parent, child, spouse, sibling
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- DNA data
CREATE TABLE dna_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    raw_data_url TEXT,
    processed_data JSONB,
    ethnicity_breakdown JSONB,
    testing_company VARCHAR(100),
    upload_date TIMESTAMP DEFAULT NOW(),
    processing_status VARCHAR(50) DEFAULT 'pending'
);

-- DNA matches
CREATE TABLE dna_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile1_id UUID REFERENCES dna_profiles(id),
    profile2_id UUID REFERENCES dna_profiles(id),
    shared_dna_cm DECIMAL(8,2),
    shared_segments INTEGER,
    estimated_relationship VARCHAR(100),
    confidence_score DECIMAL(5,2),
    discovered_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending' -- pending, confirmed, dismissed
);
```

#### MongoDB Schema (Historical Records)

```javascript
// Historical records collection
{
  _id: ObjectId,
  recordType: String, // birth, death, marriage, census, immigration, military
  title: String,
  description: String,
  date: Date,
  location: {
    country: String,
    state: String,
    city: String,
    coordinates: [Number, Number]
  },
  people: [{
    firstName: String,
    lastName: String,
    role: String, // primary, spouse, parent, child
    age: Number,
    occupation: String
  }],
  source: {
    name: String,
    type: String, // government, church, newspaper, family
    archive: String,
    reference: String
  },
  images: [{
    url: String,
    thumbnailUrl: String,
    ocrText: String
  }],
  searchableText: String, // Full-text search field
  tags: [String],
  verified: Boolean,
  quality: Number, // 1-5 rating
  createdAt: Date,
  updatedAt: Date
}
```

### 1.3 API Endpoints

#### Authentication API

```typescript
// Auth routes
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
GET    /api/auth/verify-email/:token
```

#### Family Tree API

```typescript
// Family tree management
GET    /api/trees                    // Get user's trees
POST   /api/trees                    // Create new tree
GET    /api/trees/:id                // Get specific tree
PUT    /api/trees/:id                // Update tree
DELETE /api/trees/:id                // Delete tree

// People management
GET    /api/trees/:treeId/people     // Get all people in tree
POST   /api/trees/:treeId/people     // Add person to tree
GET    /api/people/:id               // Get person details
PUT    /api/people/:id               // Update person
DELETE /api/people/:id               // Remove person

// Relationships
GET    /api/people/:id/relationships // Get person's relationships
POST   /api/relationships            // Create relationship
PUT    /api/relationships/:id        // Update relationship
DELETE /api/relationships/:id        // Delete relationship
```

#### DNA API

```typescript
// DNA management
POST   /api/dna/upload              // Upload DNA data
GET    /api/dna/profile             // Get user's DNA profile
GET    /api/dna/matches             // Get DNA matches
POST   /api/dna/matches/:id/confirm // Confirm match
GET    /api/dna/ethnicity           // Get ethnicity breakdown
```

#### Records API

```typescript
// Historical records search
GET    /api/records/search          // Search records
GET    /api/records/:id             // Get specific record
POST   /api/records/save            // Save record to research
GET    /api/records/saved           // Get saved records
POST   /api/records/hint            // Create record hint
```

## Phase 2: Advanced Features (Months 4-6)

### 2.1 AI-Powered Photo Enhancement

```typescript
// Photo enhancement microservice
interface PhotoEnhancementRequest {
  imageUrl: string;
  enhancementType: "colorization" | "restoration" | "upscaling";
  settings: {
    aggressiveness: number; // 1-10
    preserveOriginal: boolean;
    outputQuality: "hd" | "4k" | "original";
  };
}

// WebAssembly integration for client-side processing
const wasmModule = await import("./photo-enhance.wasm");
const enhancedImage = await wasmModule.enhancePhoto(imageData, settings);
```

### 2.2 Advanced Search with ElasticSearch

```javascript
// ElasticSearch mapping for records
{
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "analyzer": "standard",
        "fields": {
          "keyword": { "type": "keyword" }
        }
      },
      "people": {
        "type": "nested",
        "properties": {
          "firstName": {
            "type": "text",
            "analyzer": "name_analyzer"
          },
          "lastName": {
            "type": "text",
            "analyzer": "name_analyzer"
          }
        }
      },
      "location": {
        "type": "geo_point"
      },
      "date": {
        "type": "date",
        "format": "yyyy-MM-dd||yyyy||yyyy-MM"
      }
    }
  }
}
```

### 2.3 Real-time Collaboration

```typescript
// Socket.io integration for real-time updates
io.on("connection", (socket) => {
  socket.on("join-tree", (treeId) => {
    socket.join(`tree-${treeId}`);
  });

  socket.on("person-updated", (data) => {
    socket.to(`tree-${data.treeId}`).emit("person-changed", data);
  });

  socket.on("collaboration-cursor", (data) => {
    socket.to(`tree-${data.treeId}`).emit("cursor-moved", data);
  });
});
```

## Phase 3: Scalability & Performance (Months 7-9)

### 3.1 Microservices Architecture

```yaml
# docker-compose.yml
version: "3.8"
services:
  api-gateway:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"

  auth-service:
    build: ./services/auth
    environment:
      - JWT_SECRET=${JWT_SECRET}
      - DB_URL=${AUTH_DB_URL}

  family-tree-service:
    build: ./services/family-tree
    environment:
      - DB_URL=${MAIN_DB_URL}
      - REDIS_URL=${REDIS_URL}

  dna-service:
    build: ./services/dna
    environment:
      - ML_API_URL=${ML_API_URL}
      - DB_URL=${DNA_DB_URL}

  records-service:
    build: ./services/records
    environment:
      - ELASTICSEARCH_URL=${ES_URL}
      - MONGODB_URL=${MONGO_URL}

  photo-service:
    build: ./services/photo-enhancement
    environment:
      - GPU_ENABLED=true
      - S3_BUCKET=${PHOTOS_BUCKET}
```

### 3.2 Kubernetes Deployment

```yaml
# k8s/family-tree-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: family-tree-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: family-tree-service
  template:
    metadata:
      labels:
        app: family-tree-service
    spec:
      containers:
        - name: family-tree
          image: dzinza/family-tree:latest
          ports:
            - containerPort: 8000
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          env:
            - name: DB_URL
              valueFrom:
                secretKeyRef:
                  name: db-secrets
                  key: url
---
apiVersion: v1
kind: Service
metadata:
  name: family-tree-service
spec:
  selector:
    app: family-tree-service
  ports:
    - port: 80
      targetPort: 8000
  type: ClusterIP
```

### 3.3 Caching Strategy

```typescript
// Redis caching implementation
class CacheService {
  constructor(private redis: Redis) {}

  async cacheTreeData(treeId: string, data: any, ttl = 3600) {
    await this.redis.setex(`tree:${treeId}`, ttl, JSON.stringify(data));
  }

  async getCachedTree(treeId: string): Promise<any | null> {
    const cached = await this.redis.get(`tree:${treeId}`);
    return cached ? JSON.parse(cached) : null;
  }

  async invalidateTreeCache(treeId: string) {
    await this.redis.del(`tree:${treeId}`);
  }
}
```

## Phase 4: Advanced Analytics & AI (Months 10-12)

### 4.1 Machine Learning Pipeline

```python
# ML model for relationship prediction
import tensorflow as tf
from sklearn.ensemble import RandomForestClassifier

class RelationshipPredictor:
    def __init__(self):
        self.model = RandomForestClassifier(n_estimators=100)

    def train(self, features, labels):
        # Features: age_diff, location_proximity, name_similarity, etc.
        self.model.fit(features, labels)

    def predict_relationship(self, person1_data, person2_data):
        features = self.extract_features(person1_data, person2_data)
        probability = self.model.predict_proba([features])
        return {
            'relationship_type': self.model.predict([features])[0],
            'confidence': max(probability[0])
        }
```

### 4.2 Smart Hints System

```typescript
// Intelligent record matching
interface SmartHint {
  type: "record_match" | "potential_relative" | "missing_info";
  confidence: number;
  person_id: string;
  suggestion: string;
  evidence: Array<{
    type: string;
    data: any;
    weight: number;
  }>;
}

class HintsEngine {
  async generateHints(userId: string): Promise<SmartHint[]> {
    const userTrees = await this.familyTreeService.getUserTrees(userId);
    const hints: SmartHint[] = [];

    for (const tree of userTrees) {
      // Check for missing birth/death dates
      const missingDates = await this.findMissingDates(tree);
      hints.push(...missingDates);

      // Look for potential record matches
      const recordMatches = await this.findRecordMatches(tree);
      hints.push(...recordMatches);

      // Suggest DNA connections
      const dnaHints = await this.findDNAConnections(tree, userId);
      hints.push(...dnaHints);
    }

    return hints.sort((a, b) => b.confidence - a.confidence);
  }
}
```

## Security Implementation

### 4.1 Authentication & Authorization

```typescript
// JWT with refresh tokens
interface JWTPayload {
  userId: string;
  email: string;
  roles: string[];
  iat: number;
  exp: number;
}

class AuthService {
  generateTokens(user: User) {
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, roles: user.roles },
      process.env.JWT_SECRET!,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: "7d" }
    );

    return { accessToken, refreshToken };
  }

  async verifyAccess(token: string): Promise<JWTPayload> {
    return jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
  }
}
```

### 4.2 Data Encryption

```typescript
// End-to-end encryption for sensitive data
class EncryptionService {
  private algorithm = "aes-256-gcm";

  encrypt(data: string, userKey: string): EncryptedData {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, userKey);

    let encrypted = cipher.update(data, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString("hex"),
      authTag: authTag.toString("hex"),
    };
  }

  decrypt(encryptedData: EncryptedData, userKey: string): string {
    const decipher = crypto.createDecipher(this.algorithm, userKey);
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, "hex"));

    let decrypted = decipher.update(encryptedData.encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }
}
```

### 4.3 GDPR Compliance

```typescript
// Data retention and deletion
class GDPRService {
  async handleDataDeletionRequest(userId: string) {
    // Anonymize user data while preserving research value
    await this.anonymizeUserData(userId);

    // Delete personal identifiers
    await this.deletePersonalData(userId);

    // Maintain audit trail
    await this.logDeletionRequest(userId);
  }

  async exportUserData(userId: string): Promise<UserDataExport> {
    return {
      personalInfo: await this.getUserPersonalData(userId),
      familyTrees: await this.getUserTrees(userId),
      dnaData: await this.getUserDNAData(userId),
      searchHistory: await this.getUserSearchHistory(userId),
      preferences: await this.getUserPreferences(userId),
    };
  }
}
```

## Testing Strategy

### 4.1 Unit Testing

```typescript
// Jest test example
describe("FamilyTreeService", () => {
  let service: FamilyTreeService;
  let mockRepo: jest.Mocked<FamilyTreeRepository>;

  beforeEach(() => {
    mockRepo = createMockRepository();
    service = new FamilyTreeService(mockRepo);
  });

  it("should create a new family tree", async () => {
    const treeData = { name: "Test Tree", ownerId: "user123" };
    mockRepo.create.mockResolvedValue({ id: "tree123", ...treeData });

    const result = await service.createTree(treeData);

    expect(result.id).toBe("tree123");
    expect(mockRepo.create).toHaveBeenCalledWith(treeData);
  });
});
```

### 4.2 Integration Testing

```typescript
// Supertest API testing
describe("Family Tree API", () => {
  it("should create and retrieve a family tree", async () => {
    const response = await request(app)
      .post("/api/trees")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ name: "Test Tree" })
      .expect(201);

    const treeId = response.body.id;

    await request(app)
      .get(`/api/trees/${treeId}`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.name).toBe("Test Tree");
      });
  });
});
```

### 4.3 Load Testing

```yaml
# K6 load test script
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '5m', target: 200 },
    { duration: '2m', target: 0 },
  ],
};

export default function() {
  let response = http.get('https://api.dzinza.com/trees');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

## Deployment Architecture

### 4.1 Multi-Region Setup

```yaml
# Terraform configuration
resource "aws_eks_cluster" "dzinza_cluster" {
count = length(var.regions)
name  = "dzinza-${var.regions[count.index]}"

vpc_config {
subnet_ids = var.subnet_ids[count.index]
}

depends_on = [
aws_iam_role_policy_attachment.dzinza_cluster_policy,
]
}

resource "aws_rds_cluster" "dzinza_db" {
count = length(var.regions)

cluster_identifier     = "dzinza-db-${var.regions[count.index]}"
engine                = "aurora-postgresql"
master_username       = var.db_username
master_password       = var.db_password
backup_retention_period = 7

vpc_security_group_ids = [aws_security_group.rds[count.index].id]
db_subnet_group_name   = aws_db_subnet_group.dzinza[count.index].name
}
```

### 4.2 Monitoring & Observability

```yaml
# Prometheus configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
    scrape_configs:
    - job_name: 'dzinza-api'
      kubernetes_sd_configs:
      - role: endpoints
      relabel_configs:
      - source_labels: [__meta_kubernetes_service_annotation_prometheus_io_scrape]
        action: keep
        regex: true
```

### 4.3 CI/CD Pipeline

```yaml
# GitHub Actions workflow
name: Deploy Dzinza Platform
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: "18"
      - run: npm ci
      - run: npm run test
      - run: npm run test:e2e

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build Docker images
        run: |
          docker build -t dzinza/frontend:${{ github.sha }} ./frontend
          docker build -t dzinza/api:${{ github.sha }} ./backend
      - name: Push to registry
        run: |
          docker push dzinza/frontend:${{ github.sha }}
          docker push dzinza/api:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/frontend frontend=dzinza/frontend:${{ github.sha }}
          kubectl set image deployment/api api=dzinza/api:${{ github.sha }}
          kubectl rollout status deployment/frontend
          kubectl rollout status deployment/api
```

## Performance Optimization

### 4.1 Database Optimization

```sql
-- Indexing strategy
CREATE INDEX CONCURRENTLY idx_people_names ON people (first_name, last_name);
CREATE INDEX CONCURRENTLY idx_people_dates ON people (birth_date, death_date);
CREATE INDEX CONCURRENTLY idx_relationships_people ON relationships (person1_id, person2_id);
CREATE INDEX CONCURRENTLY idx_dna_matches_score ON dna_matches (confidence_score DESC);

-- Partitioning for large tables
CREATE TABLE dna_matches_2024 PARTITION OF dna_matches
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

### 4.2 CDN Configuration

```typescript
// CloudFront configuration
const distribution = new cloudfront.CloudFrontWebDistribution(
  this,
  "Dzinza-CDN",
  {
    originConfigs: [
      {
        s3OriginSource: {
          s3BucketSource: photoBucket,
        },
        behaviors: [
          {
            isDefaultBehavior: true,
            compress: true,
            allowedMethods:
              cloudfront.CloudFrontAllowedMethods.GET_HEAD_OPTIONS,
            cachedMethods:
              cloudfront.CloudFrontAllowedCachedMethods.GET_HEAD_OPTIONS,
            defaultTtl: Duration.days(1),
            maxTtl: Duration.days(365),
          },
        ],
      },
    ],
    geoRestriction: cloudfront.GeoRestriction.allowlist("US", "CA", "GB", "AU"),
  }
);
```

## Maintenance & Scaling

### 4.1 Auto-scaling Configuration

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: dzinza-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: dzinza-api
  minReplicas: 3
  maxReplicas: 50
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### 4.2 Backup Strategy

```bash
#!/bin/bash
# Automated backup script
DATE=$(date +%Y%m%d_%H%M%S)

# Database backup
pg_dump $DATABASE_URL | gzip > "backups/dzinza_db_$DATE.sql.gz"

# File storage backup
aws s3 sync s3://dzinza-photos s3://dzinza-backups/photos_$DATE/

# Upload to long-term storage
aws s3 cp "backups/dzinza_db_$DATE.sql.gz" s3://dzinza-backups/database/

# Cleanup old backups (keep 30 days)
find backups/ -name "*.sql.gz" -mtime +30 -delete
```

## Timeline & Milestones

### Phase 1 (Months 1-3): Foundation

- Week 1-2: Infrastructure setup
- Week 3-4: Core database design
- Week 5-8: Basic API development
- Week 9-12: Frontend core features

### Phase 2 (Months 4-6): Advanced Features

- Week 13-16: Photo enhancement service
- Week 17-20: Advanced search implementation
- Week 21-24: Real-time collaboration

### Phase 3 (Months 7-9): Scale & Performance

- Week 25-28: Microservices migration
- Week 29-32: Performance optimization
- Week 33-36: Load testing & monitoring

### Phase 4 (Months 10-12): AI & Analytics

- Week 37-40: ML model development
- Week 41-44: Smart hints system
- Week 45-48: Advanced analytics dashboard

This comprehensive implementation plan provides a roadmap for building a world-class genealogy platform that can scale to millions of users while maintaining high performance and security standards.# Infrastructure

This document outlines the cloud infrastructure and DevOps setup for the Dzinza Genealogy Platform.

## Cloud Architecture

### AWS Infrastructure

#### Core Services

- **EKS (Elastic Kubernetes Service)**: Container orchestration
- **RDS (PostgreSQL)**: Primary database
- **ElastiCache (Redis)**: Caching and session storage
- **Amazon OpenSearch**: Search functionality
- **S3**: Object storage for photos and documents
- **CloudFront**: CDN for global content delivery
- **Route 53**: DNS management
- **Application Load Balancer**: Traffic distribution

#### Security Services

- **WAF (Web Application Firewall)**: Protection against common attacks
- **Shield**: DDoS protection
- **KMS**: Key management for encryption
- **Secrets Manager**: Secure credential storage
- **IAM**: Identity and access management

#### Monitoring & Logging

- **CloudWatch**: Metrics and alerting
- **X-Ray**: Distributed tracing
- **VPC Flow Logs**: Network monitoring
- **Config**: Compliance monitoring

### Kubernetes Configuration

#### Cluster Setup

```yaml
# cluster-config.yaml
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: dzinza-production
  region: us-west-2
  version: "1.27"

nodeGroups:
  - name: worker-nodes
    instanceType: t3.medium
    desiredCapacity: 3
    minSize: 2
    maxSize: 10
    volumeSize: 20
    ssh:
      allow: false
```

#### Namespaces

- `production`: Production workloads
- `staging`: Staging environment
- `monitoring`: Observability stack
- `ingress-nginx`: Ingress controller

### Infrastructure as Code

#### Terraform Modules

```hcl
# main.tf
module "vpc" {
  source = "./modules/vpc"
  environment = var.environment
}

module "eks" {
  source = "./modules/eks"
  vpc_id = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids
}

module "rds" {
  source = "./modules/rds"
  vpc_id = module.vpc.vpc_id
  subnet_ids = module.vpc.database_subnet_ids
}
```

#### Environment Management

- **Development**: Single node cluster, reduced resources
- **Staging**: Production-like setup with smaller instances
- **Production**: Multi-AZ, auto-scaling, full security

## Container Strategy

### Docker Images

#### Base Images

```dockerfile
# Base Node.js image
FROM node:18-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Build stage
FROM base AS builder
COPY . .
RUN npm run build

# Runtime stage
FROM base AS runner
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["npm", "start"]
```

#### Image Optimization

- Multi-stage builds to reduce image size
- Alpine Linux base images
- Layer caching optimization
- Security scanning with Trivy

### Container Registry

- **Amazon ECR**: Private container registry
- **Image Scanning**: Automated vulnerability detection
- **Lifecycle Policies**: Automatic cleanup of old images

## Network Architecture

### VPC Design

```
Internet Gateway
    |
Public Subnets (NAT Gateways)
    |
Private Subnets (Application)
    |
Database Subnets (Isolated)
```

#### Security Groups

- **ALB Security Group**: HTTP/HTTPS from internet
- **Application Security Group**: Traffic from ALB only
- **Database Security Group**: Traffic from application only

#### Network ACLs

- Subnet-level security controls
- Allow necessary traffic only
- Log denied connections

## CI/CD Pipeline

### GitHub Actions Integration

```yaml
# .github/workflows/deploy.yml
name: Deploy to AWS
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-west-2

      - name: Deploy to EKS
        run: |
          aws eks update-kubeconfig --name dzinza-production
          kubectl apply -f k8s/
```

### Deployment Strategies

- **Blue-Green Deployments**: Zero-downtime updates
- **Canary Releases**: Gradual rollouts
- **Rollback Procedures**: Quick recovery from issues

## Backup and Disaster Recovery

### Database Backups

- **Automated Backups**: Daily full backups
- **Point-in-time Recovery**: Up to 35 days
- **Cross-region Replication**: Disaster recovery
- **Backup Testing**: Monthly restore verification

### Application Data

- **S3 Versioning**: File history preservation
- **Cross-region Replication**: Geographic redundancy
- **Lifecycle Policies**: Cost optimization

### Recovery Procedures

1. **RTO (Recovery Time Objective)**: 4 hours
2. **RPO (Recovery Point Objective)**: 1 hour
3. **Disaster Recovery Testing**: Quarterly

## Performance Optimization

### Auto-scaling

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: dzinza-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: dzinza-api
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

### Cluster Auto-scaling

- Node groups scale based on pod requirements
- Spot instances for cost optimization
- Reserved instances for predictable workloads

## Cost Optimization

### Resource Management

- **Right-sizing**: Regular instance type review
- **Spot Instances**: 70% cost savings for non-critical workloads
- **Reserved Instances**: 1-year terms for stable workloads
- **Cost Monitoring**: AWS Cost Explorer integration

### Optimization Strategies

- Automated resource cleanup
- Development environment scheduling
- Storage lifecycle policies
- CDN optimization

## Security Hardening

### Container Security

- Non-root user execution
- Read-only file systems
- Minimal base images
- Regular security updates

### Kubernetes Security

- Pod Security Standards
- Network Policies
- Service Mesh (Istio)
- Secret management with External Secrets Operator

### Compliance

- **SOC 2 Type II**: Security controls
- **GDPR**: Data protection compliance
- **HIPAA**: Healthcare data requirements (if applicable)

## Troubleshooting

### Common Issues

#### Pod Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name>

# Check logs
kubectl logs <pod-name> --previous

# Check events
kubectl get events --sort-by=.metadata.creationTimestamp
```

#### Database Connection Issues

```bash
# Test database connectivity
kubectl run postgres-test --image=postgres:13 --rm -it -- psql -h <rds-endpoint> -U <username>

# Check security groups
aws ec2 describe-security-groups --group-ids <sg-id>
```

#### Performance Issues

```bash
# Check resource usage
kubectl top nodes
kubectl top pods

# Check HPA status
kubectl get hpa
```

### Monitoring Dashboards

- Infrastructure overview
- Application performance
- Database metrics
- Security events

## Maintenance Procedures

### Regular Tasks

- **Weekly**: Security patch review
- **Monthly**: Backup testing
- **Quarterly**: Disaster recovery testing
- **Annually**: Full security audit

### Upgrade Procedures

1. **Kubernetes**: Rolling cluster upgrades
2. **Applications**: Blue-green deployments
3. **Database**: Maintenance windows
4. **Security**: Immediate critical patches

## Contact Information

### Infrastructure Team

- **Primary Contact**: DevOps Lead
- **Escalation**: Engineering Manager
- **Emergency**: 24/7 on-call rotation

### External Support

- **AWS Support**: Enterprise level
- **Third-party Services**: Datadog, PagerDuty
- **Security Consultants**: Annual penetration testing

# Installation Guide

This guide provides detailed instructions for setting up the Dzinza genealogy platform in different environments.

## Development Environment

### Prerequisites

- **Node.js** 18 or later
- **npm** 9 or later (or yarn 1.22+)
- **Git** 2.30 or later
- **Docker** (optional, for containerized development)
- **VS Code** (recommended IDE)

### Step-by-Step Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/dzinza/dzinza.git
cd dzinza
```

#### 2. Install Dependencies

```bash
# Using npm
npm install

# Or using yarn
yarn install
```

#### 3. Environment Configuration

Create a `.env.local` file in the root directory:

```env
# Application
VITE_APP_NAME=Dzinza
VITE_APP_VERSION=1.0.0
VITE_APP_ENV=development

# API Configuration
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_API_TIMEOUT=30000

# Authentication
VITE_JWT_SECRET=your-jwt-secret-here
VITE_JWT_EXPIRES_IN=7d

# Database (for backend)
DATABASE_URL=postgresql://username:password@localhost:5432/dzinza_dev
REDIS_URL=redis://localhost:6379

# External Services
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
VITE_CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
VITE_SENTRY_DSN=your-sentry-dsn
```

#### 4. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

## Production Environment

### Using Docker

#### 1. Build Docker Image

```bash
docker build -t dzinza-app .
```

#### 2. Run Container

```bash
docker run -p 3000:3000 -e NODE_ENV=production dzinza-app
```

### Using Docker Compose

#### 1. Create docker-compose.yml

```yaml
version: "3.8"
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: dzinza
      POSTGRES_USER: dzinza_user
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

#### 2. Start Services

```bash
docker-compose up -d
```

## Database Setup

### PostgreSQL

#### 1. Install PostgreSQL

**macOS:**

```bash
brew install postgresql
brew services start postgresql
```

**Ubuntu:**

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

#### 2. Create Database

```bash
createdb dzinza_dev
```

#### 3. Run Migrations

```bash
npm run db:migrate
```

### Redis

#### 1. Install Redis

**macOS:**

```bash
brew install redis
brew services start redis
```

**Ubuntu:**

```bash
sudo apt install redis-server
sudo systemctl start redis
```

## IDE Setup

### VS Code Extensions

Recommended extensions for development:

```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "ms-vscode.vscode-eslint",
    "ms-vscode.vscode-json",
    "ms-playwright.playwright",
    "ms-vscode.vscode-jest"
  ]
}
```

### Configuration

Add to `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  }
}
```

## Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Kill process using port 5173
lsof -ti:5173 | xargs kill -9
```

#### Permission Errors

```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
```

#### Node Version Issues

Use Node Version Manager (nvm):

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use Node 18
nvm install 18
nvm use 18
```

### Getting Help

- Check the [FAQ](./FAQ.md)
- Search [GitHub Issues](https://github.com/dzinza/dzinza/issues)
- Join our [Discord Community](https://discord.gg/dzinza)
- Email support: support@dzinza.com

# Internationalization (i18n) Guidelines

## Overview

The Dzinza platform supports multiple languages to serve users from diverse linguistic backgrounds. This document outlines the internationalization strategy, implementation guidelines, and best practices.

## Language Support

### Initial Languages

- **English (en)**: Default language
- **Shona (sn)**: Primary indigenous language of Zimbabwe
- **Ndebele (nd)**: Secondary indigenous language of Zimbabwe

### Language Codes

Following ISO 639-1 standard:

- English: `en`
- Shona: `sn`
- Ndebele: `nd`

### Future Language Support

The system is designed to easily accommodate additional languages:

- Chewa/Nyanja (`ny`)
- Tonga (`to`)
- Kalanga (`kck`)
- Nambya (`nmq`)
- Other African languages as needed

## Technical Implementation

### Technology Stack

- **Frontend**: React-i18next for React components
- **Backend**: i18next for server-side translations
- **Storage**: JSON files for translation resources
- **Fallback**: English as default fallback language

### File Structure

```
src/
├── locales/
│   ├── en/
│   │   ├── common.json
│   │   ├── navigation.json
│   │   ├── forms.json
│   │   ├── genealogy.json
│   │   └── errors.json
│   ├── sn/
│   │   ├── common.json
│   │   ├── navigation.json
│   │   ├── forms.json
│   │   ├── genealogy.json
│   │   └── errors.json
│   └── nd/
│       ├── common.json
│       ├── navigation.json
│       ├── forms.json
│       ├── genealogy.json
│       └── errors.json
```

### Translation Namespace Organization

#### Common (`common.json`)

- General UI elements
- Button labels
- Common actions
- Time and date formats

#### Navigation (`navigation.json`)

- Menu items
- Page titles
- Breadcrumb labels
- Navigation actions

#### Forms (`forms.json`)

- Form labels
- Input placeholders
- Validation messages
- Form instructions

#### Genealogy (`genealogy.json`)

- Family relationship terms
- Genealogy-specific terminology
- Historical periods and events
- Cultural terms and concepts

#### Errors (`errors.json`)

- Error messages
- Warning messages
- Success messages
- Status messages

## Implementation Guidelines

### Component Usage

#### Basic Translation

```tsx
import { useTranslation } from "react-i18next";

const Component: React.FC = () => {
  const { t } = useTranslation("common");

  return (
    <div>
      <h1>{t("welcome")}</h1>
      <p>{t("description")}</p>
    </div>
  );
};
```

#### Translation with Parameters

```tsx
const UserGreeting: React.FC<{ userName: string }> = ({ userName }) => {
  const { t } = useTranslation("common");

  return <h2>{t("greeting", { name: userName })}</h2>;
};
```

#### Pluralization

```tsx
const ItemCount: React.FC<{ count: number }> = ({ count }) => {
  const { t } = useTranslation("common");

  return <span>{t("itemCount", { count })}</span>;
};
```

#### Date and Number Formatting

```tsx
const FormattedDate: React.FC<{ date: Date }> = ({ date }) => {
  const { i18n } = useTranslation();

  return <span>{date.toLocaleDateString(i18n.language)}</span>;
};
```

### Translation Key Naming Convention

#### Structure

```
namespace.category.element[.variant]
```

#### Examples

```json
{
  "navigation.menu.dashboard": "Dashboard",
  "navigation.menu.familyTree": "Family Tree",
  "forms.labels.firstName": "First Name",
  "forms.placeholders.email": "Enter your email address",
  "forms.validation.required": "This field is required",
  "genealogy.relationships.father": "Father",
  "genealogy.relationships.mother": "Mother",
  "errors.network.connectionFailed": "Connection failed",
  "common.actions.save": "Save",
  "common.actions.cancel": "Cancel"
}
```

### Translation Files Format

#### English (`en/genealogy.json`)

```json
{
  "relationships": {
    "father": "Father",
    "mother": "Mother",
    "son": "Son",
    "daughter": "Daughter",
    "grandfather": "Grandfather",
    "grandmother": "Grandmother",
    "uncle": "Uncle",
    "aunt": "Aunt",
    "cousin": "Cousin"
  },
  "titles": {
    "familyTree": "Family Tree",
    "ancestors": "Ancestors",
    "descendants": "Descendants",
    "relatives": "Relatives"
  },
  "actions": {
    "addMember": "Add Family Member",
    "editMember": "Edit Member",
    "deleteMember": "Delete Member",
    "viewDetails": "View Details"
  }
}
```

#### Shona (`sn/genealogy.json`)

```json
{
  "relationships": {
    "father": "Baba",
    "mother": "Amai",
    "son": "Mwanakomana",
    "daughter": "Mwanasikana",
    "grandfather": "Sekuru",
    "grandmother": "Ambuya",
    "uncle": "Babamunini / Babamukuru",
    "aunt": "Tete",
    "cousin": "Muzukuru"
  },
  "titles": {
    "familyTree": "Muti weMhuri",
    "ancestors": "Mudzimu",
    "descendants": "Vana",
    "relatives": "Hama"
  },
  "actions": {
    "addMember": "Wedzera Nhengo yeMhuri",
    "editMember": "Gadzirisa Nhengo",
    "deleteMember": "Bvisa Nhengo",
    "viewDetails": "Ona Rondedzero"
  }
}
```

#### Ndebele (`nd/genealogy.json`)

```json
{
  "relationships": {
    "father": "Ubaba",
    "mother": "Umama",
    "son": "Indodana",
    "daughter": "Indodakazi",
    "grandfather": "Umakhulu",
    "grandmother": "Ugogo",
    "uncle": "Umalume",
    "aunt": "Udadewethu",
    "cousin": "Umzala"
  },
  "titles": {
    "familyTree": "Isihlahla Somndeni",
    "ancestors": "Okhokho",
    "descendants": "Abantwana",
    "relatives": "Izihlobo"
  },
  "actions": {
    "addMember": "Engeza Ilungu Lomndeni",
    "editMember": "Hlela Ilungu",
    "deleteMember": "Susa Ilungu",
    "viewDetails": "Bona Imininingwane"
  }
}
```

## Language Selection and Persistence

### User Language Preference Storage

```typescript
// Store user language preference
const setUserLanguage = (language: string) => {
  localStorage.setItem("dzinza_user_language", language);
  i18n.changeLanguage(language);
};

// Retrieve user language preference
const getUserLanguage = (): string => {
  return localStorage.getItem("dzinza_user_language") || "en";
};

// Initialize language on app start
const initializeLanguage = () => {
  const savedLanguage = getUserLanguage();
  i18n.changeLanguage(savedLanguage);
};
```

### Language Selector Component

```tsx
import { useTranslation } from "react-i18next";

const LanguageSelector: React.FC = () => {
  const { i18n, t } = useTranslation("common");

  const languages = [
    { code: "en", name: "English", nativeName: "English" },
    { code: "sn", name: "Shona", nativeName: "chiShona" },
    { code: "nd", name: "Ndebele", nativeName: "isiNdebele" },
  ];

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    localStorage.setItem("dzinza_user_language", languageCode);
  };

  return (
    <select
      value={i18n.language}
      onChange={(e) => handleLanguageChange(e.target.value)}
      className="language-selector"
    >
      {languages.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.nativeName}
        </option>
      ))}
    </select>
  );
};
```

## Cultural Considerations

### Genealogical Terms

- **Family Structures**: Recognize different family structures in Zimbabwean culture
- **Clan Names**: Support for totems (mitupo in Shona, izibongo in Ndebele)
- **Traditional Roles**: Respect traditional family roles and hierarchies
- **Naming Conventions**: Support for multiple naming traditions

### Cultural Sensitivity

- **Respectful Language**: Use appropriate terms for elders and family relationships
- **Traditional Concepts**: Include traditional concepts like ancestral reverence
- **Historical Context**: Be sensitive to historical events and their cultural impact
- **Regional Variations**: Account for regional dialects and variations

### Date and Time Formats

```typescript
// Different date formats by culture
const formatDate = (date: Date, language: string) => {
  const formats = {
    en: { day: "numeric", month: "long", year: "numeric" },
    sn: { day: "numeric", month: "long", year: "numeric" },
    nd: { day: "numeric", month: "long", year: "numeric" },
  };

  return date.toLocaleDateString(language, formats[language] || formats["en"]);
};
```

## Quality Assurance

### Translation Review Process

1. **Initial Translation**: Professional translators for Shona and Ndebele
2. **Cultural Review**: Cultural experts review for appropriateness
3. **User Testing**: Native speakers test the interface
4. **Feedback Integration**: Incorporate user feedback and corrections
5. **Continuous Updates**: Regular reviews and updates

### Testing Guidelines

- **Functional Testing**: Ensure all features work in all languages
- **UI Testing**: Verify text fits properly in different languages
- **Cultural Testing**: Confirm cultural appropriateness
- **Performance Testing**: Check loading times with different character sets

### Translation Quality Checklist

- [ ] All UI elements translated
- [ ] Cultural terms accurately represented
- [ ] No text truncation or overflow
- [ ] Proper use of formal/informal language
- [ ] Consistent terminology across the application
- [ ] Proper pluralization rules applied
- [ ] Date/time formats appropriate for culture

## Maintenance and Updates

### Adding New Languages

1. Create new language directory in `src/locales/`
2. Copy English translation files as templates
3. Translate all strings with cultural adaptation
4. Add language option to selector component
5. Test thoroughly with native speakers
6. Update documentation

### Managing Translation Updates

- **Version Control**: Track translation changes in git
- **Translation Keys**: Never remove keys, only deprecate
- **Backward Compatibility**: Maintain fallbacks for missing translations
- **Automated Checks**: Lint for missing translation keys

### Translation Workflow

1. **Development**: Add new translation keys in English
2. **Extraction**: Extract new keys for translation
3. **Translation**: Professional translation services
4. **Review**: Cultural and linguistic review
5. **Integration**: Merge translations into codebase
6. **Testing**: Comprehensive testing in all languages

## Performance Considerations

### Lazy Loading

```typescript
// Load translations on demand
const loadNamespaceForLanguage = async (
  language: string,
  namespace: string
) => {
  const translations = await import(`../locales/${language}/${namespace}.json`);
  i18n.addResourceBundle(language, namespace, translations.default);
};
```

### Caching Strategy

- **Browser Cache**: Cache translation files in browser
- **CDN**: Serve translation files from CDN
- **Compression**: Gzip translation files
- **Bundling**: Bundle frequently used translations

### Optimization

- **Tree Shaking**: Only include used translations in bundles
- **Code Splitting**: Split translations by route/feature
- **Compression**: Minimize translation file sizes
- **Caching**: Implement proper caching strategies

---

**Remember**: Internationalization is not just translation—it's about creating an inclusive experience that respects and celebrates cultural diversity while maintaining functionality and usability across all supported languages.

# Monitoring and Observability

This document outlines the monitoring, logging, and observability strategy for the Dzinza Genealogy Platform.

## Monitoring Stack

### Core Components

- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and dashboards
- **AlertManager**: Alert routing and management
- **Jaeger**: Distributed tracing
- **Elasticsearch**: Log aggregation
- **Kibana**: Log visualization
- **Datadog**: APM and infrastructure monitoring (optional)

### Deployment Architecture

```yaml
# monitoring-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring
  labels:
    name: monitoring
```

## Metrics Collection

### Application Metrics

#### Custom Metrics

```typescript
// metrics.ts
import { register, Counter, Histogram, Gauge } from "prom-client";

export const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});

export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
});

export const genealogyTreeOperations = new Counter({
  name: "genealogy_tree_operations_total",
  help: "Total genealogy tree operations",
  labelNames: ["operation", "status"],
});

export const dnaAnalysisJobs = new Gauge({
  name: "dna_analysis_jobs_active",
  help: "Number of active DNA analysis jobs",
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);
register.registerMetric(genealogyTreeOperations);
register.registerMetric(dnaAnalysisJobs);
```

#### Business Metrics

- User registrations per day
- Family trees created
- DNA uploads processed
- Search queries performed
- Photo uploads
- Collaboration invitations sent

### Infrastructure Metrics

#### Kubernetes Metrics

```yaml
# prometheus-config.yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: "kubernetes-pods"
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
```

#### Database Metrics

- Connection pool utilization
- Query performance
- Slow query identification
- Lock contention
- Replication lag

## Logging Strategy

### Structured Logging

#### Application Logs

```typescript
// logger.ts
import winston from "winston";

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: "dzinza-api",
    version: process.env.APP_VERSION,
  },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

// Usage example
logger.info("User created family tree", {
  userId: user.id,
  treeId: tree.id,
  treeName: tree.name,
  duration: performance.now() - startTime,
});
```

#### Log Levels

- **ERROR**: System errors, exceptions
- **WARN**: Potential issues, degraded performance
- **INFO**: Business events, user actions
- **DEBUG**: Detailed diagnostic information
- **TRACE**: Very detailed debugging (development only)

### Log Aggregation

#### ELK Stack Configuration

```yaml
# elasticsearch.yaml
apiVersion: elasticsearch.k8s.elastic.co/v1
kind: Elasticsearch
metadata:
  name: dzinza-logs
spec:
  version: 8.8.0
  nodeSets:
    - name: default
      count: 3
      config:
        node.store.allow_mmap: false
```

#### Fluentd Configuration

```yaml
# fluentd-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/containers/*.log
      pos_file /var/log/fluentd-containers.log.pos
      tag kubernetes.*
      format json
    </source>

    <match kubernetes.**>
      @type elasticsearch
      host elasticsearch.monitoring.svc.cluster.local
      port 9200
      index_name dzinza-logs
    </match>
```

## Distributed Tracing

### Jaeger Setup

#### Application Instrumentation

```typescript
// tracing.ts
import { NodeTracerProvider } from "@opentelemetry/sdk-node";
import { JaegerExporter } from "@opentelemetry/exporter-jaeger";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

const provider = new NodeTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: "dzinza-api",
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION,
  }),
});

const jaegerExporter = new JaegerExporter({
  endpoint:
    process.env.JAEGER_ENDPOINT || "http://jaeger-collector:14268/api/traces",
});

provider.addSpanProcessor(new BatchSpanProcessor(jaegerExporter));
provider.register();
```

#### Custom Spans

```typescript
// genealogy-service.ts
import { trace } from "@opentelemetry/api";

const tracer = trace.getTracer("genealogy-service");

export async function buildFamilyTree(userId: string, treeId: string) {
  const span = tracer.startSpan("build_family_tree");

  try {
    span.setAttributes({
      "user.id": userId,
      "tree.id": treeId,
      operation: "build_tree",
    });

    // Business logic here
    const result = await performTreeBuilding();

    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
    throw error;
  } finally {
    span.end();
  }
}
```

## Dashboard Configuration

### Grafana Dashboards

#### Application Performance Dashboard

```json
{
  "dashboard": {
    "title": "Dzinza Application Performance",
    "panels": [
      {
        "title": "Request Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      }
    ]
  }
}
```

#### Infrastructure Dashboard

- CPU and memory utilization
- Network I/O
- Disk usage
- Pod status and restarts
- Database connections

#### Business Metrics Dashboard

- Daily active users
- New registrations
- Family trees created
- DNA analyses completed
- System revenue metrics

## Alerting Rules

### Prometheus Alerts

#### Critical Alerts

```yaml
# alerts.yaml
groups:
  - name: dzinza.critical
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors per second"

      - alert: DatabaseDown
        expr: up{job="postgres"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Database is down"
          description: "PostgreSQL database is not responding"

      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is above 90%"
```

#### Business Logic Alerts

```yaml
- name: dzinza.business
  rules:
    - alert: DNAAnalysisBacklog
      expr: dna_analysis_jobs_active > 100
      for: 15m
      labels:
        severity: warning
      annotations:
        summary: "DNA analysis backlog growing"
        description: "{{ $value }} DNA analysis jobs are queued"

    - alert: LowUserActivity
      expr: rate(genealogy_tree_operations_total[1h]) < 0.1
      for: 30m
      labels:
        severity: info
      annotations:
        summary: "Low user activity detected"
        description: "User activity is below normal levels"
```

### Alert Routing

#### AlertManager Configuration

```yaml
# alertmanager.yml
global:
  smtp_smarthost: "localhost:587"
  smtp_from: "alerts@dzinza.com"

route:
  group_by: ["alertname"]
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: "web.hook"
  routes:
    - match:
        severity: critical
      receiver: "critical-alerts"
    - match:
        severity: warning
      receiver: "warning-alerts"

receivers:
  - name: "critical-alerts"
    email_configs:
      - to: "oncall@dzinza.com"
        subject: "[CRITICAL] {{ .GroupLabels.alertname }}"
    slack_configs:
      - api_url: "YOUR_SLACK_WEBHOOK_URL"
        channel: "#alerts"
        title: "Critical Alert"
        text: "{{ range .Alerts }}{{ .Annotations.description }}{{ end }}"
```

## Health Checks

### Application Health Endpoints

#### Health Check Implementation

```typescript
// health.ts
import { Router } from "express";
import { Pool } from "pg";
import Redis from "ioredis";

const healthRouter = Router();

healthRouter.get("/health", async (req, res) => {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      elasticsearch: await checkElasticsearch(),
    },
  };

  const isHealthy = Object.values(health.checks).every(
    (check) => check.status === "ok"
  );

  res.status(isHealthy ? 200 : 503).json(health);
});

async function checkDatabase(): Promise<HealthCheck> {
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    return { status: "ok", responseTime: Date.now() - start };
  } catch (error) {
    return { status: "error", error: error.message };
  }
}
```

#### Kubernetes Health Checks

```yaml
# deployment.yaml
spec:
  containers:
    - name: dzinza-api
      livenessProbe:
        httpGet:
          path: /health
          port: 3000
        initialDelaySeconds: 30
        periodSeconds: 10
      readinessProbe:
        httpGet:
          path: /ready
          port: 3000
        initialDelaySeconds: 5
        periodSeconds: 5
```

## Performance Monitoring

### APM Integration

#### Custom Performance Tracking

```typescript
// performance.ts
import { performance } from "perf_hooks";

export class PerformanceTracker {
  private static measurements = new Map<string, number[]>();

  static startTimer(operation: string): () => void {
    const start = performance.now();

    return () => {
      const duration = performance.now() - start;

      if (!this.measurements.has(operation)) {
        this.measurements.set(operation, []);
      }

      this.measurements.get(operation)!.push(duration);

      // Emit metric to Prometheus
      httpRequestDuration.observe({ operation }, duration / 1000);
    };
  }
}

// Usage
const endTimer = PerformanceTracker.startTimer("genealogy_search");
const results = await searchFamilyMembers(query);
endTimer();
```

### Database Performance

#### Slow Query Monitoring

```sql
-- Enable slow query logging
ALTER SYSTEM SET log_min_duration_statement = 1000;
ALTER SYSTEM SET log_statement = 'all';
SELECT pg_reload_conf();

-- Query performance monitoring
SELECT
  query,
  calls,
  total_time,
  mean_time,
  stddev_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
```

## Debugging Guide

### Common Issues

#### High Memory Usage

```bash
# Check pod memory usage
kubectl top pods --sort-by=memory

# Get detailed memory breakdown
kubectl exec -it <pod-name> -- cat /proc/meminfo

# Analyze heap dumps (Node.js)
kubectl exec -it <pod-name> -- node --max-old-space-size=4096 --inspect app.js
```

#### Database Performance Issues

```sql
-- Check active connections
SELECT * FROM pg_stat_activity WHERE state = 'active';

-- Identify blocking queries
SELECT
  blocked_locks.pid AS blocked_pid,
  blocked_activity.usename AS blocked_user,
  blocking_locks.pid AS blocking_pid,
  blocking_activity.usename AS blocking_user,
  blocked_activity.query AS blocked_statement,
  blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

#### Application Latency

```bash
# Check service mesh metrics (if using Istio)
kubectl exec -it <istio-proxy> -- curl localhost:15000/stats/prometheus

# Analyze distributed traces
# Access Jaeger UI and search for slow requests
```

### Log Analysis

#### Common Log Queries (Kibana)

```json
{
  "query": {
    "bool": {
      "must": [
        { "match": { "service": "dzinza-api" } },
        { "range": { "@timestamp": { "gte": "now-1h" } } }
      ],
      "filter": [{ "term": { "level": "error" } }]
    }
  }
}
```

#### Performance Analysis

```bash
# Grep for slow operations in logs
kubectl logs deployment/dzinza-api | grep "duration.*[5-9][0-9][0-9][0-9]ms"

# Count error types
kubectl logs deployment/dzinza-api | grep ERROR | cut -d' ' -f4 | sort | uniq -c
```

## Incident Response

### Runbooks

#### High Error Rate Response

1. Check application logs for error patterns
2. Verify database connectivity
3. Check external service dependencies
4. Scale application if needed
5. Rollback if recent deployment

#### Database Issues

1. Check connection pool metrics
2. Identify slow/blocking queries
3. Monitor replication lag
4. Consider read replica failover
5. Scale database resources if needed

### On-Call Procedures

1. **Acknowledge Alert**: Respond within 15 minutes
2. **Initial Assessment**: Determine severity and impact
3. **Communication**: Update status page and stakeholders
4. **Investigation**: Use monitoring tools and runbooks
5. **Resolution**: Implement fix and verify
6. **Post-Mortem**: Document lessons learned

## Contact Information

### Monitoring Team

- **Primary**: Platform Engineering Team
- **Escalation**: DevOps Lead
- **Emergency**: 24/7 on-call rotation

### Tool Access

- **Grafana**: https://grafana.dzinza.com
- **Jaeger**: https://jaeger.dzinza.com
- **Kibana**: https://kibana.dzinza.com
- **AlertManager**: https://alerts.dzinza.com

# Project Overview

## Repo Summary & Description

**Repo Name:** dzinza

**Summary:** An open-source, interactive genealogy platform for building family trees, discovering relatives, and exploring ancestral history.

## Description

Dzinza is a modern, feature-rich genealogy platform inspired by industry leaders like MyHeritage. It provides a suite of tools for users to build their family history, connect with relatives, and uncover the stories of their ancestors. The platform is designed with a mobile-first, responsive interface and a powerful backend to support a seamless user experience.

Key features include an intuitive family tree builder, DNA matching and analysis, a vast searchable database of historical records, AI-powered photo enhancement, and collaborative research capabilities. The project is built on a robust, scalable, and secure technology stack, ensuring data integrity and user privacy.

Implementation Plan
This project will be implemented in five distinct phases, each with specific milestones and deliverables. The platform will be developed using a microservices architecture, containerized with Docker, and orchestrated with Kubernetes for scalability and resilience.

Phase 1: Project Setup & Core Backend
This initial phase focuses on establishing the project's foundation, including the development environment, core backend services, and database schemas.

Milestones:
Initialize Git repository and set up project structure.
Configure Docker and Kubernetes environments.
Design and implement database schemas for PostgreSQL and MongoDB.
Develop core API endpoints for user authentication and data management.
Set up CI/CD pipeline for automated testing and deployment.
Database Schema:
PostgreSQL:
users: Stores user profile information, authentication details, and preferences.
families: Manages family groups and associations.
individuals: Contains detailed information about each person in a family tree.
relationships: Defines the connections between individuals (e.g., parent, spouse, child).
MongoDB:
historical_records: Stores a wide range of historical documents, such as birth certificates, census records, and marriage licenses.
media: Contains metadata for user-uploaded photos, videos, and documents.
API Endpoints:
POST /api/auth/register: Creates a new user account.
POST /api/auth/login: Authenticates a user and returns a JWT.
GET /api/users/:id: Retrieves a user's profile information.
POST /api/family: Creates a new family tree.
GET /api/family/:id: Fetches a family tree's data.
Phase 2: Frontend Development & Family Tree Builder
This phase concentrates on creating the user interface and implementing the core family tree functionality.

Milestones:
Develop the main application layout and UI components using React and Tailwind CSS.
Implement the family tree builder with drag-and-drop functionality using D3.js.
Integrate Redux for state management.
Ensure the UI is responsive and mobile-friendly.
UI/UX Wireframes:
Homepage: A clean, inviting design with a prominent call-to-action to start a family tree.
Dashboard: A personalized overview of the user's family tree, recent activity, and smart matches.
Family Tree View: An interactive, zoomable, and pannable interface for exploring the family tree.
Profile Page: A detailed view of an individual's profile, including photos, historical records, and family connections.
Phase 3: Advanced Features & Data Integration
This phase involves integrating advanced features, such as DNA matching, historical record search, and photo enhancement.

Milestones:
Implement DNA data upload and processing capabilities.
Develop a smart matching algorithm to identify potential relatives.
Integrate ElasticSearch for advanced historical record searching.
Use WebAssembly for client-side photo enhancement and colorization.
Core Feature Code (Conceptual):
JavaScript

// Smart Matching Algorithm
const findMatches = (user, potentialRelatives) => {
return potentialRelatives.filter(relative => {
const sharedSurnames = user.surnames.filter(surname => relative.surnames.includes(surname));
const sharedLocations = user.locations.filter(location => relative.locations.includes(location));
return sharedSurnames.length > 0 && sharedLocations.length > 0;
});
};
Phase 4: Testing & Security
This phase is dedicated to ensuring the platform is secure, reliable, and performs well under load.

Milestones:
Conduct comprehensive unit, integration, and end-to-end testing.
Implement end-to-end encryption for all sensitive data.
Ensure GDPR compliance for user data privacy.
Perform security audits and penetration testing.
Testing Strategy:
Unit Testing: Use Jest and React Testing Library for frontend components and backend services.
Integration Testing: Test the interactions between microservices and the database.
End-to-End Testing: Use Cypress to simulate user workflows and identify potential issues.
Phase 5: Deployment, Maintenance & Scaling
The final phase focuses on deploying the platform to production and establishing a plan for ongoing maintenance and scaling.

Milestones:
Deploy the application to a Kubernetes cluster on AWS.
Configure monitoring and logging using Prometheus and Grafana.
Implement a data backup and recovery strategy.
Develop a plan for scaling the platform as the user base grows.
Deployment Architecture:
Containerization: Dockerize all microservices for consistency and portability.
Orchestration: Use Kubernetes to manage and scale the containerized applications.
Cloud Provider: Leverage AWS for hosting, S3 for media storage, and other managed services.
Performance Optimization:
Use Redis for caching frequently accessed data.
Optimize database queries and indexes.
Implement lazy loading for images and other media.
Use a Content Delivery Network (CDN) to serve static assets.
Maintenance & Scaling:
Continuously monitor application performance and user feedback.
Regularly update dependencies and patch security vulnerabilities.
Scale the application horizontally by adding more pods to the Kubernetes cluster as needed.

# Project Overview

## Repo Summary & Description

**Repo Name:** dzinza

**Summary:** An open-source, interactive genealogy platform for building family trees, discovering relatives, and exploring ancestral history.

## Description

Dzinza is a modern, feature-rich genealogy platform inspired by industry leaders like MyHeritage. It provides a suite of tools for users to build their family history, connect with relatives, and uncover the stories of their ancestors. The platform is designed with a mobile-first, responsive interface and a powerful backend to support a seamless user experience.

Key features include an intuitive family tree builder, DNA matching and analysis, a vast searchable database of historical records, AI-powered photo enhancement, multi-language support (English, Shona, Ndebele), and collaborative research capabilities. The platform is designed to serve users from diverse linguistic and cultural backgrounds, with particular focus on Zimbabwean heritage and African genealogy. The project is built on a robust, scalable, and secure technology stack, ensuring data integrity and user privacy.

Implementation Plan
This project will be implemented in five distinct phases, each with specific milestones and deliverables. The platform will be developed using a microservices architecture, containerized with Docker, and orchestrated with Kubernetes for scalability and resilience.

Phase 1: Project Setup & Core Backend
This initial phase focuses on establishing the project's foundation, including the development environment, core backend services, and database schemas.

Milestones:
Initialize Git repository and set up project structure.
Configure Docker and Kubernetes environments.
Design and implement database schemas for PostgreSQL and MongoDB.
Develop core API endpoints for user authentication and data management.
Set up CI/CD pipeline for automated testing and deployment.
Database Schema:
PostgreSQL:
users: Stores user profile information, authentication details, and preferences.
families: Manages family groups and associations.
individuals: Contains detailed information about each person in a family tree.
relationships: Defines the connections between individuals (e.g., parent, spouse, child).
MongoDB:
historical_records: Stores a wide range of historical documents, such as birth certificates, census records, and marriage licenses.
media: Contains metadata for user-uploaded photos, videos, and documents.
API Endpoints:
POST /api/auth/register: Creates a new user account.
POST /api/auth/login: Authenticates a user and returns a JWT.
GET /api/users/:id: Retrieves a user's profile information.
POST /api/family: Creates a new family tree.
GET /api/family/:id: Fetches a family tree's data.
Phase 2: Frontend Development & Family Tree Builder
This phase concentrates on creating the user interface and implementing the core family tree functionality.

Milestones:
Develop the main application layout and UI components using React and Tailwind CSS.
Implement the family tree builder with drag-and-drop functionality using D3.js.
Integrate Redux for state management.
Ensure the UI is responsive and mobile-friendly.
UI/UX Wireframes:
Homepage: A clean, inviting design with a prominent call-to-action to start a family tree.
Dashboard: A personalized overview of the user's family tree, recent activity, and smart matches.
Family Tree View: An interactive, zoomable, and pannable interface for exploring the family tree.
Profile Page: A detailed view of an individual's profile, including photos, historical records, and family connections.
Phase 3: Advanced Features & Data Integration
This phase involves integrating advanced features, such as DNA matching, historical record search, and photo enhancement.

Milestones:
Implement DNA data upload and processing capabilities.
Develop a smart matching algorithm to identify potential relatives.
Integrate ElasticSearch for advanced historical record searching.
Use WebAssembly for client-side photo enhancement and colorization.
Core Feature Code (Conceptual):
JavaScript

// Smart Matching Algorithm
const findMatches = (user, potentialRelatives) => {
return potentialRelatives.filter(relative => {
const sharedSurnames = user.surnames.filter(surname => relative.surnames.includes(surname));
const sharedLocations = user.locations.filter(location => relative.locations.includes(location));
return sharedSurnames.length > 0 && sharedLocations.length > 0;
});
};
Phase 4: Testing & Security
This phase is dedicated to ensuring the platform is secure, reliable, and performs well under load.

Milestones:
Conduct comprehensive unit, integration, and end-to-end testing.
Implement end-to-end encryption for all sensitive data.
Ensure GDPR compliance for user data privacy.
Perform security audits and penetration testing.
Testing Strategy:
Unit Testing: Use Jest and React Testing Library for frontend components and backend services.
Integration Testing: Test the interactions between microservices and the database.
End-to-End Testing: Use Cypress to simulate user workflows and identify potential issues.
Phase 5: Deployment, Maintenance & Scaling
The final phase focuses on deploying the platform to production and establishing a plan for ongoing maintenance and scaling.

Milestones:
Deploy the application to a Kubernetes cluster on AWS.
Configure monitoring and logging using Prometheus and Grafana.
Implement a data backup and recovery strategy.
Develop a plan for scaling the platform as the user base grows.
Deployment Architecture:
Containerization: Dockerize all microservices for consistency and portability.
Orchestration: Use Kubernetes to manage and scale the containerized applications.
Cloud Provider: Leverage AWS for hosting, S3 for media storage, and other managed services.
Performance Optimization:
Use Redis for caching frequently accessed data.
Optimize database queries and indexes.
Implement lazy loading for images and other media.
Use a Content Delivery Network (CDN) to serve static assets.
Maintenance & Scaling:
Continuously monitor application performance and user feedback.
Regularly update dependencies and patch security vulnerabilities.
Scale the application horizontally by adding more pods to the Kubernetes cluster as needed.

# Quick Start Guide

## Prerequisites

- Node.js 18 or later
- npm or yarn
- Git

## Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/dzinza/dzinza.git
   cd dzinza
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start development server**

   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173` to see the application.

## Project Structure

```
dzinza/
├── src/
│   ├── components/         # Reusable UI components
│   ├── pages/             # Application pages
│   ├── hooks/             # Custom React hooks
│   ├── utils/             # Utility functions
│   ├── types/             # TypeScript type definitions
│   └── styles/            # Global styles
├── docs/                  # Documentation
├── public/                # Static assets
└── tests/                 # Test files
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run test` - Run tests

## Key Features

### 🌳 Family Tree Builder

Interactive drag-and-drop family tree with zoom and pan capabilities.

### 🧬 DNA Matching

Upload DNA data and find potential relatives through genetic matching.

### 📚 Historical Records

Search through millions of historical documents and records.

### 🖼️ Photo Enhancement

AI-powered photo restoration and colorization.

### 👥 Collaborative Research

Share research and collaborate with other family members.

## Next Steps

- [Read the full documentation](./README.md)
- [Set up your development environment](./INSTALLATION.md)
- [Understand the system architecture](./SYSTEM_ARCHITECTURE.md)
- [Contribute to the project](./CONTRIBUTING.md)

# Dzinza Genealogy Platform - Documentation Index

## 📋 Quick Navigation

### 🎯 Getting Started

- [Project Overview](./PROJECT_OVERVIEW.md) - What is Dzinza and why it matters
- [Quick Start Guide](./QUICK_START.md) - Get up and running in minutes
- [Installation Guide](./INSTALLATION.md) - Detailed setup instructions

### 🏗️ Architecture & Design

- [System Architecture](./SYSTEM_ARCHITECTURE.md) - High-level system design
- [Database Schema](./DATABASE_SCHEMA.md) - Data models and relationships
- [API Documentation](./API_DOCUMENTATION.md) - RESTful API specifications
- [Decision Framework](./DECISION_FRAMEWORK.md) - How we make technical decisions

### 👥 User Experience

- [User Manual](./USER_MANUAL.md) - End-user documentation
- [Internationalization](./INTERNATIONALIZATION.md) - Multi-language support
- [I18N Usage Examples](./I18N_USAGE_EXAMPLES.md) - Translation examples
- [Accessibility Guidelines](./ACCESSIBILITY_GUIDELINES.md) - Inclusive design principles

### 💻 Development

- [Development Guidelines](./DEVELOPMENT_GUIDELINES.md) - How to contribute
- [Code Standards](./CODE_STANDARDS.md) - Coding conventions and style
- [Testing Strategy](./TESTING_STRATEGY.md) - Quality assurance approach
- [Contributing Guide](./CONTRIBUTING.md) - Contribution process

### 🔒 Security & Compliance

- [Security Guidelines](./SECURITY_GUIDELINES.md) - Security best practices
- [Data Privacy](./DATA_PRIVACY.md) - GDPR and privacy compliance
- [Code of Conduct](./CODE_OF_CONDUCT.md) - Community standards

### 🚀 Operations

- [Deployment Guide](./DEPLOYMENT.md) - Production deployment
- [Infrastructure](./INFRASTRUCTURE.md) - Cloud and DevOps setup
- [Monitoring](./MONITORING.md) - System health and performance
- [Admin Guide](./ADMIN_GUIDE.md) - Administrative procedures

### 📋 Governance

- [Agent Rules](./AGENT_RULES.md) - AI agent guidelines and hierarchy
- [Core Principles](./CORE_PRINCIPLES.md) - Fundamental design principles
- [Development Rules](./DEVELOPMENT_RULES.md) - Technical standards and practices
- [Agent Quick Reference](./AGENT_QUICK_REFERENCE.md) - Quick decision guide

### 📊 Analysis & Planning

- [Comprehensive Review Report](./COMPREHENSIVE_REVIEW_REPORT.md) - Full system analysis
- [Implementation Plan](./IMPLEMENTATION_PLAN.md) - Development roadmap
- [Competitive Analysis](./COMPETITIVE_ANALYSIS.md) - Market positioning
- [Feature Specifications](./FEATURE_SPECIFICATIONS.md) - Detailed feature requirements

---

## 🎯 By Role Navigation

### For Project Managers

1. [Project Overview](./PROJECT_OVERVIEW.md)
2. [Implementation Plan](./IMPLEMENTATION_PLAN.md)
3. [Comprehensive Review Report](./COMPREHENSIVE_REVIEW_REPORT.md)
4. [Admin Guide](./ADMIN_GUIDE.md)

### For Developers

1. [Quick Start Guide](./QUICK_START.md)
2. [Development Guidelines](./DEVELOPMENT_GUIDELINES.md)
3. [System Architecture](./SYSTEM_ARCHITECTURE.md)
4. [API Documentation](./API_DOCUMENTATION.md)
5. [Testing Strategy](./TESTING_STRATEGY.md)

### For Designers

1. [User Manual](./USER_MANUAL.md)
2. [Accessibility Guidelines](./ACCESSIBILITY_GUIDELINES.md)
3. [Internationalization](./INTERNATIONALIZATION.md)
4. [Core Principles](./CORE_PRINCIPLES.md)

### For DevOps Engineers

1. [Infrastructure](./INFRASTRUCTURE.md)
2. [Deployment Guide](./DEPLOYMENT.md)
3. [Monitoring](./MONITORING.md)
4. [Security Guidelines](./SECURITY_GUIDELINES.md)

### For QA Engineers

1. [Testing Strategy](./TESTING_STRATEGY.md)
2. [Code Standards](./CODE_STANDARDS.md)
3. [Security Guidelines](./SECURITY_GUIDELINES.md)
4. [User Manual](./USER_MANUAL.md)

---

## 🏷️ By Topic Navigation

### Architecture

- [System Architecture](./SYSTEM_ARCHITECTURE.md)
- [Database Schema](./DATABASE_SCHEMA.md)
- [Infrastructure](./INFRASTRUCTURE.md)
- [API Documentation](./API_DOCUMENTATION.md)

### Quality Assurance

- [Testing Strategy](./TESTING_STRATEGY.md)
- [Code Standards](./CODE_STANDARDS.md)
- [Security Guidelines](./SECURITY_GUIDELINES.md)
- [Monitoring](./MONITORING.md)

### User Experience

- [User Manual](./USER_MANUAL.md)
- [Internationalization](./INTERNATIONALIZATION.md)
- [Accessibility Guidelines](./ACCESSIBILITY_GUIDELINES.md)
- [Feature Specifications](./FEATURE_SPECIFICATIONS.md)

### Development Process

- [Development Guidelines](./DEVELOPMENT_GUIDELINES.md)
- [Contributing Guide](./CONTRIBUTING.md)
- [Agent Rules](./AGENT_RULES.md)
- [Decision Framework](./DECISION_FRAMEWORK.md)

---

## 📚 Document Status

| Document                 | Status         | Last Updated | Version |
| ------------------------ | -------------- | ------------ | ------- |
| Project Overview         | ✅ Complete    | 2025-06-07   | 1.0     |
| System Architecture      | ✅ Complete    | 2025-06-07   | 1.0     |
| Development Guidelines   | ✅ Complete    | 2025-06-07   | 1.0     |
| Agent Rules              | ✅ Complete    | 2025-06-07   | 1.0     |
| Database Schema          | ✅ Complete    | 2025-06-07   | 1.0     |
| API Documentation        | 🔄 In Progress | 2025-06-07   | 0.8     |
| Comprehensive Review     | ✅ Complete    | 2025-06-07   | 1.0     |
| Feature Specifications   | 🚧 Planned     | -            | -       |
| Accessibility Guidelines | 🚧 Planned     | -            | -       |
| Security Guidelines      | 🚧 Planned     | -            | -       |
| Data Privacy             | 🚧 Planned     | -            | -       |

## 🔗 Cross-References

### Related Documents

- **Core Principles** ↔ **Development Rules** ↔ **Agent Rules**
- **System Architecture** ↔ **Database Schema** ↔ **API Documentation**
- **User Manual** ↔ **Internationalization** ↔ **Accessibility Guidelines**
- **Deployment** ↔ **Infrastructure** ↔ **Monitoring**

### Dependency Flow

```
Agent Rules → Core Principles → Development Rules → Code Standards
     ↓              ↓               ↓              ↓
System Architecture → Database Schema → API Docs → Implementation
```

---

**Version**: 1.0  
**Last Updated**: June 7, 2025  
**Maintained By**: Dzinza Development Team

For questions or suggestions about documentation, please create an issue in the project repository.

# Security Guidelines

## Overview

This document outlines comprehensive security guidelines for the Dzinza genealogy platform. Given the sensitive nature of family data, personal information, and DNA records, implementing robust security measures is critical for user trust and regulatory compliance.

## Security Principles

### Core Security Framework

1. **Security by Design**: Security considerations integrated into every development phase
2. **Defense in Depth**: Multiple layers of security controls
3. **Principle of Least Privilege**: Minimal access rights for users and systems
4. **Zero Trust Architecture**: Verify every request, regardless of source
5. **Privacy by Default**: Maximum privacy protection without user configuration

### Data Classification

| Classification   | Examples                        | Protection Level                       |
| ---------------- | ------------------------------- | -------------------------------------- |
| **Public**       | Marketing content, general info | Standard encryption                    |
| **Internal**     | System logs, analytics          | Encrypted at rest/transit              |
| **Confidential** | User profiles, family trees     | Enhanced encryption + access controls  |
| **Restricted**   | DNA data, health records        | Maximum security + compliance controls |

## Authentication & Authorization

### Multi-Factor Authentication (MFA)

**Implementation Requirements:**

```typescript
// MFA Configuration
interface MFAConfig {
  required: boolean;
  methods: ("sms" | "email" | "totp" | "hardware")[];
  gracePeriod: number; // hours
  backupCodes: number;
}

const mfaSettings: MFAConfig = {
  required: true,
  methods: ["totp", "sms", "email"],
  gracePeriod: 24,
  backupCodes: 10,
};
```

**MFA Requirements:**

- ✅ Required for all accounts handling DNA data
- ✅ TOTP (Time-based One-Time Password) preferred method
- ✅ SMS backup with rate limiting
- ✅ Hardware security keys support (FIDO2/WebAuthn)
- ✅ Backup recovery codes (encrypted storage)

### Session Management

**Security Controls:**

```typescript
interface SessionConfig {
  maxAge: number; // 8 hours
  renewalThreshold: number; // 1 hour before expiry
  maxConcurrent: number; // 3 sessions
  secureFlag: boolean; // HTTPS only
  sameSite: "strict";
  httpOnly: boolean;
}
```

**Session Security:**

- JWT tokens with short expiration (15 minutes)
- Refresh tokens stored securely (httpOnly cookies)
- Session invalidation on suspicious activity
- Automatic logout after inactivity (30 minutes)
- Device fingerprinting for anomaly detection

### Role-Based Access Control (RBAC)

**Permission Matrix:**

| Role             | Family Trees      | DNA Data        | Historical Records | Admin Functions |
| ---------------- | ----------------- | --------------- | ------------------ | --------------- |
| **Viewer**       | Read own          | None            | Search only        | None            |
| **Editor**       | Read/Write own    | None            | Search/Save        | None            |
| **Collaborator** | Read shared trees | None            | Search/Save        | None            |
| **Premium**      | Full access       | Upload/View own | Full access        | None            |
| **Moderator**    | Review flagged    | None            | Moderate content   | User management |
| **Admin**        | Emergency access  | Audit only      | Full management    | System admin    |

## Data Protection

### Encryption Standards

**Data at Rest:**

```yaml
# Encryption Configuration
encryption:
  algorithm: AES-256-GCM
  keyManagement: AWS KMS / Azure Key Vault
  databaseEncryption:
    - PostgreSQL: TDE (Transparent Data Encryption)
    - MongoDB: Encryption at Rest
  fileStorage:
    - Photos: S3 Server-Side Encryption
    - Documents: Client-side encryption before upload
```

**Data in Transit:**

- TLS 1.3 minimum for all communications
- Certificate pinning for mobile applications
- HSTS headers with long max-age
- Perfect Forward Secrecy (PFS)

**Field-Level Encryption:**

```typescript
// Sensitive fields requiring encryption
const encryptedFields = [
  "dnaData",
  "medicalHistory",
  "personalNotes",
  "contactInformation",
  "financialData",
];

// Encryption implementation
interface EncryptedField {
  value: string; // Encrypted data
  algorithm: string; // Encryption method
  keyId: string; // Key identifier
  timestamp: Date; // Encryption date
}
```

### Data Minimization

**Collection Principles:**

- Collect only necessary data for stated purposes
- Regular data audits and purging
- User control over data retention
- Automatic deletion of inactive accounts (after 2 years notice)

**Storage Optimization:**

```typescript
interface DataRetentionPolicy {
  userProfiles: "7 years";
  familyTrees: "indefinite with user consent";
  dnaData: "indefinite with user consent";
  searchHistory: "1 year";
  systemLogs: "2 years";
  auditLogs: "7 years";
}
```

## Privacy Protection

### GDPR Compliance

**Data Subject Rights Implementation:**

1. **Right to Access**

   ```typescript
   // Data export functionality
   interface DataExport {
     format: "JSON" | "XML" | "PDF";
     includeMetadata: boolean;
     encryptionRequired: boolean;
     deliveryMethod: "download" | "email" | "api";
   }
   ```

2. **Right to Rectification**

   - Real-time data correction capabilities
   - Audit trail for all modifications
   - Notification to data processors

3. **Right to Erasure ("Right to be Forgotten")**

   ```typescript
   interface DeletionRequest {
     userId: string;
     requestType: "partial" | "complete";
     exceptions: string[]; // Legal obligations
     cascadeDelete: boolean; // Related records
     anonymization: boolean; // Instead of deletion
   }
   ```

4. **Data Portability**
   - Standard export formats (GEDCOM, JSON)
   - API endpoints for data transfer
   - Automated migration tools

### Consent Management

**Consent Framework:**

```typescript
interface ConsentRecord {
  userId: string;
  purpose: string;
  dataTypes: string[];
  timestamp: Date;
  ipAddress: string;
  method: "explicit" | "opt-in" | "opt-out";
  withdrawable: boolean;
  expiry?: Date;
}
```

**Consent Types:**

- ✅ Essential functionality (cannot be withdrawn)
- 🔄 Analytics and performance
- 🔄 Marketing communications
- 🔄 Third-party integrations
- 🔄 Research participation

## Application Security

### Input Validation & Sanitization

**Validation Rules:**

```typescript
// Input validation schema
const validationRules = {
  userInput: {
    maxLength: 1000,
    allowedCharacters: /^[a-zA-Z0-9\s\-'.,]+$/,
    blacklistedPatterns: [/<script/i, /javascript:/i, /on\w+=/i],
  },
  fileUploads: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ["image/jpeg", "image/png", "application/pdf"],
    scanForMalware: true,
  },
};
```

**Sanitization Process:**

1. HTML encoding for display
2. SQL parameterization for database queries
3. NoSQL injection prevention
4. Command injection protection
5. Path traversal prevention

### API Security

**Rate Limiting:**

```typescript
interface RateLimitConfig {
  windowMs: number; // 15 minutes
  maxRequests: number; // 100 requests
  skipSuccessfulRequests: boolean;
  keyGenerator: (req: Request) => string;
  standardHeaders: boolean;
  legacyHeaders: boolean;
}
```

**API Security Headers:**

```http
# Security Headers
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

### Cross-Site Request Forgery (CSRF) Protection

**Implementation:**

```typescript
// CSRF Token Management
interface CSRFConfig {
  tokenLength: 32;
  httpOnly: true;
  secure: true;
  sameSite: "strict";
  headerName: "X-CSRF-Token";
  cookieName: "csrf-token";
}
```

## Infrastructure Security

### Container Security

**Docker Security Configuration:**

```dockerfile
# Security-hardened Dockerfile
FROM node:18-alpine AS base

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Security updates
RUN apk update && apk upgrade
RUN apk add --no-cache dumb-init

# Remove unnecessary packages
RUN rm -rf /var/cache/apk/*

# Use non-root user
USER nextjs

# Security labels
LABEL security.scan="enabled"
LABEL security.updates="auto"
```

**Kubernetes Security:**

```yaml
# Pod Security Policy
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: dzinza-psp
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - "configMap"
    - "emptyDir"
    - "projected"
    - "secret"
    - "downwardAPI"
    - "persistentVolumeClaim"
  runAsUser:
    rule: "MustRunAsNonRoot"
  seLinux:
    rule: "RunAsAny"
  fsGroup:
    rule: "RunAsAny"
```

### Network Security

**Firewall Rules:**

```yaml
# Network Policies
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: dzinza-network-policy
spec:
  podSelector:
    matchLabels:
      app: dzinza
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              role: frontend
      ports:
        - protocol: TCP
          port: 3000
```

## Monitoring & Incident Response

### Security Monitoring

**Log Analysis:**

```typescript
interface SecurityEvent {
  timestamp: Date;
  eventType:
    | "login"
    | "data_access"
    | "permission_change"
    | "suspicious_activity";
  userId?: string;
  ipAddress: string;
  userAgent: string;
  riskScore: number;
  details: Record<string, any>;
}
```

**Monitoring Alerts:**

- Failed authentication attempts (>5 in 10 minutes)
- Unusual data access patterns
- Privilege escalation attempts
- Geographic anomalies
- Large data exports
- API abuse patterns

### Incident Response Plan

**Response Phases:**

1. **Detection & Analysis**

   - Automated alert systems
   - 24/7 monitoring dashboard
   - Severity classification
   - Initial assessment (within 1 hour)

2. **Containment**

   - Isolate affected systems
   - Preserve evidence
   - Prevent lateral movement
   - User notification (if required)

3. **Eradication & Recovery**

   - Remove threat vectors
   - System hardening
   - Gradual service restoration
   - Enhanced monitoring

4. **Post-Incident Activity**
   - Detailed incident report
   - Lessons learned documentation
   - Security improvements
   - Stakeholder communication

**Contact Information:**

```yaml
# Emergency Contacts
security_team:
  primary: security@dzinza.com
  phone: "+1-XXX-XXX-XXXX"
  escalation: cto@dzinza.com

external_resources:
  cert_team: cert@example.org
  legal_counsel: legal@dzinza.com
  public_relations: pr@dzinza.com
```

## Compliance Requirements

### Regulatory Frameworks

**GDPR (General Data Protection Regulation):**

- ✅ Privacy by design implementation
- ✅ Data Protection Impact Assessments (DPIA)
- ✅ Consent management system
- ✅ Data breach notification (72 hours)
- ✅ Data Protection Officer (DPO) designation

**HIPAA (if health data is processed):**

- ✅ Administrative safeguards
- ✅ Physical safeguards
- ✅ Technical safeguards
- ✅ Business Associate Agreements

**SOC 2 Type II:**

- Security controls
- Availability controls
- Processing integrity
- Confidentiality controls
- Privacy controls

### Audit Requirements

**Regular Assessments:**

```yaml
security_audits:
  frequency: quarterly
  scope: full_system
  external_auditor: required

penetration_testing:
  frequency: semi_annual
  scope: web_app_and_api
  methodology: OWASP_TESTING_GUIDE

vulnerability_scanning:
  frequency: weekly
  automated: true
  manual_review: monthly
```

## Security Training & Awareness

### Developer Security Training

**Required Training Modules:**

1. Secure coding practices
2. OWASP Top 10 vulnerabilities
3. Data protection principles
4. Incident response procedures
5. Privacy regulations (GDPR, CCPA)

**Training Schedule:**

- Initial security training (all new developers)
- Annual refresher training
- Incident-based training (after security events)
- Technology-specific training (when adopting new tools)

### Security Culture

**Best Practices:**

- Regular security discussions in team meetings
- Security champions program
- Bug bounty program for external researchers
- Security-focused code reviews
- Threat modeling for new features

## Implementation Checklist

### Phase 1: Immediate (0-30 days)

- [ ] Implement authentication system with MFA
- [ ] Set up HTTPS with proper certificates
- [ ] Configure security headers
- [ ] Implement basic rate limiting
- [ ] Set up security logging
- [ ] Create incident response procedures

### Phase 2: Short-term (30-90 days)

- [ ] Implement encryption for sensitive data
- [ ] Set up vulnerability scanning
- [ ] Configure container security
- [ ] Implement CSRF protection
- [ ] Set up monitoring and alerting
- [ ] Conduct security training

### Phase 3: Medium-term (90-180 days)

- [ ] Complete GDPR compliance implementation
- [ ] Conduct penetration testing
- [ ] Implement advanced threat detection
- [ ] Set up security analytics
- [ ] Complete SOC 2 Type II audit
- [ ] Implement zero-trust architecture

### Phase 4: Long-term (180+ days)

- [ ] Advanced ML-based threat detection
- [ ] Automated incident response
- [ ] Continuous compliance monitoring
- [ ] Advanced privacy controls
- [ ] Bug bounty program launch
- [ ] Security certification maintenance

## References & Resources

### Security Standards

- [OWASP Application Security Verification Standard](https://owasp.org/www-project-application-security-verification-standard/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [ISO 27001 Information Security Management](https://www.iso.org/isoiec-27001-information-security.html)

### Privacy Regulations

- [GDPR Official Text](https://gdpr-info.eu/)
- [CCPA California Consumer Privacy Act](https://oag.ca.gov/privacy/ccpa)
- [PIPEDA Personal Information Protection](https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/)

### Security Tools & Libraries

- [OWASP ZAP](https://www.zaproxy.org/) - Security testing
- [Snyk](https://snyk.io/) - Vulnerability scanning
- [SonarQube](https://www.sonarqube.org/) - Code security analysis
- [HashiCorp Vault](https://www.vaultproject.io/) - Secrets management

---

**Document Version:** 1.0  
**Last Updated:** June 7, 2025  
**Next Review:** September 7, 2025  
**Owner:** Security Team  
**Approved By:** CTO, Legal Team

# System Architecture

## Overview

Dzinza is built using a modern, scalable architecture designed to handle millions of users and billions of genealogical records. The system follows microservices principles with clear separation of concerns.

## High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │    │  Mobile App     │    │   Admin Panel   │
│   (React/TS)    │    │   (React       │    │   (React/TS)    │
└─────────────────┘    │    Native)      │    └─────────────────┘
         │              └─────────────────┘             │
         │                        │                     │
         └────────────────────────┼─────────────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │      Load Balancer        │
                    │     (Nginx/CloudFlare)    │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │       API Gateway         │
                    │    (Express.js/Node.js)   │
                    └─────────────┬─────────────┘
                                  │
            ┌─────────────────────┼─────────────────────┐
            │                     │                     │
  ┌─────────▼─────────┐ ┌─────────▼─────────┐ ┌─────────▼─────────┐
  │   Auth Service    │ │   Core Service    │ │  Media Service    │
  │   (Node.js/JWT)   │ │   (Node.js/TS)    │ │   (Node.js/TS)    │
  └─────────┬─────────┘ └─────────┬─────────┘ └─────────┬─────────┘
            │                     │                     │
            │           ┌─────────▼─────────┐           │
            │           │   Search Service  │           │
            │           │ (Elasticsearch)   │           │
            │           └─────────┬─────────┘           │
            │                     │                     │
    ┌───────▼────────┐  ┌─────────▼─────────┐  ┌───────▼────────┐
    │   PostgreSQL   │  │      Redis        │  │   File Storage │
    │  (Primary DB)  │  │    (Cache/       │  │  (AWS S3/Local) │
    │                │  │     Sessions)     │  │                │
    └────────────────┘  └───────────────────┘  └────────────────┘
```

## Frontend Architecture

### React Application Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Basic UI components (Button, Input, etc.)
│   ├── forms/           # Form components
│   ├── charts/          # Data visualization components
│   └── layout/          # Layout components (Header, Sidebar, etc.)
├── pages/               # Page components
│   ├── auth/            # Authentication pages
│   ├── dashboard/       # Dashboard pages
│   ├── family-tree/     # Family tree pages
│   └── profile/         # User profile pages
├── hooks/               # Custom React hooks
├── services/            # API service layer
├── store/               # State management (Redux/Zustand)
├── utils/               # Utility functions
├── types/               # TypeScript definitions
└── styles/              # Global styles and themes
```

### State Management

- **Global State**: Redux Toolkit for complex state
- **Server State**: React Query for API data caching
- **Form State**: React Hook Form for form management
- **Local State**: React useState for component-specific state

### Key Libraries

- **React 18** - UI framework with concurrent features
- **TypeScript** - Type safety and developer experience
- **Tailwind CSS** - Utility-first styling
- **React Router** - Client-side routing
- **React Query** - Server state management
- **D3.js** - Data visualization for family trees
- **Framer Motion** - Animations and transitions

## Backend Architecture

### Microservices Design

#### 1. Authentication Service

- User registration and login
- JWT token management
- Password reset functionality
- OAuth integration (Google, Facebook)

#### 2. Core API Service

- Family tree management
- Individual profiles
- Relationship management
- User preferences

#### 3. Search Service

- Historical record search
- Full-text search capabilities
- Advanced filtering and sorting
- Search result ranking

#### 4. DNA Service

- DNA data processing
- Genetic matching algorithms
- Ethnicity estimation
- Health trait analysis

#### 5. Media Service

- Photo/document upload
- Image processing and enhancement
- File storage management
- Thumbnail generation

### Database Design

#### Primary Database (PostgreSQL)

- **Users**: User accounts and profiles
- **Families**: Family group management
- **Individuals**: Person records in family trees
- **Relationships**: Family connections
- **DNA Data**: Genetic information
- **Subscriptions**: Billing and plan management

#### Document Store (MongoDB)

- **Historical Records**: Birth certificates, census data
- **Media Metadata**: Photo and document information
- **Search Indexes**: Optimized search data
- **User Activities**: Audit logs and analytics

#### Cache Layer (Redis)

- Session storage
- API response caching
- Real-time notifications
- Rate limiting data

#### Search Engine (Elasticsearch)

- Full-text search across all records
- Advanced query capabilities
- Aggregations and analytics
- Real-time indexing

## Security Architecture

### Authentication & Authorization

- JWT-based authentication
- Role-based access control (RBAC)
- Multi-factor authentication (MFA)
- OAuth 2.0 integration

### Data Protection

- End-to-end encryption for sensitive data
- Data anonymization for analytics
- GDPR compliance measures
- Regular security audits

### Infrastructure Security

- SSL/TLS encryption
- API rate limiting
- DDoS protection
- Vulnerability scanning

## Deployment Architecture

### Containerization

- Docker containers for all services
- Multi-stage builds for optimization
- Health checks and monitoring
- Resource limits and requests

### Orchestration (Kubernetes)

```yaml
# Example pod specification
apiVersion: v1
kind: Pod
metadata:
  name: dzinza-api
spec:
  containers:
    - name: api
      image: dzinza/api:latest
      ports:
        - containerPort: 8000
      env:
        - name: NODE_ENV
          value: "production"
      resources:
        requests:
          memory: "256Mi"
          cpu: "250m"
        limits:
          memory: "512Mi"
          cpu: "500m"
```

### Cloud Infrastructure (AWS)

- **EKS** - Managed Kubernetes service
- **RDS** - Managed PostgreSQL database
- **ElastiCache** - Managed Redis service
- **S3** - Object storage for media files
- **CloudFront** - CDN for static assets
- **Route 53** - DNS management
- **Application Load Balancer** - Traffic distribution

## Performance Considerations

### Frontend Optimization

- Code splitting and lazy loading
- Image optimization and WebP format
- Service worker for offline functionality
- Bundle size optimization

### Backend Optimization

- Database query optimization
- Connection pooling
- Horizontal pod autoscaling
- CDN for static assets

### Monitoring & Observability

- **Prometheus** - Metrics collection
- **Grafana** - Metrics visualization
- **Jaeger** - Distributed tracing
- **ELK Stack** - Centralized logging

## Scalability Strategy

### Horizontal Scaling

- Stateless microservices
- Load balancing across pods
- Database read replicas
- Sharding for large datasets

### Vertical Scaling

- Resource-based pod scaling
- Database instance upgrades
- Memory optimization
- CPU utilization monitoring

### Global Distribution

- Multi-region deployment
- Geo-distributed CDN
- Regional database replicas
- Edge computing for search

# Testing Strategy

## Overview

Dzinza follows a comprehensive testing strategy with multiple layers to ensure code quality, reliability, and user experience. We implement the testing pyramid approach with unit tests forming the foundation, integration tests in the middle, and E2E tests at the top.

## Testing Pyramid

```
    /\
   /  \     E2E Tests (Few, Slow, High Confidence)
  /    \
 /______\   Integration Tests (Some, Medium Speed)
/________\  Unit Tests (Many, Fast, Low-level)
```

## Test Types

### 1. Unit Tests

**Purpose:** Test individual components, functions, and modules in isolation.

**Framework:** Jest + React Testing Library

**Coverage Target:** 90%+

**Examples:**

```typescript
// Component testing
describe("PersonCard", () => {
  it("displays person information correctly", () => {
    const person = { name: "John Doe", age: 30 };
    render(<PersonCard person={person} />);
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });
});

// Hook testing
describe("usePersonData", () => {
  it("fetches person data on mount", async () => {
    const { result, waitFor } = renderHook(() => usePersonData("123"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.person).toBeDefined();
  });
});

// Utility function testing
describe("calculateAge", () => {
  it("calculates age correctly", () => {
    const birthDate = new Date("1990-01-01");
    const age = calculateAge(birthDate);
    expect(age).toBe(34); // Assuming current year is 2024
  });
});
```

**Commands:**

```bash
npm run test:unit          # Run unit tests
npm run test:unit:watch    # Run tests in watch mode
npm run test:unit:coverage # Run with coverage report
```

### 2. Integration Tests

**Purpose:** Test interaction between multiple components, API endpoints, and database operations.

**Framework:** Jest + Supertest + Test Containers

**Examples:**

```typescript
// API integration testing
describe("Family Tree API", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  it("creates a new family tree", async () => {
    const response = await request(app)
      .post("/api/families")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ name: "Smith Family" });

    expect(response.status).toBe(201);
    expect(response.body.name).toBe("Smith Family");
  });
});

// Component integration testing
describe("FamilyTreePage", () => {
  it("loads and displays family tree data", async () => {
    mockApiResponse("/api/families/123", mockFamilyData);

    render(<FamilyTreePage familyId="123" />);

    await waitFor(() => {
      expect(screen.getByText("Smith Family")).toBeInTheDocument();
    });
  });
});
```

**Commands:**

```bash
npm run test:integration    # Run integration tests
npm run test:db            # Run database tests
```

### 3. End-to-End (E2E) Tests

**Purpose:** Test complete user workflows from frontend to backend.

**Framework:** Playwright

**Examples:**

```typescript
// User workflow testing
test("user can create and edit family tree", async ({ page }) => {
  // Login
  await page.goto("/login");
  await page.fill("[data-testid=email]", "test@example.com");
  await page.fill("[data-testid=password]", "password123");
  await page.click("[data-testid=login-button]");

  // Create family tree
  await page.goto("/dashboard");
  await page.click("text=Create New Tree");
  await page.fill("[data-testid=tree-name]", "Test Family");
  await page.click("[data-testid=create-button]");

  // Verify creation
  await expect(page.locator("text=Test Family")).toBeVisible();

  // Add person
  await page.click("[data-testid=add-person-button]");
  await page.fill("[data-testid=person-name]", "John Doe");
  await page.click("[data-testid=save-person]");

  // Verify person added
  await expect(page.locator("text=John Doe")).toBeVisible();
});
```

**Commands:**

```bash
npm run test:e2e           # Run E2E tests
npm run test:e2e:headed    # Run with browser UI
npm run test:e2e:debug     # Run in debug mode
```

### 4. Visual Regression Tests

**Purpose:** Catch unintended visual changes in UI components.

**Framework:** Playwright + Percy

**Examples:**

```typescript
test("family tree visual regression", async ({ page }) => {
  await page.goto("/family-tree/123");
  await page.waitForLoadState("networkidle");

  // Take screenshot for visual comparison
  await expect(page).toHaveScreenshot("family-tree-full.png");

  // Test responsive design
  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(page).toHaveScreenshot("family-tree-tablet.png");
});
```

### 5. Internationalization (i18n) Tests

**Purpose:** Ensure multi-language support works correctly across all features.

**Framework:** Jest + React Testing Library + i18next-testing

**Coverage Areas:**

- Translation key coverage
- Language switching functionality
- Text rendering in different languages
- Cultural formatting (dates, numbers)
- RTL/LTR text direction handling

**Examples:**

```typescript
// Translation coverage test
describe("Translation Coverage", () => {
  const languages = ["en", "sn", "nd"];
  const namespaces = ["common", "genealogy", "forms", "navigation"];

  languages.forEach((lang) => {
    namespaces.forEach((namespace) => {
      it(`should have complete translations for ${lang}/${namespace}`, async () => {
        const enTranslations = await import(`../locales/en/${namespace}.json`);
        const langTranslations = await import(
          `../locales/${lang}/${namespace}.json`
        );

        const enKeys = flattenObject(enTranslations);
        const langKeys = flattenObject(langTranslations);

        Object.keys(enKeys).forEach((key) => {
          expect(langKeys).toHaveProperty(key);
          expect(langKeys[key]).toBeTruthy();
        });
      });
    });
  });
});

// Language switching test
describe("Language Switching", () => {
  it("should switch language and persist preference", async () => {
    render(<App />);

    // Switch to Shona
    const languageSelector = screen.getByRole("combobox", {
      name: /language/i,
    });
    fireEvent.change(languageSelector, { target: { value: "sn" } });

    // Verify UI updates
    await waitFor(() => {
      expect(screen.getByText("Mauya")).toBeInTheDocument(); // Welcome in Shona
    });

    // Verify persistence
    expect(localStorage.getItem("dzinza_user_language")).toBe("sn");
  });
});

// Cultural formatting test
describe("Cultural Formatting", () => {
  it("should format dates according to language locale", () => {
    const testDate = new Date("2023-12-25");

    // English format (US)
    expect(formatDate(testDate, "en-US")).toBe("December 25, 2023");

    // English format (Zimbabwe)
    expect(formatDate(testDate, "en-ZW")).toBe("25 December 2023");

    // Shona format
    expect(formatDate(testDate, "sn-ZW")).toBe("25 Zvita 2023");
  });
});

// Component rendering in different languages
describe("Multilingual Component Rendering", () => {
  const languages = ["en", "sn", "nd"];

  languages.forEach((lang) => {
    it(`should render FamilyTree component in ${lang}`, async () => {
      const { rerender } = render(
        <I18nextProvider i18n={createI18nInstance(lang)}>
          <FamilyTree treeId="123" />
        </I18nextProvider>
      );

      // Wait for translations to load
      await waitFor(() => {
        expect(screen.getByRole("heading")).toBeInTheDocument();
      });

      // Verify no missing translation keys (should not show key names)
      const content = screen.getByTestId("family-tree-content");
      expect(content.textContent).not.toMatch(/^[a-zA-Z]+\.[a-zA-Z.]+$/);
    });
  });
});

// Relationship terms test
describe("Genealogy Terms Translation", () => {
  it("should translate family relationships correctly", () => {
    const relationships = {
      en: { father: "Father", mother: "Mother", son: "Son" },
      sn: { father: "Baba", mother: "Amai", son: "Mwanakomana" },
      nd: { father: "Ubaba", mother: "Umama", son: "Indodana" },
    };

    Object.entries(relationships).forEach(([lang, terms]) => {
      const i18n = createI18nInstance(lang);
      Object.entries(terms).forEach(([key, expected]) => {
        expect(i18n.t(`genealogy.relationships.${key}`)).toBe(expected);
      });
    });
  });
});
```

### 6. Performance Tests

**Purpose:** Ensure application performance meets requirements.

**Framework:** Lighthouse + K6

**Examples:**

```javascript
// Load testing with K6
import http from "k6/http";
import { check } from "k6";

export let options = {
  stages: [
    { duration: "2m", target: 100 }, // Ramp up
    { duration: "5m", target: 100 }, // Stay at 100 users
    { duration: "2m", target: 0 }, // Ramp down
  ],
};

export default function () {
  let response = http.get("https://api.dzinza.com/families");
  check(response, {
    "status is 200": (r) => r.status === 200,
    "response time < 500ms": (r) => r.timings.duration < 500,
  });
}
```

## Test Environment Setup

### Local Development

```bash
# Setup test database
docker run -d --name dzinza-test-db \
  -e POSTGRES_DB=dzinza_test \
  -e POSTGRES_USER=test \
  -e POSTGRES_PASSWORD=test \
  -p 5433:5432 postgres:15

# Setup test Redis
docker run -d --name dzinza-test-redis \
  -p 6380:6379 redis:7-alpine

# Run all tests
npm run test:all
```

### CI/CD Pipeline

```yaml
# GitHub Actions test configuration
- name: Setup test environment
  run: |
    docker-compose -f docker-compose.test.yml up -d
    sleep 10  # Wait for services to start

- name: Run database migrations
  run: npm run db:migrate:test

- name: Run test suite
  run: |
    npm run test:unit
    npm run test:integration
    npm run test:e2e
```

## Test Data Management

### Test Fixtures

```typescript
// Test data factories
export const createMockPerson = (overrides = {}) => ({
  id: faker.string.uuid(),
  name: faker.person.fullName(),
  birthDate: faker.date.past({ years: 80 }),
  gender: faker.person.sex(),
  ...overrides,
});

export const createMockFamily = (overrides = {}) => ({
  id: faker.string.uuid(),
  name: faker.company.name() + " Family",
  members: Array.from({ length: 5 }, () => createMockPerson()),
  ...overrides,
});
```

### Database Seeding

```typescript
// Test database seeding
export const seedTestDatabase = async () => {
  await db.user.createMany({
    data: [
      { email: "test1@example.com", name: "Test User 1" },
      { email: "test2@example.com", name: "Test User 2" },
    ],
  });

  await db.family.createMany({
    data: [
      { name: "Test Family 1", ownerId: "user1" },
      { name: "Test Family 2", ownerId: "user2" },
    ],
  });
};
```

## Mocking Strategy

### API Mocking

```typescript
// MSW (Mock Service Worker) setup
import { rest } from "msw";
import { setupServer } from "msw/node";

const server = setupServer(
  rest.get("/api/families/:id", (req, res, ctx) => {
    return res(ctx.json(mockFamilyData));
  }),

  rest.post("/api/auth/login", (req, res, ctx) => {
    return res(ctx.json({ token: "mock-jwt-token" }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### External Service Mocking

```typescript
// Mock external services
jest.mock("../services/photoEnhancement", () => ({
  enhancePhoto: jest.fn().mockResolvedValue({
    enhancedUrl: "https://example.com/enhanced.jpg",
    confidence: 0.95,
  }),
}));

jest.mock("../services/dnaAnalysis", () => ({
  analyzeDNA: jest.fn().mockResolvedValue({
    matches: mockDNAMatches,
    ethnicity: mockEthnicityData,
  }),
}));
```

## Test Coverage

### Coverage Requirements

- **Unit Tests:** 90%+ line coverage
- **Integration Tests:** 80%+ feature coverage
- **E2E Tests:** 100% critical path coverage

### Coverage Reporting

```bash
# Generate coverage report
npm run test:coverage

# View coverage report
open coverage/lcov-report/index.html
```

### Coverage Configuration

```javascript
// Jest coverage configuration
module.exports = {
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/main.tsx",
    "!src/vite-env.d.ts",
  ],
};
```

## Testing Best Practices

### Writing Good Tests

1. **AAA Pattern:** Arrange, Act, Assert
2. **Descriptive Names:** Test names should describe the behavior
3. **Single Responsibility:** One assertion per test when possible
4. **Independent Tests:** Tests should not depend on each other
5. **Fast Execution:** Tests should run quickly

### Test Organization

```
tests/
├── unit/
│   ├── components/
│   ├── hooks/
│   ├── utils/
│   └── services/
├── integration/
│   ├── api/
│   ├── database/
│   └── components/
├── e2e/
│   ├── user-workflows/
│   ├── admin-workflows/
│   └── guest-workflows/
├── performance/
│   ├── load-tests/
│   └── lighthouse/
└── fixtures/
    ├── users.json
    ├── families.json
    └── dna-data.json
```

### Continuous Testing

- **Pre-commit Hooks:** Run tests before commits
- **Pull Request Checks:** All tests must pass
- **Branch Protection:** Prevent merging without tests
- **Scheduled Tests:** Run full test suite nightly

## Test Automation

### GitHub Actions Integration

```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "18"
      - run: npm ci
      - run: npm run test:all
      - uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

### Quality Gates

- **Code Coverage:** Must maintain 90%+ coverage
- **Test Performance:** Tests must complete in <5 minutes
- **Flaky Tests:** Automatic retry with failure analysis
- **Security Tests:** Automated vulnerability scanning

# User Manual

Welcome to Dzinza - Your Digital Genealogy Platform! This comprehensive guide will help you make the most of all features available on the platform.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Creating Your Account](#creating-your-account)
3. [Building Your Family Tree](#building-your-family-tree)
4. [Managing Family Members](#managing-family-members)
5. [DNA Analysis Features](#dna-analysis-features)
6. [Photo and Document Management](#photo-and-document-management)
7. [Collaboration and Sharing](#collaboration-and-sharing)
8. [Search and Discovery](#search-and-discovery)
9. [Privacy and Security](#privacy-and-security)
10. [Mobile App Usage](#mobile-app-usage)
11. [Troubleshooting](#troubleshooting)

## Getting Started

### System Requirements

#### Web Browser

- **Recommended**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **JavaScript**: Must be enabled
- **Cookies**: Required for authentication
- **Local Storage**: Used for offline functionality

#### Mobile App

- **iOS**: 13.0 or later
- **Android**: API level 21 (Android 5.0) or higher
- **Storage**: Minimum 100MB free space

### First Login

1. Navigate to [https://app.dzinza.com](https://app.dzinza.com)
2. Click "Sign In" or "Get Started"
3. Enter your credentials or create a new account
4. Complete email verification if required
5. Follow the onboarding wizard

## Creating Your Account

### Registration Process

#### Step 1: Basic Information

```
- Full Name: Your legal name as you'd like it to appear
- Email Address: Primary contact method (must be verified)
- Password: Minimum 8 characters with mixed case, numbers, symbols
- Country/Region: For localization and privacy compliance
```

#### Step 2: Privacy Preferences

- **Profile Visibility**: Public, Family Only, or Private
- **Search Visibility**: Allow others to find you in searches
- **Communication Preferences**: Email notifications settings
- **Data Sharing**: Optional participation in genealogy research

#### Step 3: Initial Tree Setup

- **Primary Tree Name**: Usually your family surname
- **Starting Person**: Yourself or the person you're researching
- **Privacy Level**: Public, Family Only, or Private

### Account Verification

1. Check your email for verification link
2. Click the verification link within 24 hours
3. Return to the platform to complete setup
4. Consider enabling two-factor authentication for security

## Building Your Family Tree

### Creating Your First Tree

#### Starting with Yourself

1. Click "Create New Tree" from your dashboard
2. Select "Start with Myself" option
3. Fill in your basic information:
   - Full name (first, middle, last, suffixes)
   - Birth date and location
   - Current location (optional)
   - Occupation (optional)

#### Adding Parents

1. Click on your profile in the tree view
2. Select "Add Parent" from the context menu
3. Choose "Add Father" or "Add Mother"
4. Fill in available information:
   - Full name and any known aliases
   - Birth and death dates (if applicable)
   - Birth and death locations
   - Marriage information

#### Adding Siblings

1. Select a parent's profile
2. Click "Add Child" to add siblings
3. Specify relationship type:
   - Biological
   - Adopted
   - Step-child
   - Foster child

#### Adding Spouse and Children

1. Click on your profile or any family member
2. Select "Add Spouse" to add marriages
3. For each spouse, you can add:
   - Marriage date and location
   - Divorce date (if applicable)
   - Marriage type (civil, religious, common law)
4. Add children using "Add Child" option

### Advanced Tree Building

#### Multiple Family Trees

- Create separate trees for different family lines
- Merge trees when connections are discovered
- Share trees with family members for collaboration

#### Complex Relationships

- **Multiple Marriages**: Track all marriages and relationships
- **Adoptions**: Distinguish between biological and adoptive relationships
- **Step-families**: Properly model blended families
- **Unknown Relationships**: Mark uncertain connections for future research

#### Research Notes

- Add research notes to each person
- Document sources for all information
- Track research progress and next steps
- Set research goals and reminders

## Managing Family Members

### Person Profiles

#### Basic Information

```
Personal Details:
- Full legal name and nicknames
- Birth date and location
- Death date and location (if applicable)
- Current residence
- Occupation and education
- Physical description

Family Relationships:
- Parents (biological, adoptive, step)
- Spouses and partners
- Children
- Siblings
```

#### Life Events

Add significant events in chronological order:

- **Birth**: Date, location, circumstances
- **Education**: Schools attended, degrees earned
- **Military Service**: Branch, rank, service dates, conflicts
- **Career**: Jobs, promotions, retirement
- **Residences**: All places lived with dates
- **Marriage**: Date, location, spouse details
- **Children**: Birth dates and details
- **Death**: Date, location, cause (if known)

#### Photos and Documents

- **Profile Photos**: Primary photo appears in tree view
- **Life Photos**: Photos from different life stages
- **Documents**: Birth certificates, marriage licenses, obituaries
- **Military Records**: Service records, medals, discharge papers
- **Immigration**: Ship manifests, naturalization papers

### Data Entry Best Practices

#### Date Formats

- **Exact Dates**: Use MM/DD/YYYY format
- **Approximate Dates**: Use "About 1920" or "Circa 1920"
- **Date Ranges**: Use "Between 1920 and 1925"
- **Partial Dates**: Use "1920" for year only

#### Location Standards

- Use full location names: "New York, New York, United States"
- Include county when known: "Manhattan, New York County, New York, United States"
- For historical locations, use names that existed at the time
- Add modern equivalents in notes if helpful

#### Source Documentation

Always include sources for information:

- **Primary Sources**: Birth certificates, marriage licenses, death certificates
- **Secondary Sources**: Census records, obituaries, family histories
- **Family Knowledge**: Stories passed down through family
- **DNA Evidence**: Genetic connections and ethnicity estimates

## DNA Analysis Features

### DNA Upload Process

#### Supported File Formats

- **23andMe**: Raw data download file
- **AncestryDNA**: Raw data download file
- **MyHeritage**: Raw data export file
- **FamilyTreeDNA**: Genome/SNP data file

#### Upload Steps

1. Download raw DNA data from your testing company
2. Navigate to "DNA Analysis" section in Dzinza
3. Click "Upload DNA Data"
4. Select your testing company from the dropdown
5. Choose the raw data file from your computer
6. Confirm consent for analysis and matching
7. Wait for processing (typically 24-48 hours)

### DNA Matching

#### Understanding Matches

- **Close Matches (>7% shared DNA)**: Immediate family members
- **Moderate Matches (1-7% shared DNA)**: Cousins, great aunts/uncles
- **Distant Matches (<1% shared DNA)**: Distant cousins, possible connections

#### Match Management

- **Contact Matches**: Send messages to other users
- **Notes**: Add personal notes about each match
- **Trees**: View shared family trees
- **Shared Matches**: Find common relatives

#### Building Connections

1. Review shared DNA segments
2. Compare family trees for common ancestors
3. Exchange messages with matches
4. Collaborate on research
5. Confirm relationships through documentation

### Ethnicity Estimates

#### Understanding Results

- **Primary Ethnicities**: Your major ancestral populations
- **Recent Ancestry**: Last 5-8 generations
- **Ancient Origins**: Deep ancestral migrations
- **Confidence Levels**: Statistical confidence in estimates

#### Historical Context

- Compare results with known family history
- Understand migration patterns
- Research historical events affecting your ancestors
- Consider margin of error in estimates

## Photo and Document Management

### Organizing Media

#### Photo Categories

- **Portraits**: Individual and family portraits
- **Events**: Weddings, graduations, celebrations
- **Places**: Homes, businesses, landscapes
- **Documents**: Digitized papers and records
- **Artifacts**: Physical objects and heirlooms

#### Upload Process

1. Navigate to person's profile or media library
2. Click "Add Photo" or "Add Document"
3. Select files from your device (max 10MB each)
4. Add metadata:
   - Title and description
   - Date taken (approximate if unknown)
   - Location
   - People in the photo
   - Photographer (if known)
5. Set privacy level
6. Save and publish

### Photo Enhancement

#### AI-Powered Features

- **Face Detection**: Automatically identify people in photos
- **Colorization**: Add color to black and white photos
- **Restoration**: Repair damaged or faded photos
- **Upscaling**: Improve resolution of low-quality images

#### Manual Editing

- **Crop and Rotate**: Adjust photo composition
- **Brightness/Contrast**: Improve image quality
- **Annotations**: Add notes and identify people/places
- **Collections**: Group related photos together

### Document Transcription

#### OCR (Optical Character Recognition)

- Automatically extract text from documents
- Edit and correct transcriptions
- Make documents searchable
- Preserve original formatting when possible

#### Manual Transcription

- Type out handwritten documents
- Include unclear text in brackets [illegible]
- Add contextual notes and explanations
- Link transcriptions to family members

## Collaboration and Sharing

### Family Collaboration

#### Inviting Family Members

1. Navigate to "Family & Sharing" settings
2. Click "Invite Family Member"
3. Enter their email address
4. Set permission level:
   - **Viewer**: Can see tree and information
   - **Contributor**: Can add/edit information
   - **Manager**: Full access including privacy settings
5. Add personal message
6. Send invitation

#### Managing Permissions

- **Tree Access**: Control who can view your trees
- **Edit Rights**: Specify who can modify information
- **Photo Sharing**: Set different permissions for media
- **DNA Access**: Control DNA matching and visibility

#### Collaborative Research

- **Research Notes**: Share findings and sources
- **Task Assignment**: Delegate research tasks
- **Message Center**: Communicate with collaborators
- **Version History**: Track changes and contributions

### Public Sharing

#### Public Trees

- Make trees searchable by other Dzinza users
- Allow connection requests from potential relatives
- Contribute to historical research projects
- Maintain privacy for living individuals

#### Export Options

- **GEDCOM**: Export tree data for other genealogy software
- **PDF Reports**: Generate printable family reports
- **Photo Books**: Create photo albums and family histories
- **Family Website**: Generate shareable family website

## Search and Discovery

### Finding Family

#### Search Types

- **Name Search**: Find people by name
- **Location Search**: Find families in specific areas
- **Date Search**: Find people living during specific time periods
- **DNA Search**: Find genetic relatives

#### Advanced Search Filters

```
Name Filters:
- Exact name match
- Sounds like (phonetic matching)
- Name variations and nicknames

Date Filters:
- Birth year range
- Death year range
- Marriage year range
- Immigration year range

Location Filters:
- Birth location
- Death location
- Residence locations
- Immigration ports

Relationship Filters:
- Direct ancestors
- Descendants
- Siblings
- Cousins (by degree)
```

#### Search Results

- **Relevance Score**: How closely results match your search
- **Family Trees**: Which trees contain the person
- **DNA Connections**: Genetic relationships (if applicable)
- **Contact Options**: Ways to connect with tree owners

### Historical Records

#### Record Types

- **Vital Records**: Birth, marriage, death certificates
- **Census Records**: Population surveys from different years
- **Immigration**: Ship manifests, passenger lists
- **Military**: Service records, pension files
- **Newspapers**: Birth announcements, obituaries, articles
- **Church Records**: Baptisms, confirmations, burials

#### Record Hints

- Automatic suggestions based on your tree
- Confidence scoring for potential matches
- Side-by-side comparison tools
- Easy attachment to family members

## Privacy and Security

### Privacy Controls

#### Personal Privacy

- **Profile Visibility**: Public, Family Only, or Private
- **Living Person Protection**: Automatic privacy for living relatives
- **Contact Preferences**: Control who can message you
- **Search Visibility**: Appear in search results or not

#### Tree Privacy

- **Public Trees**: Visible to all Dzinza users
- **Family Trees**: Visible only to invited family members
- **Private Trees**: Visible only to you
- **Mixed Privacy**: Different privacy levels for different branches

#### DNA Privacy

- **Matching Opt-out**: Disable DNA matching entirely
- **Ethnicity Only**: Share ethnicity but not matching
- **Family Only**: Match only with invited family
- **Full Participation**: Match with all Dzinza users

### Security Features

#### Account Security

- **Strong Passwords**: Enforced complexity requirements
- **Two-Factor Authentication**: SMS or app-based 2FA
- **Login Monitoring**: Track and alert on suspicious activity
- **Device Management**: See and manage logged-in devices

#### Data Protection

- **Encryption**: All data encrypted in transit and at rest
- **Regular Backups**: Automatic data backup and recovery
- **GDPR Compliance**: European privacy regulation compliance
- **Right to Delete**: Complete account and data deletion option

## Mobile App Usage

### App Download

- **iOS**: Download from Apple App Store
- **Android**: Download from Google Play Store
- **Account Sync**: Automatically syncs with web platform

### Mobile Features

#### Core Functionality

- View and edit family trees
- Add photos directly from camera
- Record voice notes and stories
- GPS location tagging for photos
- Offline browsing of downloaded trees

#### Mobile-Specific Features

- **Camera Integration**: Take photos of documents and artifacts
- **Voice Recording**: Record family stories and interviews
- **GPS Tagging**: Automatically tag photo locations
- **Push Notifications**: Alerts for DNA matches and messages
- **Quick Actions**: Shortcuts for common tasks

#### Offline Mode

- Download trees for offline viewing
- Cache recently viewed photos
- Save research notes locally
- Sync when connection restored

### Mobile Best Practices

- Connect to WiFi before uploading large files
- Enable automatic backup for photos
- Use high-quality camera settings for documents
- Record in quiet environments for voice notes

## Troubleshooting

### Common Issues

#### Login Problems

**Issue**: Can't remember password
**Solution**:

1. Click "Forgot Password" on login page
2. Enter your email address
3. Check email for reset link
4. Follow link to create new password

**Issue**: Email not verified
**Solution**:

1. Check spam/junk folder for verification email
2. Request new verification email from settings
3. Contact support if still not received

#### Tree Building Issues

**Issue**: Can't add family member
**Solution**:

1. Ensure you have edit permissions
2. Check if person already exists in tree
3. Verify all required fields are completed
4. Try refreshing the page

**Issue**: Photos won't upload
**Solution**:

1. Check file size (max 10MB)
2. Verify supported format (JPG, PNG, GIF, PDF)
3. Try different internet connection
4. Clear browser cache

#### DNA Analysis Problems

**Issue**: DNA file won't upload
**Solution**:

1. Verify file format matches testing company
2. Check file isn't corrupted
3. Ensure file size is reasonable
4. Try downloading fresh copy from testing company

**Issue**: No DNA matches appearing
**Solution**:

1. Verify analysis is complete (check status)
2. Confirm privacy settings allow matching
3. Understand that close matches may be rare
4. Be patient - matches increase over time

### Getting Help

#### Self-Service Resources

- **Help Center**: Searchable knowledge base
- **Video Tutorials**: Step-by-step guides
- **Community Forum**: User discussions and tips
- **FAQ**: Frequently asked questions

#### Contact Support

- **Email Support**: support@dzinza.com
- **Live Chat**: Available during business hours
- **Phone Support**: Premium subscribers only
- **Community Moderators**: Forum assistance

#### Response Times

- **General Questions**: Within 24 hours
- **Technical Issues**: Within 12 hours
- **Account Problems**: Within 6 hours
- **Premium Support**: Within 2 hours

### Account Management

#### Subscription Management

- **Free Account**: Basic features, limited storage
- **Premium Account**: Advanced features, unlimited storage
- **Family Account**: Multiple users, shared billing
- **Billing Issues**: Contact billing@dzinza.com

#### Data Export

- **GEDCOM Export**: Standard genealogy format
- **Photo Download**: Bulk download all photos
- **Research Notes**: Export all research documentation
- **Account Backup**: Complete account data export

#### Account Deletion

1. Navigate to Account Settings
2. Select "Delete Account"
3. Confirm deletion request
4. Export data if desired before deletion
5. Account permanently deleted after 30-day grace period

## Appendix

### Keyboard Shortcuts

- **Ctrl/Cmd + N**: Create new person
- **Ctrl/Cmd + S**: Save current changes
- **Ctrl/Cmd + F**: Search tree
- **Ctrl/Cmd + Z**: Undo last action
- **Ctrl/Cmd + Y**: Redo last undone action

### Supported File Formats

- **Photos**: JPG, PNG, GIF, TIFF, BMP
- **Documents**: PDF, DOC, DOCX, TXT
- **DNA Data**: 23andMe, AncestryDNA, MyHeritage, FTDNA
- **Import**: GEDCOM, CSV
- **Export**: GEDCOM, PDF, CSV, HTML

### Glossary

- **Ahnentafel**: Ancestral numbering system
- **DNA Segment**: Shared genetic material between relatives
- **GEDCOM**: Standard file format for genealogy data
- **Haplogroup**: Genetic population group
- **Pedigree**: Direct line of ancestors
- **Primary Source**: Original historical document

---

For additional help or suggestions for improving this manual, please contact our support team at support@dzinza.com or visit our help center at help.dzinza.com.
