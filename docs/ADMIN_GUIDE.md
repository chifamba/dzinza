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
    autoRenew: true
  };
  
  await user.save();
  
  // Log change
  await AuditLog.create({
    action: 'subscription_changed',
    userId,
    details: { oldPlan, newPlan },
    adminId: getCurrentAdmin().id
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
    action: 'admin_password_reset',
    userId,
    adminId,
    ipAddress: getClientIP()
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
      duplicateContent: await this.checkForDuplicates(photo)
    };
    
    if (Object.values(flags).some(flag => flag)) {
      await this.flagForReview(photoId, flags);
    }
    
    return { photoId, flags, requiresReview: Object.values(flags).some(f => f) };
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
  max_file_size: 10485760  # 10MB
  session_timeout: 3600    # 1 hour

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
  max_trees_premium: -1  # unlimited
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
    await pubsub.publish('feature_flag_update', { feature, enabled });
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
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100
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
  '23andme': {
    name: '23andMe',
    fileFormat: 'txt',
    requiredHeaders: ['rsid', 'chromosome', 'position', 'genotype'],
    processingFunction: 'process23andMeData'
  },
  'ancestry': {
    name: 'AncestryDNA',
    fileFormat: 'txt',
    requiredHeaders: ['rsid', 'chromosome', 'position', 'allele1', 'allele2'],
    processingFunction: 'processAncestryData'
  }
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
      lastActivity: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
    });
    
    logger.info(`Cleaned up ${result.deletedCount} expired sessions`);
  }
  
  async cleanupPendingDeletes() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const usersToDelete = await User.find({
      status: 'pending_deletion',
      deletionRequestedAt: { $lt: thirtyDaysAgo }
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
  SUPER_ADMIN = 'super_admin',
  SYSTEM_ADMIN = 'system_admin',
  USER_MODERATOR = 'user_moderator',
  CONTENT_MODERATOR = 'content_moderator',
  SUPPORT_AGENT = 'support_agent'
}

export const rolePermissions = {
  [AdminRole.SUPER_ADMIN]: ['*'], // All permissions
  [AdminRole.SYSTEM_ADMIN]: [
    'system.config',
    'system.monitoring',
    'database.admin',
    'user.admin'
  ],
  [AdminRole.USER_MODERATOR]: [
    'user.view',
    'user.suspend',
    'user.support'
  ],
  [AdminRole.CONTENT_MODERATOR]: [
    'content.review',
    'content.moderate',
    'user.view'
  ],
  [AdminRole.SUPPORT_AGENT]: [
    'user.view',
    'user.support',
    'ticket.manage'
  ]
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
      isActive: true
    });
    
    // Log admin login
    await AuditLog.create({
      action: 'admin_login',
      adminId,
      ipAddress,
      details: { sessionId: session.id }
    });
    
    return session;
  }
  
  static async validateSession(sessionId: string, ipAddress: string): Promise<boolean> {
    const session = await AdminSession.findById(sessionId);
    
    if (!session || !session.isActive || session.expiresAt < new Date()) {
      return false;
    }
    
    // Validate IP address consistency
    if (session.ipAddress !== ipAddress) {
      await this.flagSuspiciousActivity(session.adminId, 'ip_mismatch');
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
      this.checkPrivilegeEscalation(adminId, action)
    ];
    
    if (anomalies.some(anomaly => anomaly.detected)) {
      await this.triggerSecurityAlert(adminId, action, anomalies);
    }
  }
  
  private static async triggerSecurityAlert(adminId: string, action: string, anomalies: any[]) {
    const alert = await SecurityAlert.create({
      type: 'suspicious_admin_activity',
      severity: 'high',
      adminId,
      action,
      anomalies,
      timestamp: new Date()
    });
    
    // Notify security team
    await notificationService.sendSecurityAlert(alert);
    
    // Temporarily restrict admin if critical
    if (anomalies.some(a => a.severity === 'critical')) {
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
  async handleDataSubjectRequest(userId: string, requestType: 'access' | 'deletion' | 'portability') {
    const user = await User.findById(userId);
    
    switch (requestType) {
      case 'access':
        return await this.generateDataExport(userId);
      
      case 'deletion':
        return await this.scheduleDataDeletion(userId);
      
      case 'portability':
        return await this.generatePortableData(userId);
    }
  }
  
  private async generateDataExport(userId: string) {
    const userData = {
      profile: await User.findById(userId),
      trees: await FamilyTree.find({ ownerId: userId }),
      photos: await Photo.find({ uploadedBy: userId }),
      dnaData: await DNAData.find({ userId }),
      activityLog: await AuditLog.find({ userId })
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
      systemResources: await this.getResourceUtilization()
    };
    
    const report = await this.formatReport(metrics);
    await this.sendReportToStakeholders(report);
    
    return report;
  }
  
  private async getAverageResponseTime(): Promise<number> {
    const result = await RequestLog.aggregate([
      {
        $match: {
          timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: null,
          avgResponseTime: { $avg: '$responseTime' }
        }
      }
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
          from: 'tree_views',
          localField: '_id',
          foreignField: 'treeId',
          as: 'views'
        }
      },
      {
        $lookup: {
          from: 'tree_edits',
          localField: '_id',
          foreignField: 'treeId',
          as: 'edits'
        }
      },
      {
        $project: {
          name: 1,
          isPublic: 1,
          memberCount: { $size: '$members' },
          viewCount: { $size: '$views' },
          editCount: { $size: '$edits' },
          lastActivity: { $max: '$edits.timestamp' },
          engagementScore: {
            $add: [
              { $multiply: [{ $size: '$views' }, 1] },
              { $multiply: [{ $size: '$edits' }, 5] }
            ]
          }
        }
      },
      { $sort: { engagementScore: -1 } }
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
        this.verifyTableExists(testDb, 'users'),
        this.verifyTableExists(testDb, 'family_trees'),
        this.verifyDataIntegrity(testDb),
        this.verifyIndexes(testDb)
      ]);
      
      // Cleanup test database
      await this.dropTestDatabase(testDb);
      
      return verificationResults.every(result => result.success);
    } catch (error) {
      logger.error('Backup verification failed', { error, backupFile });
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
