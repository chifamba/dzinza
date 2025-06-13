import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import { body, param, validationResult, matchedData } from 'express-validator';

import { Comment, IComment, CommentResourceType } from '../models/Comment';
import { Event as EventModel, IEvent } from '../models/Event'; // Assuming Event model path
// Future: import { Story as StoryModel, IStory } from '../models/Story';
import { authMiddleware, AuthenticatedRequest } from '@shared/middleware/auth'; // Assuming AuthenticatedRequest type for req.user
import { logger } from '@shared/utils/logger';
import { createNotification } from '../services/notificationCreator'; // Path to notification service

const router = express.Router();

const supportedResourceTypes: CommentResourceType[] = ['Event']; // Initially just 'Event'

// --- POST /api/:resourceType/:resourceId/comments - Create a new comment ---
router.post(
  '/:resourceType/:resourceId/comments',
  authMiddleware,
  [
    param('resourceType')
      .isIn(supportedResourceTypes)
      .withMessage(`Unsupported resource type. Supported types: ${supportedResourceTypes.join(', ')}.`),
    param('resourceId').isMongoId().withMessage('Invalid resource ID.'),
    body('content')
      .trim()
      .notEmpty().withMessage('Comment content cannot be empty.')
      .isLength({ min: 1, max: 2000 }).withMessage('Comment must be between 1 and 2000 characters.'),
    body('parentId').optional().isMongoId().withMessage('Invalid parent comment ID.'),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { resourceType, resourceId } = req.params as { resourceType: CommentResourceType, resourceId: string };
    const { content, parentId } = matchedData(req); // Gets validated data
    const userId = req.user?.id;
    const userName = req.user?.name || req.user?.email || 'Anonymous'; // Prioritize name, then email, then fallback
    const userProfileImageUrl = req.user?.profileImageUrl; // Assuming this might be on req.user

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    try {
      let resource: IEvent | null = null; // Later: | IStory | null
      if (resourceType === 'Event') {
        resource = await EventModel.findById(resourceId);
      }
      // Future: else if (resourceType === 'Story') { resource = await StoryModel.findById(resourceId); }

      if (!resource) {
        return res.status(404).json({ message: `${resourceType} not found.` });
      }

      // TODO: Add more granular permission check if needed, e.g., can user view this specific event?
      // For now, if they pass authMiddleware and the resource exists, assume they can comment.

      if (parentId) {
        const parentComment = await Comment.findById(parentId);
        if (!parentComment) {
          return res.status(400).json({ message: 'Parent comment not found.' });
        }
        if (parentComment.resourceId.toString() !== resourceId || parentComment.resourceType !== resourceType) {
          return res.status(400).json({ message: 'Parent comment does not belong to the same resource.' });
        }
      }

      const newComment = new Comment({
        resourceId: new mongoose.Types.ObjectId(resourceId),
        resourceType,
        userId,
        userName,
        userProfileImageUrl,
        content,
        parentId: parentId ? new mongoose.Types.ObjectId(parentId) : undefined,
      });

      await newComment.save();

      // Trigger Notification if someone else's event is commented on
      if (resource.userId && resource.userId.toString() !== userId) {
        // Ensure resource.title is available or use a generic title
        const eventTitle = (resource as IEvent).title || `your ${resourceType.toLowerCase()}`;

        await createNotification({
          userId: resource.userId.toString(), // ID of the event owner
          type: 'new_comment',
          title: `${userName} commented on your ${resourceType.toLowerCase()}: "${eventTitle}"`,
          message: content.substring(0, 100) + (content.length > 100 ? '...' : ''), // Snippet of comment
          link: `/${resourceType.toLowerCase()}s/${resource._id}?commentId=${newComment._id}`, // e.g., /events/event123?commentId=comment456
          actorId: userId,
          actorName: userName,
          resourceId: resource._id.toString(),
          resourceType: resourceType,
        });
      }

      // Consider populating user details for immediate display on the frontend
      // For now, returning the comment as is. Frontend can fetch user details if needed.
      res.status(201).json(newComment);

    } catch (error) {
      logger.error(`Error creating comment on ${resourceType} ${resourceId}:`, { error, userId });
      if (error instanceof mongoose.Error.ValidationError) {
          return res.status(400).json({ message: "Validation error creating comment.", details: error.errors });
      }
      res.status(500).json({ message: 'Server error while creating comment.' });
    }
  }
);

// --- GET /api/:resourceType/:resourceId/comments - Fetch comments for a resource ---
router.get(
  '/:resourceType/:resourceId/comments',
  authMiddleware, // Or public if comments can be viewed by anyone who can view the resource
  [
    param('resourceType')
      .isIn(supportedResourceTypes)
      .withMessage(`Unsupported resource type. Supported types: ${supportedResourceTypes.join(', ')}.`),
    param('resourceId').isMongoId().withMessage('Invalid resource ID.'),
    query('page').optional().isInt({ min: 1 }).toInt().default(1),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt().default(20),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { resourceType, resourceId } = req.params as { resourceType: CommentResourceType, resourceId: string };
    const { page, limit } = req.query as any; // Validated and cast
    const userId = req.user?.id; // For permission check if needed

    try {
      // Verify resource exists and user has permission to view it (basic check)
      let resource: IEvent | null = null; // Later: | IStory | null
      if (resourceType === 'Event') {
        resource = await EventModel.findById(resourceId);
      }
      // Future: else if (resourceType === 'Story') { resource = await StoryModel.findById(resourceId); }

      if (!resource) {
        return res.status(404).json({ message: `${resourceType} not found.` });
      }

      // TODO: Implement more granular resource view permission check if necessary.
      // e.g., if (resource.privacy === 'private' && resource.userId.toString() !== userId && !resource.collaborators.some(c => c.userId === userId)) return res.status(403);

      const queryFilter = {
        resourceId: new mongoose.Types.ObjectId(resourceId),
        resourceType: resourceType,
        // parentId: null, // Optional: Only fetch top-level comments if frontend handles fetching replies separately
      };

      const totalItems = await Comment.countDocuments(queryFilter);
      const comments = await Comment.find(queryFilter)
        .sort({ createdAt: 1 }) // Ascending to show oldest first, typical for comment threads
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<IComment[]>();
        // Consider populating author details if not denormalized enough:
        // .populate('userId', 'name profileImageUrl'); // If userId were a ref to a local User model

      res.status(200).json({
        data: comments,
        pagination: {
          page,
          limit,
          totalItems,
          totalPages: Math.ceil(totalItems / limit),
        },
      });

    } catch (error) {
      logger.error(`Error fetching comments for ${resourceType} ${resourceId}:`, { error, userId });
      if (error instanceof mongoose.Error.CastError && error.path === '_id') {
          return res.status(400).json({ message: 'Invalid resource ID format.' });
      }
      res.status(500).json({ message: 'Server error while fetching comments.' });
    }
  }
);

// --- PUT /api/comments/:commentId - Update a comment ---
router.put(
  '/comments/:commentId', // Note: Path is different from the resource-scoped ones
  authMiddleware,
  [
    param('commentId').isMongoId().withMessage('Invalid comment ID.'),
    body('content')
      .trim()
      .notEmpty().withMessage('Comment content cannot be empty.')
      .isLength({ min: 1, max: 2000 }).withMessage('Comment must be between 1 and 2000 characters.'),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { commentId } = req.params;
    const { content } = matchedData(req);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    try {
      const comment = await Comment.findById(commentId);

      if (!comment) {
        return res.status(404).json({ message: 'Comment not found.' });
      }

      if (comment.userId.toString() !== userId) {
        return res.status(403).json({ message: 'You are not authorized to edit this comment.' });
      }

      comment.content = content;
      comment.edited = true;
      // Mongoose 'updatedAt' will be automatically updated by {timestamps: true}
      await comment.save();

      res.status(200).json(comment);

    } catch (error) {
      logger.error(`Error updating comment ${commentId}:`, { error, userId });
       if (error instanceof mongoose.Error.CastError && error.path === '_id') {
          return res.status(400).json({ message: 'Invalid comment ID format.' });
      }
      res.status(500).json({ message: 'Server error while updating comment.' });
    }
  }
);

// --- DELETE /api/comments/:commentId - Delete a comment ---
router.delete(
  '/comments/:commentId',
  authMiddleware,
  [
    param('commentId').isMongoId().withMessage('Invalid comment ID.'),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { commentId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    try {
      const comment = await Comment.findById(commentId);

      if (!comment) {
        return res.status(404).json({ message: 'Comment not found.' });
      }

      // Authorization: User must be the comment author OR the owner of the resource (e.g., event)
      let canDelete = false;
      if (comment.userId.toString() === userId) {
        canDelete = true; // Author can delete their own comment
      } else {
        // Check if user is the owner of the resource (e.g., Event owner)
        if (comment.resourceType === 'Event') {
          const event = await EventModel.findById(comment.resourceId);
          if (event && event.userId.toString() === userId) {
            canDelete = true;
          }
        }
        // Future: else if (comment.resourceType === 'Story') { ... check story owner ... }
      }

      if (!canDelete) {
        return res.status(403).json({ message: 'You are not authorized to delete this comment.' });
      }

      // Optional: Handle replies (e.g., delete them, anonymize, or prevent deletion if replies exist)
      // For now, simple delete. If replies have parentId pointing to this comment, they'd be orphaned.
      // A more robust strategy might be to find and delete replies:
      // await Comment.deleteMany({ parentId: commentId });

      await Comment.findByIdAndDelete(commentId); // Corrected from comment.remove() or comment.delete()

      res.status(204).send();

    } catch (error) {
      logger.error(`Error deleting comment ${commentId}:`, { error, userId });
       if (error instanceof mongoose.Error.CastError && error.path === '_id') {
          return res.status(400).json({ message: 'Invalid comment ID format.' });
      }
      res.status(500).json({ message: 'Server error while deleting comment.' });
    }
  }
);

export default router;
