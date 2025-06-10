import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';

import { SiteSetting, ISiteSetting, GLOBAL_SETTINGS_ID } from '../models/SiteSetting';
import { authMiddleware, AuthenticatedRequest } from '@shared/middleware/auth'; // Adjust path
import { adminAuth } from '@shared/middleware/adminAuth'; // Adjust path
import { logger } from '@shared/utils/logger'; // Adjust path

const router = express.Router();

const availableLanguages = ['en', 'sn', 'nd'];

// GET /api/admin/settings - Get site settings
router.get(
  '/', // Assuming mounted at /api/admin/settings, so this is the root
  authMiddleware,
  adminAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Use the static method to ensure settings doc exists
      const settings = await (SiteSetting as any).getSettings();
      res.status(200).json(settings);
    } catch (error) {
      logger.error('Admin: Error fetching site settings:', { error, userId: req.user?.id });
      res.status(500).json({ message: 'Server error while fetching site settings.' });
    }
  }
);

// PUT /api/admin/settings - Update site settings
router.put(
  '/', // Assuming mounted at /api/admin/settings
  authMiddleware,
  adminAuth,
  [
    body('siteName').optional().isString().trim().notEmpty().withMessage('Site name cannot be empty if provided.'),
    body('maintenanceMode').optional().isBoolean().withMessage('Maintenance mode must be a boolean.'),
    body('allowNewRegistrations').optional().isBoolean().withMessage('Allow new registrations must be a boolean.'),
    body('defaultLanguage').optional().isString().isIn(availableLanguages)
      .withMessage(`Default language must be one of: ${availableLanguages.join(', ')}.`),
    body('contactEmail').optional({ checkFalsy: true }).isEmail().normalizeEmail().withMessage('Invalid contact email format.'),
    body('featureFlags').optional().isObject().withMessage('Feature flags must be an object.')
      .custom((value: Record<string, any>) => { // Custom validation for featureFlags values
        if (value) {
          for (const key in value) {
            if (typeof value[key] !== 'boolean') {
              throw new Error(`All feature flag values must be boolean. Flag '${key}' is not.`);
            }
          }
        }
        return true;
      }),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const adminUserId = req.user!.id; // adminAuth ensures req.user and req.user.id exist
    const updates = req.body;

    try {
      const updatePayload: Partial<ISiteSetting> & { updatedBy?: mongoose.Types.ObjectId } = {};

      // Only include fields that were actually provided in the request body
      if (updates.siteName !== undefined) updatePayload.siteName = updates.siteName;
      if (updates.maintenanceMode !== undefined) updatePayload.maintenanceMode = updates.maintenanceMode;
      if (updates.allowNewRegistrations !== undefined) updatePayload.allowNewRegistrations = updates.allowNewRegistrations;
      if (updates.defaultLanguage !== undefined) updatePayload.defaultLanguage = updates.defaultLanguage;
      if (updates.contactEmail !== undefined) updatePayload.contactEmail = updates.contactEmail; // handles empty string to unset if schema allows

      if (updates.featureFlags !== undefined) {
        // Ensure featureFlags is treated as a Map for Mongoose
        // If plain object comes from req.body, convert it
        if (typeof updates.featureFlags === 'object' && !(updates.featureFlags instanceof Map)) {
          updatePayload.featureFlags = new Map(Object.entries(updates.featureFlags)) as Map<string, boolean>;
        } else if (updates.featureFlags instanceof Map) {
           updatePayload.featureFlags = updates.featureFlags;
        }
      }

      updatePayload.updatedBy = new mongoose.Types.ObjectId(adminUserId);

      const options = {
        new: true, // Return the modified document rather than the original
        upsert: true, // Create the document if it doesn't exist
        runValidators: true, // Ensure schema validation is run on update
        setDefaultsOnInsert: true, // Apply schema defaults if creating via upsert
      };

      // Using findByIdAndUpdate with GLOBAL_SETTINGS_ID ensures we target the singleton document
      const updatedSettings = await SiteSetting.findByIdAndUpdate(
        GLOBAL_SETTINGS_ID,
        { $set: updatePayload },
        options
      );

      if (!updatedSettings) {
        // This should ideally not happen with upsert:true and a static getSettings,
        // but as a safeguard if the initial creation somehow failed or was deleted.
        logger.error('Admin: Site settings document could not be found or created via findByIdAndUpdate with upsert.', { adminUserId });
        return res.status(500).json({ message: 'Failed to update site settings; settings document could not be established.' });
      }

      logger.info(`Admin: Site settings updated by ${adminUserId}.`, { updates: Object.keys(updates), adminUserId });
      // TODO: Record site settings update in a more detailed activity log if that service is available/integrated.
      // Example: recordActivity({ userId: adminUserId, actionType: 'UPDATE_SITE_SETTINGS', details: 'Updated site configuration.' });


      res.status(200).json(updatedSettings);

    } catch (error) {
      logger.error(`Admin: Error updating site settings:`, { error, adminUserId });
      res.status(500).json({ message: 'Server error while updating site settings.' });
    }
  }
);

export default router;
