import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import promMiddleware from 'express-prometheus-middleware';
import dotenv from 'dotenv';

import { logger } from '../../../shared/utils/logger';
import { errorHandler } from '../../../shared/middleware/errorHandler';
import { authMiddleware } from '../../../shared/middleware/auth';
import { serviceDiscovery } from './config/services';
import { rateLimitConfig } from './config/rateLimit';
import { swaggerConfig } from './config/swagger';
import monitorRoutes from './routes/monitor';

dotenv.config();

const app = express();
const PORT = process.env.GATEWAY_PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:", "wss:"],
    },
  },
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://dzinza.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
}));

app.use(compression());

// JSON parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const generalLimiter = rateLimit(rateLimitConfig.general);
const authLimiter = rateLimit(rateLimitConfig.auth);
const uploadLimiter = rateLimit(rateLimitConfig.upload);

app.use('/api/auth', authLimiter);
app.use('/api/storage/upload', uploadLimiter);
app.use('/', generalLimiter);

// Prometheus metrics
app.use(promMiddleware({
  metricsPath: '/metrics',
  collectDefaultMetrics: true,
  requestDurationBuckets: [0.1, 0.5, 1, 1.5, 2, 3, 5, 10],
}));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime()
  });
});

// Swagger documentation
const specs = swaggerJsdoc(swaggerConfig);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Dzinza API Documentation'
}));

// Monitoring routes
app.use('/monitor', monitorRoutes);

// Service proxies with authentication middleware where needed
const services = serviceDiscovery();

// Auth service - no auth required for login/register
app.use('/api/auth', createProxyMiddleware({
  target: services.auth,
  changeOrigin: true,
  pathRewrite: {
    '^/api/auth': ''
  },
  onError: (err, req, res) => {
    logger.error('Auth service proxy error:', { error: err.message });
    res.status(503).json({ error: 'Auth service unavailable' });
  },
  onProxyReq: (proxyReq, req) => {
    // Add correlation ID for tracing
    const correlationId = req.headers['x-correlation-id'] || `gateway-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    proxyReq.setHeader('X-Correlation-ID', correlationId);
  }
}));

// Protected routes that require authentication
const protectedServices = [
  { path: '/api/genealogy', target: services.genealogy },
  { path: '/api/storage', target: services.storage },
  { path: '/api/search', target: services.search }
];

protectedServices.forEach(({ path, target }) => {
  app.use(path, authMiddleware, createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: {
      [`^${path}`]: ''
    },
    onError: (err, req, res) => {
      logger.error(`${path} service proxy error:`, { error: err.message });
      res.status(503).json({ error: `${path.replace('/api/', '')} service unavailable` });
    },
    onProxyReq: (proxyReq, req) => {
      // Forward user information from auth middleware
      if (req.user) {
        proxyReq.setHeader('X-User-ID', req.user.id);
        proxyReq.setHeader('X-User-Email', req.user.email);
        proxyReq.setHeader('X-User-Role', req.user.role);
      }
      
      // Add correlation ID for tracing
      const correlationId = req.headers['x-correlation-id'] || `gateway-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      proxyReq.setHeader('X-Correlation-ID', correlationId);
    }
  }));
});

// Fallback route for unmatched paths
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
    path: req.originalUrl
  });
});

// Error handling
app.use(errorHandler);

// Graceful shutdown
const server = app.listen(PORT, () => {
  logger.info(`Dzinza API Gateway running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  logger.info(`API Documentation: http://localhost:${PORT}/api-docs`);
  logger.info(`Health Check: http://localhost:${PORT}/health`);
});

const gracefulShutdown = () => {
  logger.info('Received shutdown signal, closing server gracefully...');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export default app;
