import { Registry, collectDefaultMetrics, Counter, Histogram } from 'prom-client';

const registry = new Registry();
collectDefaultMetrics({ register: registry, prefix: 'search_service_' });

export const httpRequestCounter = new Counter({
  name: 'search_service_http_requests_total',
  help: 'Total HTTP requests for search-service',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
});

export const httpRequestDurationMicroseconds = new Histogram({
  name: 'search_service_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds for search-service',
  labelNames: ['method', 'route', 'code'],
  registers: [registry],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5], // Search might be faster or slower
});

// Custom metrics
export const searchQueriesCounter = new Counter({
  name: 'search_service_queries_total',
  help: 'Total number of search queries performed',
  labelNames: ['query_type', 'index_searched'], // e.g., query_type: 'keyword', index_searched: 'people'
  registers: [registry],
});

export const searchResultsCounter = new Counter({
  name: 'search_service_results_count_total', // This name might be confusing, maybe 'search_service_documents_returned_total'
  help: 'Total number of documents/results returned by searches',
  labelNames: ['query_type'],
  registers: [registry],
});

export default registry;
