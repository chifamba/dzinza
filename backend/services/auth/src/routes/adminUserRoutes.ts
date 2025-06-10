import express, { Request, Response } from 'express';
import { query, param, body, validationResult } from 'express-validator';
import mongoose from 'mongoose';

import { User, IUser } from '../models/User'; // Adjust path as per your User model
import { authMiddleware } from '@shared/middleware/auth'; // Adjust path to shared middleware
import { adminAuth } from '@shared/middleware/adminAuth'; // Adjust path to shared middleware
import { logger } from '@shared/utils/logger'; // Adjust path to shared logger
import { AuthenticatedRequest } from '@shared/middleware/auth'; // Or your specific type for req.user

const router = express.Router();

const validRoles = ['user', 'admin', 'moderator']; // Define valid roles for validation

// GET /api/admin/users - List users with optional filtering and pagination
router.get(
  '/',
  authMiddleware,
  adminAuth,
  [
    query('page').optional().isInt({ min: 1 }).toInt().default(1),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt().default(20),
    query('email').optional().isString().trim().escape(),
    query('role').optional().isString().isIn(validRoles).withMessage(`Role must be one of: ${validRoles.join(', ')}`),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { page, limit, email, role } = req.query as any; // Cast after validation

    try {
      const queryFilter: any = {};
      if (email) {
        queryFilter.email = { $regex: email, $options: 'i' };
      }
      if (role) {
        queryFilter.roles = role; // Check if the 'roles' array contains the specified role
      }

      const totalUsers = await User.countDocuments(queryFilter);
      const users = await User.find(queryFilter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('-passwordHash'); // Ensure password hash is not selected, though toJSON should handle it

      res.status(200).json({
        data: users.map(user => user.toJSON()), // Use toJSON to strip sensitive fields
        pagination: {
          total: totalUsers,
          page,
          limit,
          totalPages: Math.ceil(totalUsers / limit),
        },
      });
    } catch (error) {
      logger.error('Admin: Error fetching users:', { error, query });
      res.status(500).json({ message: 'Server error while fetching users.' });
    }
  }
);

// GET /api/admin/users/:userId - Get specific user details
router.get(
  '/:userId',
  authMiddleware,
  adminAuth,
  [
    param('userId').isMongoId().withMessage('Invalid User ID.'),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId } = req.params;

    try {
      const user = await User.findById(userId).select('-passwordHash');
      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }
      res.status(200).json(user.toJSON());
    } catch (error) {
      logger.error(`Admin: Error fetching user ${userId}:`, { error });
      if (error instanceof mongoose.Error.CastError) {
        return res.status(400).json({ message: 'Invalid User ID format.' });
      }
      res.status(500).json({ message: 'Server error while fetching user.' });
    }
  }
);

// PUT /api/admin/users/:userId - Update user details (admin)
router.put(
  '/:userId',
  authMiddleware,
  adminAuth,
  [
    param('userId').isMongoId().withMessage('Invalid User ID.'),
    body('firstName').optional().isString().trim().notEmpty().withMessage('First name cannot be empty if provided.'),
    body('lastName').optional().isString().trim().notEmpty().withMessage('Last name cannot be empty if provided.'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean.'),
    body('roles').optional().isArray().withMessage('Roles must be an array.')
      .custom((rolesArray: string[]) => {
        if (!rolesArray.every(role => validRoles.includes(role))) {
          throw new Error(`Invalid role(s) provided. Allowed roles: ${validRoles.join(', ')}`);
        }
        return true;
      }),
    // Add other updatable fields here, e.g., email, but be cautious with email changes (verification might be needed)
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId: targetUserId } = req.params;
    const adminUserId = req.user!.id; // adminAuth ensures req.user and req.user.id exist
    const updates = req.body;

    try {
      const userToUpdate = await User.findById(targetUserId);
      if (!userToUpdate) {
        return res.status(404).json({ message: 'User not found.' });
      }

      // Self-update restrictions
      if (adminUserId === targetUserId) {
        if (updates.isActive === false) {
          return res.status(400).json({ message: 'Administrators cannot deactivate their own account via this endpoint.' });
        }
        if (updates.roles && !updates.roles.includes('admin')) {
          // Check if current user is trying to remove their own admin role
          const currentRoles = userToUpdate.roles || [];
          if (currentRoles.includes('admin')) {
            return res.status(400).json({ message: 'Administrators cannot remove their own admin role.' });
          }
        }
      }

      // Apply updates
      if (updates.firstName !== undefined) userToUpdate.firstName = updates.firstName;
      if (updates.lastName !== undefined) userToUpdate.lastName = updates.lastName;
      if (updates.isActive !== undefined) userToUpdate.isActive = updates.isActive;
      if (updates.roles !== undefined) {
        // Ensure 'user' role is always present if roles are being managed, unless explicitly only 'admin'
        // This logic might need refinement based on how roles are strictly managed.
        // For example, an admin should always also be a 'user'.
        const newRoles = [...new Set(updates.roles)]; // Deduplicate
        if (!newRoles.includes('user') && newRoles.includes('admin')) { // If admin is assigned, ensure user is also.
            // newRoles.push('user'); // This policy depends on application requirements
        } else if (newRoles.length === 0) { // If roles array is empty, default to ['user']
            // newRoles.push('user'); // Or prevent roles from being completely empty
        }
        userToUpdate.roles = newRoles;
      }
      // Add other fields like profile.bio, etc. if they are part of User model and updatable by admin

      await userToUpdate.save();
      res.status(200).json(userToUpdate.toJSON());

    } catch (error) {
      logger.error(`Admin: Error updating user ${targetUserId}:`, { error, adminUserId });
      if (error instanceof mongoose.Error.CastError && error.path === '_id') {
        return res.status(400).json({ message: 'Invalid User ID format for update.' });
      }
      res.status(500).json({ message: 'Server error while updating user.' });
    }
  }
);

// DELETE /api/admin/users/:userId - Deactivate a user (soft delete)
router.delete(
  '/:userId',
  authMiddleware,
  adminAuth,
  [
    param('userId').isMongoId().withMessage('Invalid User ID.'),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId: targetUserId } = req.params;
    const adminUserId = req.user!.id;

    if (adminUserId === targetUserId) {
      return res.status(400).json({ message: 'Administrators cannot deactivate their own account.' });
    }

    try {
      const userToDeactivate = await User.findById(targetUserId);
      if (!userToDeactivate) {
        return res.status(404).json({ message: 'User not found.' });
      }

      if (!userToDeactivate.isActive) {
        // Optionally, return a specific message or just the current state
        // For idempotency, one might just return 200 with the user.
        // For clarity, a message indicating it's already inactive.
        return res.status(200).json({ message: 'User is already inactive.', user: userToDeactivate.toJSON() });
      }

      userToDeactivate.isActive = false;
      // Consider other actions on deactivation, e.g., revoking sessions, but that's beyond this scope.
      await userToDeactivate.save();

      // TODO: Potentially log this action using ActivityLogService if available/integrated into auth service
      logger.info(`Admin: User ${targetUserId} deactivated by ${adminUserId}.`);

      res.status(200).json({ message: 'User deactivated successfully.', user: userToDeactivate.toJSON() });
      // Or res.status(204).send(); if no content is preferred for DELETE success

    } catch (error) {
      logger.error(`Admin: Error deactivating user ${targetUserId}:`, { error, adminUserId });
      if (error instanceof mongoose.Error.CastError && error.path === '_id') {
        return res.status(400).json({ message: 'Invalid User ID format for deactivation.' });
      }
      res.status(500).json({ message: 'Server error while deactivating user.' });
    }
  }
);

export default router;
