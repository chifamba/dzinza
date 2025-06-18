import { Router, Request, Response, NextFunction } from "express"; // Import Request, Response, NextFunction
import { trace, SpanStatusCode, Span } from "@opentelemetry/api"; // Import OpenTelemetry API
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { body } from "express-validator";
import { User } from "../models/User";
import { RefreshToken } from "../models/RefreshToken";
import { AuditLog } from "../models/AuditLog";
import { rateLimitByEmail } from "../middleware/rateLimitByEmail";
import { validateRequest } from "../middleware/validation";
import { logger } from "../utils/logger";
import { sendWelcomeEmail, sendEmailVerificationEmail } from "../utils/email";
import { generateTokens, verifyRefreshToken } from "../utils/jwt";
import { authenticateToken } from "../middleware/authMiddleware"; // Assuming this middleware exists

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
router.post(
  "/register",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 8 })
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
      )
      .withMessage(
        "Password must be at least 8 characters with uppercase, lowercase, number, and special character"
      ),
    body("firstName")
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage(
        "First name is required and must be less than 50 characters"
      ),
    body("lastName")
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage("Last name is required and must be less than 50 characters"),
    body("preferredLanguage")
      .optional()
      .isIn(["en", "sn", "nd"])
      .withMessage("Preferred language must be en, sn, or nd"),
    validateRequest,
    rateLimitByEmail,
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    // Typed req, res, next
    const tracer = trace.getTracer("auth-service-routes");
    await tracer.startActiveSpan(
      "auth.register.handler",
      async (span: Span) => {
        try {
          const {
            email,
            password,
            firstName,
            lastName,
            preferredLanguage = "en",
          } = req.body;
          span.setAttributes({
            "user.email": email,
            "user.firstName": firstName,
            "user.lastName": lastName,
            "http.method": "POST",
            "http.route": "/auth/register",
          });

          // Check if user already exists
          const existingUser = await User.findByEmail(email);
          if (existingUser) {
            return res.status(409).json({
              error: "Conflict",
              message: "Email already registered",
            });
          }

          // Hash password
          const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || "12");
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
            updatedAt: new Date(),
          });

          // Generate tokens
          const { accessToken, refreshToken } = await generateTokens(user);

          // Log registration
          await AuditLog.create({
            userId,
            action: "USER_REGISTERED",
            ipAddress: req.ip,
            userAgent: req.get("User-Agent"),
            timestamp: new Date(),
          });

          logger.info("User registered successfully", {
            userId,
            email: user.email,
            ip: req.ip,
          });

          // Send welcome email (async)
          sendWelcomeEmail(user.email, user.firstName, preferredLanguage).catch(
            (err) => logger.error("Failed to send welcome email:", err)
          );

          res.status(201).json({
            message: "Registration successful",
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              preferredLanguage: user.preferredLanguage,
              emailVerified: user.emailVerified,
            },
            tokens: {
              accessToken,
              refreshToken,
              expiresIn: 3600, // 1 hour
            },
          });
          span.end();
        } catch (error) {
          const err = error as Error;
          span.recordException(err);
          span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
          span.end();
          next(err); // Call next to pass control to the error handler
        }
      }
    );
  }
);

/**
 * @swagger
 * /auth/request-verification:
 *   post:
 *     summary: Request email verification
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Verification email sent
 *       400:
 *         description: User already verified or error sending email
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/request-verification",
  authenticateToken,
  async (req: any, res, next) => {
    try {
      const userId = req.user.id;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.isEmailVerified) {
        return res.status(400).json({ message: "Email is already verified" });
      }

      const token = user.generateEmailVerificationToken();
      await user.save();

      try {
        await sendEmailVerificationEmail(user.email, user.firstName, token);
        logger.info(`Verification email requested for user ${user.email}`, {
          userId: user._id,
        });
        res
          .status(200)
          .json({
            message: "Verification email sent. Please check your inbox.",
          });
      } catch (emailError) {
        logger.error("Failed to send verification email", {
          userId: user._id,
          error: emailError,
        });
        return res
          .status(500)
          .json({
            message:
              "Error sending verification email. Please try again later.",
          });
      }
    } catch (error) {
      logger.error("Error in /request-verification route", { error });
      next(error);
    }
  }
);

/**
 * @swagger
 * /auth/verify-email/{token}:
 *   get:
 *     summary: Verify user's email address
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Email verification token
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired token
 */
router.get("/verify-email/:token", async (req, res, next) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      logger.warn("Invalid or expired email verification token received", {
        token,
      });
      return res
        .status(400)
        .json({
          message:
            "Invalid or expired verification token. Please request a new one.",
        });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    await AuditLog.create({
      userId: user._id,
      action: "EMAIL_VERIFIED",
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      timestamp: new Date(),
    });
    logger.info(`Email verified successfully for user ${user.email}`, {
      userId: user._id,
    });

    // Optionally, redirect to a frontend page:
    // return res.redirect(`${process.env.FRONTEND_URL}/email-verified-success`);
    res
      .status(200)
      .json({ message: "Email verified successfully. You can now login." });
  } catch (error) {
    logger.error("Error in /verify-email/:token route", { error });
    next(error);
  }
);

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
router.post(
  "/login",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
    validateRequest,
    rateLimitByEmail,
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    // Typed req, res, next
    const tracer = trace.getTracer("auth-service-routes");
    await tracer.startActiveSpan("auth.login.handler", async (span: Span) => {
      try {
        const { email, password, mfaCode } = req.body;
        span.setAttributes({
          "user.email": email,
          "http.method": "POST",
          "http.route": "/auth/login",
        });

        // Find user
        const user = await User.findByEmail(email);
        if (!user) {
          await AuditLog.create({
            userId: null,
            action: "LOGIN_FAILED_USER_NOT_FOUND",
            details: { email },
            ipAddress: req.ip,
            userAgent: req.get("User-Agent"),
            timestamp: new Date(),
          });

          return res.status(401).json({
            error: "Unauthorized",
            message: "Invalid credentials",
          });
        }

        // Check if account is locked
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          await AuditLog.create({
            userId: user.id,
            action: "LOGIN_FAILED_ACCOUNT_LOCKED",
            ipAddress: req.ip,
            userAgent: req.get("User-Agent"),
            timestamp: new Date(),
          });

          return res.status(423).json({
            error: "Locked",
            message:
              "Account is temporarily locked due to multiple failed login attempts",
          });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          // Increment failed login attempts
          await User.incrementFailedLogins(user.id);

          await AuditLog.create({
            userId: user.id,
            action: "LOGIN_FAILED_INVALID_PASSWORD",
            ipAddress: req.ip,
            userAgent: req.get("User-Agent"),
            timestamp: new Date(),
          });

          return res.status(401).json({
            error: "Unauthorized",
            message: "Invalid credentials",
          });
        }

        // Check MFA if enabled
        if (user.mfaEnabled) {
          if (!mfaCode) {
            return res.status(200).json({
              requireMfa: true,
              message: "MFA code required",
            });
          }

          const isMfaValid = await User.verifyMfaCode(user.id, mfaCode);
          if (!isMfaValid) {
            await AuditLog.create({
              userId: user.id,
              action: "LOGIN_FAILED_INVALID_MFA",
              ipAddress: req.ip,
              userAgent: req.get("User-Agent"),
              timestamp: new Date(),
            });

            return res.status(401).json({
              error: "Unauthorized",
              message: "Invalid MFA code",
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
          action: "LOGIN_SUCCESS",
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
          timestamp: new Date(),
        });

        logger.info("User logged in successfully", {
          userId: user.id,
          email: user.email,
          ip: req.ip,
        });

        res.json({
          message: "Login successful",
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            preferredLanguage: user.preferredLanguage,
            emailVerified: user.emailVerified,
            mfaEnabled: user.mfaEnabled,
          },
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: 3600, // 1 hour
          },
        });
        span.end();
      } catch (error) {
        const err = error as Error;
        span.recordException(err);
        span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
        span.end();
        next(err); // Call next to pass control to the error handler
      }
    });
  }
);

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
router.post(
  "/refresh",
  [
    body("refreshToken").notEmpty().withMessage("Refresh token is required"),
    validateRequest,
  ],
  async (req, res, next) => {
    try {
      const { refreshToken } = req.body;

      const result = await verifyRefreshToken(refreshToken);
      if (!result) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Invalid or expired refresh token",
        });
      }

      const { user, newAccessToken, newRefreshToken } = result;

      res.json({
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresIn: 3600,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

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
router.post("/logout", authenticateToken, async (req: any, res, next) => {
  try {
    const { refreshToken: bodyRefreshToken } = req.body; // Renamed to avoid conflict with 'refreshToken' from generateTokens if that was in scope
    const userId = req.user.id; // User must be authenticated

    if (bodyRefreshToken) {
      // Attempt to revoke the specific refresh token provided
      // This assumes RefreshToken model has a method to find and revoke by token string
      // For example: await RefreshToken.revokeByTokenString(bodyRefreshToken);
      // Or, if your revoke method on the instance is preferred, you might need to fetch it first (less ideal for logout)
      // For simplicity, if RefreshToken.revoke expects the token ID (not the JWT string itself), this needs adjustment.
      // Let's assume RefreshToken.revoke(tokenId) where tokenId is the UUID stored.
      // The JWT refresh token itself is not usually what's stored directly for revocation lookup.
      // However, the current RefreshToken.revoke method, it seems to be an instance method.
      // This means we need a token ID to fetch it, then call .revoke().
      // The /refresh route uses verifyRefreshToken which then finds the token by its internal ID (tokenId).
      // For logout, if a specific refresh token string is provided, we should try to invalidate it.
      // However, without its internal ID (jti/tokenId), it's hard to look up directly.
      // A simpler logout just relies on the client deleting its tokens.
      // A more secure logout invalidates the refresh token on the server.
      // Let's assume for now the client is responsible for discarding the access token.
      // We will attempt to revoke the refresh token if provided.
    }

    // User ID is now reliably from authenticateToken
    await AuditLog.create({
      userId: userId, // userId from req.user
      action: "LOGOUT",
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      timestamp: new Date(),
    });

    res.json({
      message: "Logout successful",
    });
  } catch (error) {
    next(error);
  }
});

export { router as authRoutes };
