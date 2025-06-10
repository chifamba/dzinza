import express, { Request, Response } from 'express';
import { query, param, validationResult } from 'express-validator';
import mongoose from 'mongoose';

import { Notification, INotification } from '../models/Notification';
import { authMiddleware } from '@shared/middleware/auth';
import { logger } from '@shared/utils/logger';

const router = express.Router();

// --- GET /api/notifications - Fetch notifications for the authenticated user ---
router.get(
  '/', // Assuming router is mounted at /api/notifications
  authMiddleware,
  [
    query('page').optional().isInt({ min: 1 }).toInt().default(1),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt().default(20),
    query('isRead').optional().isBoolean().toBoolean(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const { page, limit, isRead } = req.query as any; // Cast after validation

    try {
      const queryFilter: any = { userId };
      if (isRead !== undefined) { // Check if isRead was actually provided in query
        queryFilter.isRead = isRead;
      }

      const totalItems = await Notification.countDocuments(queryFilter);
      const notifications = await Notification.find(queryFilter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<INotification[]>(); // Use lean for performance

      res.status(200).json({
        data: notifications,
        pagination: {
          page,
          limit,
          totalItems,
          totalPages: Math.ceil(totalItems / limit),
        },
      });
    } catch (error) {
      logger.error(`Error fetching notifications for user ${userId}:`, error);
      res.status(500).json({ message: 'Server error while fetching notifications.' });
    }
  }
);

// --- PATCH /api/notifications/:notificationId/read - Mark a specific notification as read ---
router.patch(
  '/:notificationId/read', // Assuming router is mounted at /api/notifications
  authMiddleware,
  [
    param('notificationId').isMongoId().withMessage('Invalid Notification ID.'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user?.id;
    const { notificationId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    try {
      const notification = await Notification.findById(notificationId);

      if (!notification) {
        return res.status(404).json({ message: 'Notification not found.' });
      }

      if (notification.userId.toString() !== userId) {
        logger.warn(`User ${userId} attempted to mark notification ${notificationId} not belonging to them as read.`);
        return res.status(403).json({ message: 'You are not authorized to update this notification.' });
      }

      if (notification.isRead) {
        // Optionally return early if already read, or just save again (idempotent)
        // return res.status(200).json(notification);
      }

      notification.isRead = true;
      await notification.save();

      res.status(200).json(notification);
    } catch (error) {
      logger.error(`Error marking notification ${notificationId} as read for user ${userId}:`, error);
      if (error instanceof mongoose.Error.CastError && error.path === '_id') {
        return res.status(400).json({ message: 'Invalid Notification ID format.' });
      }
      res.status(500).json({ message: 'Server error while updating notification.' });
    }
  }
);

// --- PATCH /api/notifications/mark-all-read - Mark all unread notifications as read for the user ---
router.patch(
  '/mark-all-read', // Assuming router is mounted at /api/notifications
  authMiddleware,
  async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    try {
      const updateResult = await Notification.updateMany(
        { userId, isRead: false },
        { $set: { isRead: true } }
      );

      res.status(200).json({
        message: 'All unread notifications marked as read.',
        count: updateResult.modifiedCount, // nModified is deprecated, use modifiedCount
      });
    } catch (error) {
      logger.error(`Error marking all notifications as read for user ${userId}:`, error);
      res.status(500).json({ message: 'Server error while updating notifications.' });
    }
  }
);

export default router;
