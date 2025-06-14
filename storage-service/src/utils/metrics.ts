import { Registry, collectDefaultMetrics, Counter, Histogram } from 'prom-client';

const registry = new Registry();
collectDefaultMetrics({ register: registry, prefix: 'storage_service_' });

export const httpRequestCounter = new Counter({
  name: 'storage_service_http_requests_total',
  help: 'Total HTTP requests for storage-service',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
});

export const httpRequestDurationMicroseconds = new Histogram({
  name: 'storage_service_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds for storage-service',
  labelNames: ['method', 'route', 'code'],
  registers: [registry],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2.5, 5, 10], // Buckets for file operations
});

// Custom metrics
export const filesUploadedCounter = new Counter({
  name: 'storage_service_files_uploaded_total',
  help: 'Total number of files uploaded',
  labelNames: ['file_type', 'storage_type'], // e.g., file_type: 'image/jpeg', storage_type: 's3'
  registers: [registry],
});

export const filesDownloadedCounter = new Counter({
  name: 'storage_service_files_downloaded_total',
  help: 'Total number of files downloaded',
  labelNames: ['storage_type'],
  registers: [registry],
});

export const storageUsageGauge = new Histogram({ // Using Histogram as a Gauge for total size might be tricky.
                                            // A Gauge is more direct for total size if it can be easily fetched.
                                            // Using Histogram here to track distribution of file sizes uploaded.
  name: 'storage_service_uploaded_file_size_bytes',
  help: 'Distribution of uploaded file sizes in bytes',
  labelNames: ['file_type', 'storage_type'],
  registers: [registry],
  buckets: [1024, 10240, 51200, 102400, 512000, 1048576, 5242880, 10485760, 52428800], // 1KB to 50MB
});


export default registry;
