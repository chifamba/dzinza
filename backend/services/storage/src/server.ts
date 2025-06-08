import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import promMiddleware from 'express-prometheus-middleware';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cron from 'node-cron';

import { logger } from '@shared/utils/logger';
import { errorHandler } from '@shared/middleware/errorHandler';
import { authMiddleware } from '@shared/middleware/auth';
import { S3Service } from './services/s3';
import { ImageProcessor } from './services/imageProcessor';
import { CleanupService } from './services/cleanup';
import fileRoutes from './routes/files';
import mediaRoutes from './routes/media';
import adminRoutes from './routes/admin';

dotenv.config();

const app = express();
const PORT = process.env.STORAGE_SERVICE_PORT || 3005;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow file uploads
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));

app.use(compression());

// Rate limiting - more generous for file uploads
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// File upload specific rate limiting
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: 'Too many file uploads, please try again later.',
});

app.use('/api', limiter);
app.use('/api/files/upload', uploadLimiter);
app.use('/api/media/upload', uploadLimiter);

// Prometheus metrics
app.use(promMiddleware({
  metricsPath: '/metrics',
  collectDefaultMetrics: true,
  requestDurationBuckets: [0.1, 0.5, 1, 1.5, 2, 3, 5, 10, 30],
}));

// Body parsing middleware - larger limits for file metadata
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// MongoDB connection
const connectMongoDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dzinza_storage';
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB for Storage Service');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Initialize services
const initializeServices = async () => {
  try {
    await S3Service.initialize();
    await ImageProcessor.initialize();
    CleanupService.initialize(); // Initialize cleanup service
    logger.info('Storage services initialized');
  } catch (error) {
    logger.error('Service initialization error:', error);
    process.exit(1);
  }
};

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Dzinza Storage Service API',
      version: '1.0.0',
      description: 'File storage and media management service for genealogy documents, photos, and historical records',
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
        url: 'https://api.dzinza.com/storage',
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
  customSiteTitle: 'Dzinza Storage API Documentation'
}));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'storage',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    storage: {
      s3: S3Service.isConnected(),
      imageProcessor: ImageProcessor.isReady()
    }
  });
});

// Apply authentication middleware to protected routes
app.use('/api/files', authMiddleware);
app.use('/api/media', authMiddleware);
app.use('/api/admin', authMiddleware);

// Routes
app.use('/api/files', fileRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/admin', adminRoutes);

// Public file serving (with proper security headers)
app.use('/public', express.static('public', {
  maxAge: '1d',
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Scheduled cleanup tasks are now handled by CleanupService
// The service initializes its own cron jobs when initialized

// Start server
const startServer = async () => {
  try {
    await connectMongoDB();
    await initializeServices();
    
    app.listen(PORT, () => {
      logger.info(`Storage Service running on port ${PORT}`);
      logger.info(`API Documentation available at http://localhost:${PORT}/api-docs`);
      logger.info(`Health check available at http://localhost:${PORT}/health`);
      logger.info(`Metrics available at http://localhost:${PORT}/metrics`);
    });
  } catch (error) {
    logger.error('Failed to start storage service:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await mongoose.connection.close();
  await S3Service.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await mongoose.connection.close();
  await S3Service.close();
  process.exit(0);
});

startServer();

export default app;
