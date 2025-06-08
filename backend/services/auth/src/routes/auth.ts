import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult } from 'express-validator';
import { User } from '../models/User';
import { RefreshToken } from '../models/RefreshToken';
import { AuditLog } from '../models/AuditLog';
import { rateLimitByEmail } from '../middleware/rateLimitByEmail';
import { validateRequest } from '../middleware/validation';
import { logger } from '../utils/logger';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../utils/email';
import { generateTokens, verifyRefreshToken } from '../utils/jwt';

const router = Router();

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
 *               preferredLanguage:
 *                 type: string
 *                 enum: [en, sn, nd]
 *                 default: en
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
  body('preferredLanguage')
    .optional()
    .isIn(['en', 'sn', 'nd'])
    .withMessage('Preferred language must be en, sn, or nd'),
  validateRequest,
  rateLimitByEmail
], async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, preferredLanguage = 'en' } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Email already registered'
      });
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const userId = uuidv4();
    const user = await User.create({
      id: userId,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      preferredLanguage,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Generate tokens
    const { accessToken, refreshToken } = await generateTokens(user);

    // Log registration
    await AuditLog.create({
      userId,
      action: 'USER_REGISTERED',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    });

    logger.info('User registered successfully', {
      userId,
      email: user.email,
      ip: req.ip
    });

    // Send welcome email (async)
    sendWelcomeEmail(user.email, user.firstName, preferredLanguage)
      .catch(err => logger.error('Failed to send welcome email:', err));

    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        preferredLanguage: user.preferredLanguage,
        emailVerified: user.emailVerified
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 3600 // 1 hour
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Authenticate user
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
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               mfaCode:
 *                 type: string
 *                 description: Required if MFA is enabled
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 *       423:
 *         description: Account locked
 */
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  validateRequest,
  rateLimitByEmail
], async (req, res, next) => {
  try {
    const { email, password, mfaCode } = req.body;

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      await AuditLog.create({
        userId: null,
        action: 'LOGIN_FAILED_USER_NOT_FOUND',
        details: { email },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date()
      });

      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await AuditLog.create({
        userId: user.id,
        action: 'LOGIN_FAILED_ACCOUNT_LOCKED',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date()
      });

      return res.status(423).json({
        error: 'Locked',
        message: 'Account is temporarily locked due to multiple failed login attempts'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      // Increment failed login attempts
      await User.incrementFailedLogins(user.id);

      await AuditLog.create({
        userId: user.id,
        action: 'LOGIN_FAILED_INVALID_PASSWORD',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date()
      });

      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid credentials'
      });
    }

    // Check MFA if enabled
    if (user.mfaEnabled) {
      if (!mfaCode) {
        return res.status(200).json({
          requireMfa: true,
          message: 'MFA code required'
        });
      }

      const isMfaValid = await User.verifyMfaCode(user.id, mfaCode);
      if (!isMfaValid) {
        await AuditLog.create({
          userId: user.id,
          action: 'LOGIN_FAILED_INVALID_MFA',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date()
        });

        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid MFA code'
        });
      }
    }

    // Reset failed login attempts on successful login
    await User.resetFailedLogins(user.id);

    // Generate tokens
    const { accessToken, refreshToken } = await generateTokens(user);

    // Update last login
    await User.updateLastLogin(user.id, req.ip);

    // Log successful login
    await AuditLog.create({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    });

    logger.info('User logged in successfully', {
      userId: user.id,
      email: user.email,
      ip: req.ip
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        preferredLanguage: user.preferredLanguage,
        emailVerified: user.emailVerified,
        mfaEnabled: user.mfaEnabled
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 3600 // 1 hour
      }
    });
  } catch (error) {
    next(error);
  }
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
router.post('/refresh', [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required'),
  validateRequest
], async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    const result = await verifyRefreshToken(refreshToken);
    if (!result) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired refresh token'
      });
    }

    const { user, newAccessToken, newRefreshToken } = result;

    res.json({
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 3600
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await RefreshToken.revoke(refreshToken);
    }

    // Extract user ID from access token if available
    const authHeader = req.headers.authorization;
    let userId = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const accessToken = authHeader.substring(7);
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET!) as any;
        userId = decoded.id;
      } catch (error) {
        // Token might be expired, that's okay for logout
      }
    }

    if (userId) {
      await AuditLog.create({
        userId,
        action: 'LOGOUT',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date()
      });
    }

    res.json({
      message: 'Logout successful'
    });
  } catch (error) {
    next(error);
  }
});

export { router as authRoutes };
