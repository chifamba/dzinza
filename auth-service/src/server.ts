import express, { Request, Response } from 'express'; // Added Response
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
// Removed duplicate imports
import { authRoutes } from './routes/auth';
import { mfaRoutes } from './routes/mfa';
import { passwordRoutes } from './routes/password';
import { adminRoutes } from './routes/admin';
import { socialAuthRoutes } from './routes/socialAuth'; // Import social auth routes
import passport from './config/passport'; // Import passport configuration
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { connectDB } from './config/database';
import { connectRedis } from './config/redis';
import { AuthenticatedRequest } from './middleware/authMiddleware'; // Assuming this is where it's defined
import metricsRegistry, { httpRequestCounter, httpRequestDurationMicroseconds } from './utils/metrics'; // Import registry and specific metrics
import { initTracer } from './utils/tracing'; // Import OpenTelemetry tracer initialization

// Initialize OpenTelemetry Tracer
// IMPORTANT: This should be done as early as possible in the application lifecycle.
const OTEL_SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'auth-service';
const JAEGER_ENDPOINT = process.env.JAEGER_ENDPOINT || 'http://localhost:4318/v1/traces'; // Default OTLP HTTP endpoint
const NODE_ENV = process.env.NODE_ENV || 'development';

if (process.env.ENABLE_TRACING === 'true') { // Add a flag to enable/disable tracing
  initTracer(OTEL_SERVICE_NAME, JAEGER_ENDPOINT, NODE_ENV);
}


const app = express();
const PORT = process.env.PORT || 3002;

// Initialize connections
connectDB();
connectRedis();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting - stricter for auth service
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authenticatedUserActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each authenticated user to 20 requests per windowMs for sensitive actions
  message: {
    error: 'Too many requests for this action, please try again later.',
  },
  keyGenerator: (req: AuthenticatedRequest) => { // Typed req
    // Use user ID for rate limiting if available (user is authenticated)
    // Fallback to IP if user ID is not available for some reason
    return req.user?.id || req.ip;
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // General limit for other routes
  message: {
    error: 'Too many requests from this IP, please try again later.',
  }
});

app.use('/auth/login', authLimiter);
app.use('/auth/register', authLimiter);
// /auth/forgot-password is in passwordRoutes, which has its own rateLimitByEmail
// app.use('/auth/forgot-password', authLimiter); // This was incorrect, passwordRoutes handles its own.
app.use('/auth/request-verification', authenticatedUserActionLimiter);


// Apply generalLimiter to all other routes or as a fallback.
// Note: Order matters. Specific limiters should be applied before general ones
// if they target overlapping paths. If generalLimiter is applied to '/',
// it might catch requests already handled by more specific limiters if not ordered carefully.
// For now, specific auth routes are limited, and a general one is applied to '/'.
// The /auth/forgot-password in password.ts uses rateLimitByEmail.
// The / route for generalLimiter should be broad but ensure it doesn't override more specific limiters.
// A common practice is to apply general limiter to all ('/') and then specific ones to specific routes.
// Express applies middleware in order.
// Let's apply generalLimiter first to all routes, then more specific ones.
app.use('/', generalLimiter); // General limiter for all requests
app.use('/auth/login', authLimiter); // Override for /auth/login
app.use('/auth/register', authLimiter); // Override for /auth/register
app.use('/auth/request-verification', authenticatedUserActionLimiter); // Override for /auth/request-verification
// Note: /password/forgot-password uses its own `rateLimitByEmail` inside password.ts, which is fine.


// General middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize Passport
app.use(passport.initialize());

// HTTP Metrics Collection Middleware
app.use((req: Request, res: Response, next: Function) => {
  const start = Date.now();
  res.on('finish', () => {
    const durationSeconds = (Date.now() - start) / 1000;
    // Try to get the matched route path, otherwise fall back to the URL path
    const route = req.route?.path || req.path;
    const statusCode = res.statusCode.toString();

    httpRequestDurationMicroseconds
      .labels(req.method, route, statusCode) // Ensure 'code' label in metric definition matches or use statusCode here
      .observe(durationSeconds);
    httpRequestCounter
      .labels(req.method, route, statusCode)
      .inc();
  });
  next();
});

// Metrics endpoint
app.get('/metrics', async (req: Request, res: Response) => {
  try {
    res.set('Content-Type', metricsRegistry.contentType);
    res.end(await metricsRegistry.metrics());
  } catch (ex) {
    res.status(500).end(ex);
  }
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Routes
app.use('/auth', authRoutes);
app.use('/mfa', mfaRoutes);
app.use('/password', passwordRoutes);
app.use('/admin', adminRoutes);
app.use('/social', socialAuthRoutes); // Use social auth routes

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Dzinza Auth Service running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});

export default app;
