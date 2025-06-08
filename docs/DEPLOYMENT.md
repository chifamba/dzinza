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
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/ready', async (req, res) => {
  try {
    // Check database connection
    await db.raw('SELECT 1');
    
    // Check Redis connection
    await redis.ping();
    
    res.status(200).json({
      status: 'ready',
      database: 'connected',
      redis: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error.message
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
const distribution = new aws.cloudfront.Distribution('dzinza-cdn', {
  origins: [{
    domainName: 'dzinza.com',
    originId: 'dzinza-origin',
    customOriginConfig: {
      httpPort: 80,
      httpsPort: 443,
      originProtocolPolicy: 'https-only'
    }
  }],
  defaultCacheBehavior: {
    targetOriginId: 'dzinza-origin',
    viewerProtocolPolicy: 'redirect-to-https',
    cachePolicyId: '4135ea2d-6df8-44a3-9df3-4b5a84be39ad' // Managed-CachingOptimized
  },
  priceClass: 'PriceClass_100'
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
