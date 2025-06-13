import express, { Request, Response } from 'express';
import { param, query, validationResult } from 'express-validator';
import mongoose from 'mongoose';

import { ActivityLog, IActivityLog } from '../models/ActivityLog';
import { FamilyTree } from '../models/FamilyTree'; // Assuming FamilyTree model path for access check
import { authMiddleware } from '@shared/middleware/auth';
import { logger } from '@shared/utils/logger';

const router = express.Router();

// --- GET /api/family-trees/:treeId/activity-logs ---
// Note: This route is defined to be nested under family-trees.
// If this router is mounted at /api/activity-logs, the route would be /:treeId (less clear)
// If this router is mounted at /api, the route would be /family-trees/:treeId/activity-logs
// This implementation assumes the latter or that the treeId is part of a path this router handles.
// For clarity, if this router is specifically for activity logs, it might be mounted like:
// app.use('/api/family-trees', activityLogsRouter); -> then route is /:treeId/activity-logs
// Or: app.use('/api', activityLogsRouter); -> then route is /family-trees/:treeId/activity-logs

router.get(
  // If router is mounted at /api, this path should be '/family-trees/:treeId/activity-logs'
  // If router is mounted at /api/family-trees, this path should be '/:treeId/activity-logs'
  // Given the task, it's likely the router will be specific or mounted to achieve the full path.
  // Let's assume the router will be mounted at `/api` and this handles `/family-trees/:treeId/activity-logs`
  '/family-trees/:treeId/activity-logs',
  authMiddleware,
  [
    param('treeId').isMongoId().withMessage('Invalid Family Tree ID.'),
    query('page').optional().isInt({ min: 1 }).toInt().default(1),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt().default(20),
    // Optional filters for activity logs could be added here, e.g., actionType, userId (actor)
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const requesterUserId = req.user?.id;
    if (!requesterUserId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const { treeId } = req.params;
    const { page, limit } = req.query as any; // Cast after validation

    try {
      const familyTree = await FamilyTree.findById(treeId);
      if (!familyTree) {
        return res.status(404).json({ message: 'Family Tree not found.' });
      }

      // Authorization: Check if the user can view the family tree
      // Assuming FamilyTree model has a canUserView method or similar logic
      if (!familyTree.canUserView(requesterUserId)) {
        // canUserView should check ownerId or if user is an accepted collaborator
        return res.status(403).json({ message: 'You do not have permission to view activity logs for this tree.' });
      }

      const queryFilter: any = { familyTreeId: new mongoose.Types.ObjectId(treeId) };

      const totalItems = await ActivityLog.countDocuments(queryFilter);
      const activityLogs = await ActivityLog.find(queryFilter)
        .sort({ createdAt: -1 }) // Most recent first
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<IActivityLog[]>();

      res.status(200).json({
        data: activityLogs,
        pagination: {
          page,
          limit,
          totalItems,
          totalPages: Math.ceil(totalItems / limit),
        },
      });
    } catch (error) {
      logger.error(`Error fetching activity logs for tree ${treeId} by user ${requesterUserId}:`, error);
      if (error instanceof mongoose.Error.CastError && error.path === '_id') {
         return res.status(400).json({ message: 'Invalid Family Tree ID format.' });
      }
      res.status(500).json({ message: 'Server error while fetching activity logs.' });
    }
  }
);

export default router;
