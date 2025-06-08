import { Router } from 'express';
import { body } from 'express-validator';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { User } from '../models/User';
import { validateRequest } from '../middleware/validation';
import { logger } from '../utils/logger';
import { verifyAccessToken } from '../utils/jwt';

const router = Router();

/**
 * @swagger
 * /mfa/setup:
 *   post:
 *     summary: Setup MFA for user account
 *     tags: [MFA]
 *     security:
 *       - bearerAuth: []
 */
router.post('/setup', async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.mfaEnabled) {
      return res.status(400).json({ error: 'MFA already enabled' });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `Dzinza (${user.email})`,
      issuer: 'Dzinza Genealogy',
      length: 32,
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

    // Store secret temporarily (not enabled until verified)
    user.mfaSecret = secret.base32;
    await user.save();

    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
      backupCodes: [], // Will generate after verification
    });

    logger.info('MFA setup initiated', { userId: user._id });

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /mfa/verify-setup:
 *   post:
 *     summary: Verify and enable MFA
 *     tags: [MFA]
 */
router.post('/verify-setup', [
  body('token').isLength({ min: 6, max: 6 }).isNumeric(),
], validateRequest, async (req, res, next) => {
  try {
    const { token: mfaToken } = req.body;
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    
    if (!authToken) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyAccessToken(authToken);
    const user = await User.findById(decoded.userId);

    if (!user || !user.mfaSecret) {
      return res.status(404).json({ error: 'MFA setup not found' });
    }

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: mfaToken,
      window: 2, // Allow 2 time steps
    });

    if (!verified) {
      return res.status(400).json({ error: 'Invalid MFA token' });
    }

    // Generate backup codes
    const backupCodes = Array.from({ length: 8 }, () => 
      Math.random().toString(36).substring(2, 8).toUpperCase()
    );

    // Enable MFA
    user.mfaEnabled = true;
    user.backupCodes = backupCodes;
    await user.save();

    res.json({
      message: 'MFA enabled successfully',
      backupCodes,
    });

    logger.info('MFA enabled', { userId: user._id });

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /mfa/verify:
 *   post:
 *     summary: Verify MFA token during login
 *     tags: [MFA]
 */
router.post('/verify', [
  body('userId').notEmpty(),
  body('token').isLength({ min: 6, max: 6 }),
], validateRequest, async (req, res, next) => {
  try {
    const { userId, token } = req.body;

    const user = await User.findById(userId);
    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      return res.status(400).json({ error: 'MFA not enabled for this user' });
    }

    let verified = false;

    // Try TOTP verification
    verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: 2,
    });

    // If TOTP fails, try backup codes
    if (!verified && user.backupCodes.includes(token.toUpperCase())) {
      verified = true;
      // Remove used backup code
      user.backupCodes = user.backupCodes.filter(code => code !== token.toUpperCase());
      await user.save();
      
      logger.info('Backup code used for MFA', { userId });
    }

    if (!verified) {
      return res.status(400).json({ error: 'Invalid MFA token' });
    }

    res.json({ verified: true });

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /mfa/disable:
 *   post:
 *     summary: Disable MFA for user account
 *     tags: [MFA]
 */
router.post('/disable', [
  body('password').notEmpty(),
  body('token').isLength({ min: 6, max: 6 }),
], validateRequest, async (req, res, next) => {
  try {
    const { password, token } = req.body;
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    
    if (!authToken) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyAccessToken(authToken);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    // Verify MFA token
    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret!,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!verified) {
      return res.status(400).json({ error: 'Invalid MFA token' });
    }

    // Disable MFA
    user.mfaEnabled = false;
    user.mfaSecret = undefined;
    user.backupCodes = [];
    await user.save();

    res.json({ message: 'MFA disabled successfully' });

    logger.info('MFA disabled', { userId: user._id });

  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /mfa/backup-codes:
 *   post:
 *     summary: Generate new backup codes
 *     tags: [MFA]
 */
router.post('/backup-codes', async (req, res, next) => {
  try {
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    
    if (!authToken) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyAccessToken(authToken);
    const user = await User.findById(decoded.userId);

    if (!user || !user.mfaEnabled) {
      return res.status(400).json({ error: 'MFA not enabled' });
    }

    // Generate new backup codes
    const backupCodes = Array.from({ length: 8 }, () => 
      Math.random().toString(36).substring(2, 8).toUpperCase()
    );

    user.backupCodes = backupCodes;
    await user.save();

    res.json({ backupCodes });

    logger.info('New backup codes generated', { userId: user._id });

  } catch (error) {
    next(error);
  }
});

export { router as mfaRoutes };
