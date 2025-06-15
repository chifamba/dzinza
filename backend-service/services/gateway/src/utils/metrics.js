"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.proxiedRequestsCounter = void 0;
var prom_client_1 = require("prom-client"); // Use the global registry
// Custom metric for proxied requests
// This metric will be automatically registered with the globalRegistry when defined.
exports.proxiedRequestsCounter = new prom_client_1.Counter({
    name: 'gateway_service_proxied_requests_total',
    help: 'Total number of requests proxied to backend services by the gateway',
    labelNames: ['target_service', 'route', 'status_code'], // Added status_code
});
// Example of how to increment this counter (would be done in proxy logic)
// proxiedRequestsCounter.labels('auth-service', '/login', '200').inc();
// No need to export 'registry' as we're using the global one,
// which express-prometheus-middleware also uses by default.
// Default metrics and HTTP metrics are handled by express-prometheus-middleware.
// This file is now just for additional custom metrics specific to the gateway's functionality.
