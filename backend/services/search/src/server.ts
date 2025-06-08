import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import promMiddleware from 'express-prometheus-middleware';
import { createProxyMiddleware } from 'http-proxy-middleware';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import { logger } from '../../shared/utils/logger';
import { errorHandler } from '../../shared/middleware/errorHandler';
import { authMiddleware } from '../../shared/middleware/auth';
import { ElasticsearchService } from './services/elasticsearch';
import searchRoutes from './routes/search';
import analyticsRoutes from './routes/analytics';

dotenv.config();

const app = express();
const PORT = process.env.SEARCH_SERVICE_PORT || 3003;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));

app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Prometheus metrics
app.use(promMiddleware({
  metricsPath: '/metrics',
  collectDefaultMetrics: true,
  requestDurationBuckets: [0.1, 0.5, 1, 1.5, 2, 3, 5, 10],
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB connection
const connectMongoDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dzinza_search';
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB for Search Service');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Initialize Elasticsearch
const initializeElasticsearch = async () => {
  try {
    await ElasticsearchService.initialize();
    logger.info('Elasticsearch service initialized');
  } catch (error) {
    logger.error('Elasticsearch initialization error:', error);
    process.exit(1);
  }
};

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Dzinza Search Service API',
      version: '1.0.0',
      description: 'Advanced search capabilities for genealogy data including people, records, and historical documents',
      contact: {
        name: 'Dzinza Team',
        email: 'api@dzinza.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server'
      },
      {
        url: 'https://api.dzinza.com/search',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.ts', './src/models/*.ts']
};

const specs = swaggerJsdoc(swaggerOptions);

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Dzinza Search API Documentation'
}));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'search',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Apply authentication middleware to protected routes
app.use('/api/search', authMiddleware);
app.use('/api/analytics', authMiddleware);

// Routes
app.use('/api/search', searchRoutes);
app.use('/api/analytics', analyticsRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Start server
const startServer = async () => {
  try {
    await connectMongoDB();
    await initializeElasticsearch();
    
    app.listen(PORT, () => {
      logger.info(`Search Service running on port ${PORT}`);
      logger.info(`API Documentation available at http://localhost:${PORT}/api-docs`);
      logger.info(`Health check available at http://localhost:${PORT}/health`);
      logger.info(`Metrics available at http://localhost:${PORT}/metrics`);
    });
  } catch (error) {
    logger.error('Failed to start search service:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await mongoose.connection.close();
  await ElasticsearchService.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await mongoose.connection.close();
  await ElasticsearchService.close();
  process.exit(0);
});

startServer();

export default app;
