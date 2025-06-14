import { Registry, collectDefaultMetrics, Counter, Histogram } from 'prom-client';

const registry = new Registry();
collectDefaultMetrics({ register: registry, prefix: 'genealogy_service_' });

export const httpRequestCounter = new Counter({
  name: 'genealogy_service_http_requests_total',
  help: 'Total HTTP requests for genealogy-service',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
});

export const httpRequestDurationMicroseconds = new Histogram({
  name: 'genealogy_service_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds for genealogy-service',
  labelNames: ['method', 'route', 'code'],
  registers: [registry],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

// Custom metrics
export const familyTreeCreationsCounter = new Counter({
  name: 'genealogy_service_family_tree_creations_total',
  help: 'Total number of family trees created',
  registers: [registry],
});

export const personAdditionsCounter = new Counter({
  name: 'genealogy_service_person_additions_total',
  help: 'Total number of persons added to trees',
  labelNames: ['tree_id'],
  registers: [registry],
});

export default registry;
