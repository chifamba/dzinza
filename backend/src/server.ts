import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { logger } from './shared/utils/logger';
import { errorHandler } from './shared/middleware/errorHandler';
import { authMiddleware } from './shared/middleware/auth';
import { validateRequest } from './shared/middleware/validation';
import { metricsMiddleware } from './shared/middleware/metrics';
import { healthRoutes } from './routes/health';
import { authRoutes } from './routes/auth';
import { swaggerOptions } from './config/swagger';

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.dzinza.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.API_RATE_LIMIT || '100'),
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// General middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// Metrics middleware
app.use(metricsMiddleware);

// Swagger documentation
const specs = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Dzinza API Documentation'
}));

// Health check routes
app.use('/health', healthRoutes);

// Authentication routes (handled by gateway)
app.use('/api/auth', authRoutes);

// Microservice proxies with authentication
app.use('/api/genealogy', 
  authMiddleware,
  createProxyMiddleware({
    target: 'http://genealogy-service:3003',
    changeOrigin: true,
    pathRewrite: { '^/api/genealogy': '' },
    onError: (err, req, res) => {
      logger.error('Genealogy service proxy error:', err);
      res.status(503).json({ error: 'Genealogy service unavailable' });
    }
  })
);

app.use('/api/search',
  authMiddleware,
  createProxyMiddleware({
    target: 'http://search-service:3004',
    changeOrigin: true,
    pathRewrite: { '^/api/search': '' },
    onError: (err, req, res) => {
      logger.error('Search service proxy error:', err);
      res.status(503).json({ error: 'Search service unavailable' });
    }
  })
);

app.use('/api/storage',
  authMiddleware,
  createProxyMiddleware({
    target: 'http://storage-service:3005',
    changeOrigin: true,
    pathRewrite: { '^/api/storage': '' },
    onError: (err, req, res) => {
      logger.error('Storage service proxy error:', err);
      res.status(503).json({ error: 'Storage service unavailable' });
    }
  })
);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

app.listen(PORT, () => {
  logger.info(`Dzinza API Gateway running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
  logger.info(`API Documentation: http://localhost:${PORT}/api/docs`);
});

export default app;
