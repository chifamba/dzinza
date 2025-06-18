import { Request, Response, NextFunction } from "express";
import client from "prom-client";
import { logger } from "../utils/logger";

// Create a Registry
const register = new client.Registry();

// Add default metrics (CPU, memory, etc.) with a service-specific prefix
client.collectDefaultMetrics({ register, prefix: "backend_service_" });

// Custom metrics
export const httpRequestDuration = new client.Histogram({
  name: "backend_service_http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds for the backend service",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.1, 0.5, 1, 2, 5, 10], // Consider standardizing buckets across services or using default
});

export const httpRequestsTotal = new client.Counter({
  name: "backend_service_http_requests_total",
  help: "Total number of HTTP requests for the backend service",
  labelNames: ["method", "route", "status_code"],
});

export const activeConnections = new client.Gauge({
  name: "backend_service_http_active_connections",
  help: "Number of active HTTP connections for the backend service",
});

export const databaseConnectionsActive = new client.Gauge({
  name: "backend_service_database_connections_active",
  help: "Number of active database connections for the backend service",
});

export const databaseQueryDuration = new client.Histogram({
  name: "backend_service_database_query_duration_seconds",
  help: "Duration of database queries in seconds for the backend service",
  labelNames: ["operation", "table"],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

// --- New service-specific metrics for backend-service ---
export const userProfileRequestsCounter = new client.Counter({
  name: "backend_service_user_profile_requests_total",
  help: "Total number of user profile requests processed by backend-service",
  labelNames: ["profile_type"], // e.g., 'full', 'summary'
});

// Register metrics (prom-client typically auto-registers metrics defined with a 'name' unless `register` option is explicitly passed to constructor)
// However, explicit registration is fine too. Let's ensure all are covered.
// No need to call register.registerMetric(metric) if it's already associated with 'register' in its constructor,
// or if 'prom-client.register' (default global registry) is used and 'register' is that default.
// Here, 'register' is a new client.Registry(), so metrics need to be associated with it.
// The current code does not pass `registers: [register]` to constructors, so explicit registration is needed.
// For consistency and clarity, I'll add `registers: [register]` to each metric constructor
// and remove the explicit `register.registerMetric` calls.

// Updated metric definitions with explicit registration:
// (Re-declaring them here to show the change, actual code would modify existing ones)

// const httpRequestDuration = new client.Histogram({
//   name: 'backend_service_http_request_duration_seconds',
//   help: 'Duration of HTTP requests in seconds for the backend service',
//   labelNames: ['method', 'route', 'status_code'],
//   buckets: [0.1, 0.5, 1, 2, 5, 10],
//   registers: [register] // Added
// });
// ... and so on for all metrics. I will apply this pattern in the actual diff.

// The original code had explicit register.registerMetric() calls, which is fine.
// I will keep that pattern and just add the new metric to it.
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);
register.registerMetric(activeConnections);
register.registerMetric(databaseConnectionsActive);
register.registerMetric(databaseQueryDuration);
register.registerMetric(userProfileRequestsCounter); // Register the new metric

/**
 * Middleware to collect HTTP metrics
 */
export const metricsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();

  // Increment active connections
  activeConnections.inc();

  // Override res.end to capture metrics when response is sent
  const originalEnd = res.end;
  res.end = function (this: Response, ...args: unknown[]): Response { // Typed this, args, and return
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path || "unknown";
    const method = req.method;
    const statusCode = res.statusCode.toString();

    // Record metrics
    httpRequestDuration.labels(method, route, statusCode).observe(duration);

    httpRequestsTotal.labels(method, route, statusCode).inc();

    // Decrement active connections
    activeConnections.dec();

    // Log performance metrics
    logger.debug("HTTP request completed", {
      service: "metrics",
      method,
      route,
      statusCode,
      duration: `${duration}s`,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });

    // Call original end method
    // Type assertion for args in apply, assuming originalEnd expects similar signature parts.
    return originalEnd.apply(this, args as [chunk?: string | Buffer, encoding?: string, cb?: (() => void)?]);
  }; // Removed 'as any' for the function assignment

  next();
};

/**
 * Route to expose Prometheus metrics
 */
export const getMetrics = async (req: Request, res: Response) => {
  try {
    res.set("Content-Type", register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    logger.error("Error generating metrics:", error, { service: "metrics" });
    res.status(500).json({ error: "Failed to generate metrics" });
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
export const recordDatabaseQuery = (
  operation: string,
  table: string,
  duration: number
) => {
  databaseQueryDuration.labels(operation, table).observe(duration / 1000); // Convert ms to seconds
};

/**
 * Get current metrics values for health checks
 */
export const getMetricsSnapshot = async () => {
  try {
    const metrics = await register.getMetricsAsJSON();

    interface MetricValue {
      value: number;
      labels: Record<string, string | number>;
      metricName?: string; // For histograms, sum/count might have this
      quantile?: number; // For histograms/summaries
    }

    interface PrometheusMetric {
      name: string;
      help: string;
      type: string;
      values: MetricValue[];
      aggregator: string;
    }

    interface MetricsSnapshotValues {
      httpRequestsTotal: number;
      activeConnections: number;
      databaseConnectionsActive: number;
      averageResponseTime: number;
    }

    const snapshot: MetricsSnapshotValues = {
      httpRequestsTotal: 0,
      activeConnections: 0,
      databaseConnectionsActive: 0,
      averageResponseTime: 0,
    };

    metrics.forEach((metric: PrometheusMetric) => {
      switch (metric.name) {
        case "http_requests_total": // This should match the actual metric name from prom-client
        case "backend_service_http_requests_total": // Or this if prefix is applied by default
          snapshot.httpRequestsTotal = metric.values.reduce(
            (sum: number, val: MetricValue) => sum + val.value,
            0
          );
          break;
        case "backend_service_http_active_connections":
          snapshot.activeConnections = metric.values[0]?.value || 0;
          break;
        case "backend_service_database_connections_active":
          snapshot.databaseConnectionsActive = metric.values[0]?.value || 0;
          break;
        case "backend_service_http_request_duration_seconds":
          // Calculate average from histogram
          if (metric.values.length > 0) {
            // The sum for a histogram is typically the metric name without _bucket, _sum, or _count
            // For a histogram, prom-client usually gives _sum and _count metrics separately or as part of values
            const sumMetricValue = metric.values.find(v => v.metricName === `${metric.name}_sum`);
            const countMetricValue = metric.values.find(v => v.metricName === `${metric.name}_count`);

            const sum = sumMetricValue?.value || metric.values.find(v => !v.labels.quantile && !v.labels.le)?.value || 0; // Fallback for simple sum if not _sum
            const count = countMetricValue?.value || 1; // Avoid division by zero

            if (count > 0) {
                 snapshot.averageResponseTime = sum / count;
            }
          }
          break;
      }
    });

    return snapshot;
  } catch (error) {
    logger.error("Error getting metrics snapshot:", error, {
      service: "metrics",
    });
    return null;
  }
};

export { register };
export default metricsMiddleware;
