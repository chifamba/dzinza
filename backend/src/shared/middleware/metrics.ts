import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';
import { logger } from '../utils/logger';

// Create a Registry
const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const activeConnections = new client.Gauge({
  name: 'http_active_connections',
  help: 'Number of active HTTP connections'
});

const databaseConnectionsActive = new client.Gauge({
  name: 'database_connections_active',
  help: 'Number of active database connections'
});

const databaseQueryDuration = new client.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

// Register metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);
register.registerMetric(activeConnections);
register.registerMetric(databaseConnectionsActive);
register.registerMetric(databaseQueryDuration);

/**
 * Middleware to collect HTTP metrics
 */
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Increment active connections
  activeConnections.inc();

  // Override res.end to capture metrics when response is sent
  const originalEnd = res.end;
  res.end = function(...args: any[]) {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path || 'unknown';
    const method = req.method;
    const statusCode = res.statusCode.toString();

    // Record metrics
    httpRequestDuration
      .labels(method, route, statusCode)
      .observe(duration);

    httpRequestsTotal
      .labels(method, route, statusCode)
      .inc();

    // Decrement active connections
    activeConnections.dec();

    // Log performance metrics
    logger.debug('HTTP request completed', {
      service: 'metrics',
      method,
      route,
      statusCode,
      duration: `${duration}s`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Call original end method
    originalEnd.apply(res, args);
  };

  next();
};

/**
 * Route to expose Prometheus metrics
 */
export const getMetrics = async (req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    logger.error('Error generating metrics:', error, { service: 'metrics' });
    res.status(500).json({ error: 'Failed to generate metrics' });
  }
};

/**
 * Update database connection metrics
 */
export const updateDatabaseMetrics = (activeConnections: number) => {
  databaseConnectionsActive.set(activeConnections);
};

/**
 * Record database query metrics
 */
export const recordDatabaseQuery = (operation: string, table: string, duration: number) => {
  databaseQueryDuration
    .labels(operation, table)
    .observe(duration / 1000); // Convert ms to seconds
};

/**
 * Get current metrics values for health checks
 */
export const getMetricsSnapshot = async () => {
  try {
    const metrics = await register.getMetricsAsJSON();
    
    const snapshot: any = {
      httpRequestsTotal: 0,
      activeConnections: 0,
      databaseConnectionsActive: 0,
      averageResponseTime: 0
    };

    metrics.forEach((metric: any) => {
      switch (metric.name) {
        case 'http_requests_total':
          snapshot.httpRequestsTotal = metric.values.reduce(
            (sum: number, val: any) => sum + val.value, 0
          );
          break;
        case 'http_active_connections':
          snapshot.activeConnections = metric.values[0]?.value || 0;
          break;
        case 'database_connections_active':
          snapshot.databaseConnectionsActive = metric.values[0]?.value || 0;
          break;
        case 'http_request_duration_seconds':
          // Calculate average from histogram
          if (metric.values.length > 0) {
            const sum = metric.values.find((v: any) => v.labels.quantile === undefined)?.value || 0;
            const count = metric.values.find((v: any) => v.metricName?.endsWith('_count'))?.value || 1;
            snapshot.averageResponseTime = sum / count;
          }
          break;
      }
    });

    return snapshot;
  } catch (error) {
    logger.error('Error getting metrics snapshot:', error, { service: 'metrics' });
    return null;
  }
};

export { register };
export default metricsMiddleware;
