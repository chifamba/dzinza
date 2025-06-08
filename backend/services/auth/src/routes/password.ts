import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { body } from 'express-validator';
import { User } from '../models/User';
import { AuditLog } from '../models/AuditLog';
import { rateLimitByEmail } from '../middleware/rateLimitByEmail';
import { validateRequest } from '../middleware/validation';
import { authMiddleware } from '../../../../shared/middleware/auth';
import { logger } from '../utils/logger';
import { sendPasswordResetEmail } from '../utils/email';

const router = Router();

/**
 * @swagger
 * /password/forgot:
 *   post:
 *     summary: Request password reset
 *     tags: [Password Management]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Password reset email sent (always returns success for security)
 *       400:
 *         description: Validation error
 *       429:
 *         description: Too many requests
 */
router.post('/forgot', [
  rateLimitByEmail,
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  validateRequest
], async (req, res) => {
  try {
    const { email } = req.body;
    const correlationId = req.headers['x-correlation-id'] as string;

    logger.info('Password reset requested', { 
      email, 
      correlationId,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      // For security reasons, always return success even if email doesn't exist
      logger.warn('Password reset requested for non-existent email', { email, correlationId });
      return res.status(200).json({
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      logger.warn('Password reset requested for locked account', { 
        email, 
        correlationId,
        lockedUntil: user.lockUntil 
      });
      return res.status(200).json({
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save reset token to user
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = resetTokenExpiry;
    await user.save();

    // Send password reset email
    try {
      await sendPasswordResetEmail(email, resetToken, user.firstName);
      logger.info('Password reset email sent successfully', { email, correlationId });
    } catch (emailError) {
      logger.error('Failed to send password reset email', { 
        email, 
        correlationId,
        error: emailError 
      });
      // Continue execution to avoid revealing email sending failures
    }

    // Log audit event
    await AuditLog.create({
      userId: user._id,
      action: 'password_reset_requested',
      details: {
        email,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      },
      correlationId
    });

    res.status(200).json({
      message: 'If an account with that email exists, a password reset link has been sent.'
    });

  } catch (error) {
    logger.error('Password reset request failed', { 
      error,
      correlationId: req.headers['x-correlation-id']
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /password/reset:
 *   post:
 *     summary: Reset password with token
 *     tags: [Password Management]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid token or validation error
 *       401:
 *         description: Token expired
 */
router.post('/reset', [
  body('token')
    .isLength({ min: 1 })
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, number, and special character'),
  validateRequest
], async (req, res) => {
  try {
    const { token, password } = req.body;
    const correlationId = req.headers['x-correlation-id'] as string;

    logger.info('Password reset attempted', { 
      correlationId,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Find user by reset token
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() }
    });

    if (!user) {
      logger.warn('Invalid or expired password reset token used', { 
        token: token.substring(0, 8) + '...', 
        correlationId 
      });
      return res.status(400).json({
        error: 'Invalid or expired reset token'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update user password and clear reset token
    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordChangedAt = new Date();
    user.failedLoginAttempts = 0; // Reset failed login attempts
    user.lockUntil = undefined; // Unlock account if it was locked
    
    await user.save();

    logger.info('Password reset completed successfully', { 
      userId: user._id,
      email: user.email,
      correlationId 
    });

    // Log audit event
    await AuditLog.create({
      userId: user._id,
      action: 'password_reset_completed',
      details: {
        email: user.email,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      },
      correlationId
    });

    res.status(200).json({
      message: 'Password has been reset successfully'
    });

  } catch (error) {
    logger.error('Password reset failed', { 
      error,
      correlationId: req.headers['x-correlation-id']
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /password/change:
 *   post:
 *     summary: Change password for authenticated user
 *     tags: [Password Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid current password or unauthorized
 */
router.post('/change', [
  authMiddleware,
  body('currentPassword')
    .isLength({ min: 1 })
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must be at least 8 characters with uppercase, lowercase, number, and special character'),
  validateRequest
], async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    const correlationId = req.headers['x-correlation-id'] as string;

    logger.info('Password change requested', { 
      userId,
      correlationId,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      logger.error('User not found during password change', { userId, correlationId });
      return res.status(401).json({ error: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      logger.warn('Invalid current password during password change', { 
        userId, 
        email: user.email,
        correlationId 
      });
      return res.status(400).json({
        error: 'Current password is incorrect'
      });
    }

    // Check if new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        error: 'New password must be different from current password'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    user.password = hashedPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    logger.info('Password changed successfully', { 
      userId,
      email: user.email,
      correlationId 
    });

    // Log audit event
    await AuditLog.create({
      userId: user._id,
      action: 'password_changed',
      details: {
        email: user.email,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      },
      correlationId
    });

    res.status(200).json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    logger.error('Password change failed', { 
      error,
      userId: req.user?.id,
      correlationId: req.headers['x-correlation-id']
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /password/validate:
 *   post:
 *     summary: Validate password strength
 *     tags: [Password Management]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password validation result
 */
router.post('/validate', [
  body('password')
    .isLength({ min: 1 })
    .withMessage('Password is required'),
  validateRequest
], async (req, res) => {
  try {
    const { password } = req.body;
    
    const validation = {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[@$!%*?&]/.test(password),
    };

    const isValid = Object.values(validation).every(Boolean);
    
    let strength = 'weak';
    const score = Object.values(validation).filter(Boolean).length;
    
    if (score >= 5) strength = 'strong';
    else if (score >= 3) strength = 'medium';

    res.status(200).json({
      isValid,
      strength,
      validation,
      score
    });

  } catch (error) {
    logger.error('Password validation failed', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as passwordRoutes };
