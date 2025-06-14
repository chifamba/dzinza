import { Router, Request, Response, NextFunction } from 'express'; // Import Request, Response, NextFunction
import { trace, SpanStatusCode, Span } from '@opentelemetry/api'; // Import OpenTelemetry API
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { database } from '../config/database';
import { logger } from '../shared/utils/logger';

const router = Router();

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-key';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '24h';
const REFRESH_TOKEN_EXPIRE = process.env.REFRESH_TOKEN_EXPIRE || '7d';

// Ensure JWT_SECRET is a string for TypeScript
if (!JWT_SECRET || typeof JWT_SECRET !== 'string') {
  throw new Error('JWT_SECRET must be defined as a string');
}

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               username:
 *                 type: string
 *                 minLength: 3
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already exists
 */
router.post('/register', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, number, and special character'),
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name is required and must be less than 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name is required and must be less than 50 characters'),
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-50 characters and contain only letters, numbers, and underscores'),
], async (req: Request, res: Response, next: NextFunction) => { // Typed req, res, next
  const tracer = trace.getTracer('backend-service-auth-routes');
  await tracer.startActiveSpan('backend.auth.register.handler', async (span: Span) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const { email, password, firstName, lastName, username } = req.body;

    // Check if user already exists
    const existingUserCheck = await database.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUserCheck.rows.length > 0) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Email or username already exists'
      });
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const userId = uuidv4();
    const emailVerificationToken = uuidv4();
    
    const result = await database.query(`
      INSERT INTO users (
        id, email, username, password_hash, first_name, last_name, 
        email_verification_token, email_verification_expires
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, email, username, first_name, last_name, created_at
    `, [
      userId,
      email,
      username,
      hashedPassword,
      firstName,
      lastName,
      emailVerificationToken,
      new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    ]);

    const user = result.rows[0];

    // Generate JWT tokens
    const accessToken = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        username: user.username 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRE }
    );

    logger.info('User registered successfully', {
      service: 'auth',
      userId: user.id,
      email: user.email,
      username: user.username
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        createdAt: user.created_at
      },
      tokens: {
        accessToken,
        refreshToken
      }
    });

      span.end();
    } catch (error) {
      const err = error as Error;
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
      span.end();
      logger.error('Registration failed:', err, { service: 'auth' });
      next(err);
    }
  });
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *               - password
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Email or username
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 *       423:
 *         description: Account locked
 */
router.post('/login', [
  body('identifier')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Email or username is required'),
  body('password')
    .isLength({ min: 1 })
    .withMessage('Password is required'),
], async (req: Request, res: Response, next: NextFunction) => { // Typed req, res, next
  const tracer = trace.getTracer('backend-service-auth-routes');
  await tracer.startActiveSpan('backend.auth.login.handler', async (span: Span) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation Error',
        details: errors.array()
      });
    }

    const { identifier, password } = req.body;

    // Find user by email or username
    const userResult = await database.query(`
      SELECT 
        id, email, username, password_hash, first_name, last_name,
        failed_login_attempts, locked_until, is_active, last_login
      FROM users 
      WHERE (email = $1 OR username = $1) AND is_active = true
    `, [identifier]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: 'Authentication Failed',
        message: 'Invalid credentials'
      });
    }

    const user = userResult.rows[0];

    // Check if account is locked
    if (user.locked_until && new Date() < new Date(user.locked_until)) {
      return res.status(423).json({
        error: 'Account Locked',
        message: 'Account is temporarily locked due to multiple failed login attempts'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      // Increment failed login attempts
      const newFailedAttempts = (user.failed_login_attempts || 0) + 1;
      const lockAccount = newFailedAttempts >= 5;
      
      await database.query(`
        UPDATE users 
        SET failed_login_attempts = $1, locked_until = $2
        WHERE id = $3
      `, [
        newFailedAttempts,
        lockAccount ? new Date(Date.now() + 30 * 60 * 1000) : null, // Lock for 30 minutes
        user.id
      ]);

      return res.status(401).json({
        error: 'Authentication Failed',
        message: 'Invalid credentials'
      });
    }

    // Reset failed login attempts and update last login
    await database.query(`
      UPDATE users 
      SET failed_login_attempts = 0, locked_until = NULL, last_login = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [user.id]);

    // Generate JWT tokens
    const accessToken = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        username: user.username 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRE }
    );

    logger.info('User logged in successfully', {
      service: 'auth',
      userId: user.id,
      email: user.email,
      username: user.username
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        lastLogin: user.last_login
      },
      tokens: {
        accessToken,
        refreshToken
      }
    });

      span.end();
    } catch (error) {
      const err = error as Error;
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
      span.end();
      logger.error('Login failed:', err, { service: 'auth' });
      next(err);
    }
  });
});

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid refresh token
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        error: 'Authentication Failed',
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;

    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        error: 'Authentication Failed',
        message: 'Invalid token type'
      });
    }

    // Get user details
    const userResult = await database.query(`
      SELECT id, email, username, is_active
      FROM users 
      WHERE id = $1 AND is_active = true
    `, [decoded.userId]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: 'Authentication Failed',
        message: 'User not found or inactive'
      });
    }

    const user = userResult.rows[0];

    // Generate new access token
    const accessToken = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        username: user.username 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRE }
    );

    logger.info('Token refreshed successfully', {
      service: 'auth',
      userId: user.id
    });

    res.json({
      message: 'Token refreshed successfully',
      tokens: {
        accessToken
      }
    });

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: 'Authentication Failed',
        message: 'Invalid refresh token'
      });
    }

    logger.error('Token refresh failed:', error, { service: 'auth' });
    next(error);
  }
});

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get('/me', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication Failed',
        message: 'Authorization header is required'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Get user details
    const userResult = await database.query(`
      SELECT 
        id, email, username, first_name, last_name, phone, date_of_birth,
        gender, profile_picture_url, bio, location, language, timezone,
        email_verified, two_factor_enabled, subscription_tier, last_login, created_at
      FROM users 
      WHERE id = $1 AND is_active = true
    `, [decoded.userId]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: 'Authentication Failed',
        message: 'User not found or inactive'
      });
    }

    const user = userResult.rows[0];

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        dateOfBirth: user.date_of_birth,
        gender: user.gender,
        profilePictureUrl: user.profile_picture_url,
        bio: user.bio,
        location: user.location,
        language: user.language,
        timezone: user.timezone,
        emailVerified: user.email_verified,
        twoFactorEnabled: user.two_factor_enabled,
        subscriptionTier: user.subscription_tier,
        lastLogin: user.last_login,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: 'Authentication Failed',
        message: 'Invalid access token'
      });
    }

    logger.error('Get user profile failed:', error, { service: 'auth' });
    next(error);
  }
});

export { router as authRoutes };
