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
import { register, Counter, Histogram, Gauge } from 'prom-client';

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

export const genealogyTreeOperations = new Counter({
  name: 'genealogy_tree_operations_total',
  help: 'Total genealogy tree operations',
  labelNames: ['operation', 'status']
});

export const dnaAnalysisJobs = new Gauge({
  name: 'dna_analysis_jobs_active',
  help: 'Number of active DNA analysis jobs'
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
  - job_name: 'kubernetes-pods'
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
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'dzinza-api',
    version: process.env.APP_VERSION
  },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Usage example
logger.info('User created family tree', {
  userId: user.id,
  treeId: tree.id,
  treeName: tree.name,
  duration: performance.now() - startTime
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
import { NodeTracerProvider } from '@opentelemetry/sdk-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const provider = new NodeTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'dzinza-api',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION,
  }),
});

const jaegerExporter = new JaegerExporter({
  endpoint: process.env.JAEGER_ENDPOINT || 'http://jaeger-collector:14268/api/traces',
});

provider.addSpanProcessor(new BatchSpanProcessor(jaegerExporter));
provider.register();
```

#### Custom Spans
```typescript
// genealogy-service.ts
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('genealogy-service');

export async function buildFamilyTree(userId: string, treeId: string) {
  const span = tracer.startSpan('build_family_tree');
  
  try {
    span.setAttributes({
      'user.id': userId,
      'tree.id': treeId,
      'operation': 'build_tree'
    });
    
    // Business logic here
    const result = await performTreeBuilding();
    
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.recordException(error);
    span.setStatus({ 
      code: SpanStatusCode.ERROR, 
      message: error.message 
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
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alerts@dzinza.com'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'
  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
    - match:
        severity: warning
      receiver: 'warning-alerts'

receivers:
  - name: 'critical-alerts'
    email_configs:
      - to: 'oncall@dzinza.com'
        subject: '[CRITICAL] {{ .GroupLabels.alertname }}'
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#alerts'
        title: 'Critical Alert'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
```

## Health Checks

### Application Health Endpoints

#### Health Check Implementation
```typescript
// health.ts
import { Router } from 'express';
import { Pool } from 'pg';
import Redis from 'ioredis';

const healthRouter = Router();

healthRouter.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      elasticsearch: await checkElasticsearch()
    }
  };
  
  const isHealthy = Object.values(health.checks).every(check => check.status === 'ok');
  
  res.status(isHealthy ? 200 : 503).json(health);
});

async function checkDatabase(): Promise<HealthCheck> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return { status: 'ok', responseTime: Date.now() - start };
  } catch (error) {
    return { status: 'error', error: error.message };
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
import { performance } from 'perf_hooks';

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
      httpRequestDuration.observe(
        { operation },
        duration / 1000
      );
    };
  }
}

// Usage
const endTimer = PerformanceTracker.startTimer('genealogy_search');
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
      "filter": [
        { "term": { "level": "error" } }
      ]
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
