import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import { query, param, body, validationResult } from 'express-validator';

import { FlaggedContent, IFlaggedContent, FlagStatus } from '../models/FlaggedContent';
import { Event as EventModel, IEvent } from '../models/Event';
import { Comment as CommentModel, IComment } from '../models/Comment';
import { authMiddleware, AuthenticatedRequest } from '@shared/middleware/auth'; // Adjust path
import { adminAuth } from '@shared/middleware/adminAuth'; // Adjust path
import { logger } from '@shared/utils/logger'; // Adjust path
// import { recordActivity } from '../services/activityLogService'; // If activity logging is to be integrated here

const router = express.Router();

const validFlagStatuses: FlagStatus[] = ['pending_review', 'resolved_no_action', 'resolved_content_hidden', 'resolved_content_deleted'];
const validResourceTypesForModeration = ['Event', 'Comment'];
const validModerationActions = ['dismiss', 'hide_content', 'delete_content'];
const validContentModerationStatus = ['visible', 'hidden_by_moderator'];

// GET /api/admin/flags - List flagged content
router.get(
  '/flags', // Assuming router is mounted at /api/admin, so full path is /api/admin/flags
  authMiddleware,
  adminAuth,
  [
    query('status').optional().isIn(validFlagStatuses)
      .withMessage(`Status must be one of: ${validFlagStatuses.join(', ')}.`),
    query('page').optional().isInt({ min: 1 }).toInt().default(1),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt().default(20),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status, page, limit } = req.query as any;
    const adminUserId = req.user!.id;

    try {
      const queryFilter: any = {};
      if (status) {
        queryFilter.status = status;
      } else {
        queryFilter.status = 'pending_review'; // Default
      }

      const totalItems = await FlaggedContent.countDocuments(queryFilter);
      const flags = await FlaggedContent.find(queryFilter)
        .sort({ createdAt: 1 }) // Oldest first for review queue
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<IFlaggedContent[]>();
        // TODO: Consider populating resourceId with minimal details for context.
        // This requires dynamic population based on resourceType, which can be complex.
        // Example:
        // for (const flag of flags) {
        //   if (flag.resourceType === 'Event') {
        //     flag.resourceDetails = await EventModel.findById(flag.resourceId).select('title userId').lean();
        //   } else if (flag.resourceType === 'Comment') {
        //     flag.resourceDetails = await CommentModel.findById(flag.resourceId).select('content userId').lean();
        //   }
        // } // This would be N+1 if not careful; better to do batched fetches if needed.
        // For now, returning resourceId and resourceType is the minimum as per prompt.

      res.status(200).json({
        data: flags,
        pagination: {
          page,
          limit,
          totalItems,
          totalPages: Math.ceil(totalItems / limit),
        },
      });
    } catch (error) {
      logger.error(`Admin: Error fetching flags by admin ${adminUserId}:`, { error, query: req.query });
      res.status(500).json({ message: 'Server error while fetching flags.' });
    }
  }
);

// PUT /api/admin/flags/:flagId/resolve - Resolve a flag
router.put(
  '/flags/:flagId/resolve',
  authMiddleware,
  adminAuth,
  [
    param('flagId').isMongoId().withMessage('Invalid Flag ID.'),
    body('resolutionAction')
      .isIn(validModerationActions)
      .withMessage(`Resolution action must be one of: ${validModerationActions.join(', ')}.`),
    body('moderatorNotes').optional().isString().trim().isLength({ max: 1000 })
      .withMessage('Moderator notes cannot exceed 1000 characters.'),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { flagId } = req.params;
    const { resolutionAction, moderatorNotes } = req.body;
    const moderatorUserId = req.user!.id;

    try {
      const flag = await FlaggedContent.findById(flagId);
      if (!flag) {
        return res.status(404).json({ message: 'Flagged content not found.' });
      }
      if (flag.status !== 'pending_review') {
        return res.status(400).json({ message: `Flag is not pending review. Current status: ${flag.status}.` });
      }

      flag.moderatorUserId = moderatorUserId;
      flag.moderatorNotes = moderatorNotes || undefined; // Set to undefined if empty

      let targetResource;

      if (resolutionAction === 'dismiss') {
        flag.status = 'resolved_no_action';
      } else if (resolutionAction === 'hide_content') {
        if (flag.resourceType === 'Event') {
          targetResource = await EventModel.findByIdAndUpdate(flag.resourceId, { $set: { moderationStatus: 'hidden_by_moderator' } }, { new: true });
        } else if (flag.resourceType === 'Comment') {
          targetResource = await CommentModel.findByIdAndUpdate(flag.resourceId, { $set: { moderationStatus: 'hidden_by_moderator' } }, { new: true });
        }
        if (!targetResource) return res.status(404).json({ message: `Original ${flag.resourceType} content not found to hide.`});
        flag.status = 'resolved_content_hidden';
      } else if (resolutionAction === 'delete_content') {
        if (flag.resourceType === 'Event') {
          targetResource = await EventModel.findByIdAndDelete(flag.resourceId);
        } else if (flag.resourceType === 'Comment') {
          targetResource = await CommentModel.findByIdAndDelete(flag.resourceId);
          // TODO: Consider deleting replies to this comment as well.
        }
        if (!targetResource) return res.status(404).json({ message: `Original ${flag.resourceType} content not found to delete.`});
        flag.status = 'resolved_content_deleted';
      }

      await flag.save();

      // TODO: Activity Log: Log moderation action for flag resolution.
      // recordActivity({ userId: moderatorUserId, actionType: `RESOLVE_FLAG_${resolutionAction.toUpperCase()}`, targetResourceId: flag._id, targetResourceType: 'FlaggedContent', details: `Flag ${flagId} resolved as ${flag.status}. Notes: ${moderatorNotes || 'N/A'}` });
      // TODO: Activity Log: Log content moderation action if content was hidden/deleted.
      // if (targetResource && (resolutionAction === 'hide_content' || resolutionAction === 'delete_content')) {
      //    recordActivity({ userId: moderatorUserId, actionType: resolutionAction === 'hide_content' ? 'HIDE_CONTENT' : 'DELETE_CONTENT', targetResourceId: flag.resourceId, targetResourceType: flag.resourceType, details: `Content ${flag.resourceType}:${flag.resourceId} ${resolutionAction} due to flag ${flagId}.` });
      // }


      logger.info(`Admin: Flag ${flagId} resolved as ${flag.status} by ${moderatorUserId}. Action: ${resolutionAction}.`);
      res.status(200).json(flag);

    } catch (error) {
      logger.error(`Admin: Error resolving flag ${flagId} by ${moderatorUserId}:`, { error });
      if (error instanceof mongoose.Error.CastError) {
        return res.status(400).json({ message: 'Invalid ID format.' });
      }
      res.status(500).json({ message: 'Server error while resolving flag.' });
    }
  }
);

// PUT /api/admin/:resourceType/:resourceId/moderation-status - Directly moderate content
router.put(
  '/:resourceType/:resourceId/moderation-status', // Path needs to be distinct or handled by base path of router mount
  authMiddleware,
  adminAuth,
  [
    param('resourceType').isIn(validResourceTypesForModeration)
      .withMessage(`Resource type must be one of: ${validResourceTypesForModeration.join(', ')}.`),
    param('resourceId').isMongoId().withMessage('Invalid Resource ID.'),
    body('status').isIn(validContentModerationStatus)
      .withMessage(`Moderation status must be one of: ${validContentModerationStatus.join(', ')}.`),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { resourceType, resourceId } = req.params;
    const { status: newModerationStatus } = req.body;
    const moderatorUserId = req.user!.id;

    try {
      let updatedResource;
      if (resourceType === 'Event') {
        updatedResource = await EventModel.findByIdAndUpdate(resourceId, { $set: { moderationStatus: newModerationStatus } }, { new: true });
      } else if (resourceType === 'Comment') {
        updatedResource = await CommentModel.findByIdAndUpdate(resourceId, { $set: { moderationStatus: newModerationStatus } }, { new: true });
      }

      if (!updatedResource) {
        return res.status(404).json({ message: `${resourceType} with ID ${resourceId} not found.` });
      }

      // TODO: Activity Log: Log direct moderation action.
      // recordActivity({ userId: moderatorUserId, actionType: `SET_MODERATION_STATUS_${newModerationStatus.toUpperCase()}`, targetResourceId: resourceId, targetResourceType: resourceType, details: `Content ${resourceType}:${resourceId} status set to ${newModerationStatus}.` });

      logger.info(`Admin: Moderation status for ${resourceType}:${resourceId} set to ${newModerationStatus} by ${moderatorUserId}.`);
      res.status(200).json(updatedResource);

    } catch (error) {
      logger.error(`Admin: Error setting moderation status for ${resourceType}:${resourceId} by ${moderatorUserId}:`, { error });
      if (error instanceof mongoose.Error.CastError) {
        return res.status(400).json({ message: 'Invalid Resource ID format.' });
      }
      res.status(500).json({ message: 'Server error while setting moderation status.' });
    }
  }
);


export default router;
