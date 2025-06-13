import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import { body, param, validationResult } from 'express-validator'; // param not used here, but good to have for consistency

import { FlaggedContent, FlagReason, FlaggedResourceType } from '../models/FlaggedContent';
import { Event as EventModel } from '../models/Event';
import { Comment as CommentModel } from '../models/Comment';
import { authMiddleware, AuthenticatedRequest } from '@shared/middleware/auth'; // Adjust path
import { logger } from '@shared/utils/logger'; // Adjust path

const router = express.Router();

const validResourceTypes: FlaggedResourceType[] = ['Event', 'Comment'];
const validReasons: FlagReason[] = ['spam', 'offensive', 'hate_speech', 'misinformation', 'illegal', 'other'];

// POST /api/flags - User flags a piece of content
router.post(
  '/flags', // Assuming router is mounted at /api, so full path is /api/flags
  authMiddleware,
  [
    body('resourceId').isMongoId().withMessage('Valid resource ID is required.'),
    body('resourceType')
      .isIn(validResourceTypes)
      .withMessage(`Resource type must be one of: ${validResourceTypes.join(', ')}.`),
    body('reason')
      .isIn(validReasons)
      .withMessage(`Reason must be one of: ${validReasons.join(', ')}.`),
    body('customReason')
      .optional()
      .isString().withMessage('Custom reason must be a string.')
      .trim()
      .isLength({ max: 500 }).withMessage('Custom reason cannot exceed 500 characters.')
      .custom((value, { req }) => {
        if (req.body.reason === 'other' && (!value || value.trim() === '')) {
          throw new Error('Custom reason is required when reason is "other".');
        }
        return true;
      }),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { resourceId, resourceType, reason, customReason } = req.body;
    const reportedByUserId = req.user!.id; // authMiddleware ensures req.user exists

    try {
      // 1. Verify the target resource exists
      let resourceExists = false;
      if (resourceType === 'Event') {
        resourceExists = !!(await EventModel.findById(resourceId));
      } else if (resourceType === 'Comment') {
        resourceExists = !!(await CommentModel.findById(resourceId));
      }

      if (!resourceExists) {
        return res.status(404).json({ message: `${resourceType} with ID ${resourceId} not found.` });
      }

      // 2. Check for existing, active ('pending_review') flags by the same user for the same resource
      const existingFlag = await FlaggedContent.findOne({
        resourceId: new mongoose.Types.ObjectId(resourceId),
        resourceType,
        reportedByUserId,
        status: 'pending_review',
      });

      if (existingFlag) {
        logger.warn(`User ${reportedByUserId} attempted to re-flag resource ${resourceType}:${resourceId} which already has a pending flag by them.`);
        return res.status(409).json({ message: 'You have already flagged this content and it is pending review.' });
      }

      // 3. Create and save new FlaggedContent document
      const newFlag = new FlaggedContent({
        resourceId: new mongoose.Types.ObjectId(resourceId),
        resourceType,
        reportedByUserId,
        reason,
        customReason: reason === 'other' ? customReason : undefined, // Only save customReason if reason is 'other'
        status: 'pending_review', // Default, but explicit
      });

      await newFlag.save();

      // TODO: Potentially notify admins/moderators about the new flag via Notification system or email.
      logger.info(`Content ${resourceType}:${resourceId} flagged by user ${reportedByUserId}. Reason: ${reason}. Flag ID: ${newFlag._id}`);

      res.status(201).json(newFlag);

    } catch (error) {
      logger.error(`Error flagging content ${resourceType}:${resourceId} by user ${reportedByUserId}:`, { error });
      if (error instanceof mongoose.Error.CastError && error.path === '_id') { // Should be caught by isMongoId
          return res.status(400).json({ message: 'Invalid resource ID format.' });
      }
      res.status(500).json({ message: 'Server error while flagging content.' });
    }
  }
);

export default router;
