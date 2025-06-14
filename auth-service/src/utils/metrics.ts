import { Registry, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

// Create a Registry which registers the metrics
const registry = new Registry();

// Enable default metrics collection
collectDefaultMetrics({ register: registry, prefix: 'auth_service_' });

// Define a custom HTTP requests counter
export const httpRequestCounter = new Counter({
  name: 'auth_service_http_requests_total',
  help: 'Total number of HTTP requests made to the auth service',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
});

// Define a custom HTTP request duration histogram
export const httpRequestDurationMicroseconds = new Histogram({
  name: 'auth_service_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds for the auth service',
  labelNames: ['method', 'route', 'code'],
  registers: [registry],
  // Buckets for response time from 0.1ms to 10 seconds
  buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

// --- Service-specific metrics ---

// Counter for successful logins
export const successfulLoginsCounter = new Counter({
  name: 'auth_service_logins_successful_total',
  help: 'Total number of successful user logins',
  registers: [registry],
});

// Counter for failed logins
export const failedLoginsCounter = new Counter({
  name: 'auth_service_logins_failed_total',
  help: 'Total number of failed user logins',
  labelNames: ['reason'], // e.g., invalid_password, user_not_found
  registers: [registry],
});

// Counter for user registrations
export const userRegistrationsCounter = new Counter({
  name: 'auth_service_user_registrations_total',
  help: 'Total number of new user registrations',
  registers: [registry],
});

// Counter for token refreshes
export const tokenRefreshesCounter = new Counter({
  name: 'auth_service_token_refreshes_total',
  help: 'Total number of successful token refreshes',
  registers: [registry],
});

// Gauge for currently active refresh tokens (example, might be complex to implement accurately without DB polling)
// export const activeRefreshTokensGauge = new Gauge({
//   name: 'auth_service_active_refresh_tokens',
//   help: 'Number of currently active (non-revoked, non-expired) refresh tokens',
//   registers: [registry],
//   async collect() {
//     // This would require a DB call to count active tokens.
//     // For simplicity, this example won't implement the DB call here.
//     // this.set(await RefreshToken.countDocuments({ isRevoked: false, expiresAt: { $gt: new Date() } }));
//   }
// });


export default registry;
