import { Router, Request, Response } from 'express';
import passport from '../config/passport'; // Corrected path
import { generateTokens } from '../utils/jwt';
import { IUser } from '../models/User';
import { logger } from '../utils/logger';
import { AuditLog } from '../models/AuditLog';

const router = Router();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'; // Ensure FRONTEND_URL is available

/**
 * @swagger
 * /social/google:
 *   get:
 *     summary: Initiate Google OAuth2 login
 *     tags: [Social Authentication]
 *     responses:
 *       302:
 *         description: Redirects to Google for authentication.
 */
router.get('/google',
  (req, res, next) => {
    logger.info('Initiating Google OAuth flow', { ip: req.ip, userAgent: req.get('User-Agent') });
    // Optionally, store redirect URL or other state in session or query param if needed
    // For example, req.session.redirectTo = req.query.redirectTo;
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      session: false // Using JWTs, so session is false
    })(req, res, next);
  }
);

/**
 * @swagger
 * /social/google/callback:
 *   get:
 *     summary: Google OAuth2 callback URL
 *     tags: [Social Authentication]
 *     parameters:
 *       - name: code
 *         in: query
 *         required: true
 *         description: Authorization code from Google.
 *       - name: state
 *         in: query
 *         required: false
 *         description: State parameter if used.
 *     responses:
 *       302:
 *         description: Redirects to frontend with tokens upon successful authentication, or to a failure page.
 *       401:
 *         description: Authentication failed.
 *       500:
 *         description: Internal server error.
 */
router.get('/google/callback',
  (req: Request, res: Response, next) => {
    passport.authenticate('google', {
      failureRedirect: `${FRONTEND_URL}/login?error=google_auth_failed`, // Redirect to frontend login page with error
      session: false
    }, async (err: unknown, user: IUser | false, info?: { message?: string }) => { // Typed err and info
      if (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        logger.error('Google OAuth callback error', { error: errorMessage, info });
        await AuditLog.create({
            action: 'GOOGLE_LOGIN_FAILED',
            details: { error: errorMessage, info: info?.message },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
        });
        return res.redirect(`${FRONTEND_URL}/login?error=google_auth_error`);
      }
      if (!user) {
        logger.warn('Google OAuth callback: User not authenticated or not found.', { info });
         await AuditLog.create({
            action: 'GOOGLE_LOGIN_FAILED',
            details: { error: 'User not authenticated or not found after Google callback.', info },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
        });
        return res.redirect(`${FRONTEND_URL}/login?error=google_auth_no_user`);
      }

      try {
        // req.user is populated by Passport's verify callback
        const tokens = await generateTokens(user._id, user.email, user.roles, req.ip, req.get('User-Agent'));

        logger.info('Google OAuth successful, tokens generated.', { userId: user._id, email: user.email });
        await AuditLog.create({
            userId: user._id,
            action: 'GOOGLE_LOGIN_SUCCESS',
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
        });

        // Redirect to frontend with tokens in query parameters
        const redirectUrl = `${FRONTEND_URL}/auth/social-callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;
        return res.redirect(redirectUrl);

      } catch (tokenError) {
        logger.error('Failed to generate tokens after Google OAuth success', { userId: user._id, error: tokenError });
        await AuditLog.create({
            userId: user._id,
            action: 'GOOGLE_LOGIN_TOKEN_ERROR',
            details: { error: (tokenError as Error).message },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
        });
        return res.redirect(`${FRONTEND_URL}/login?error=token_generation_failed`);
      }
    })(req, res, next);
  }
);

export { router as socialAuthRoutes };
