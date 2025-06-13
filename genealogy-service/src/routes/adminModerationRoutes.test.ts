import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../server'; // Assuming Express app is exported from genealogy server.ts
import { User as AuthUser } from '@shared/types/auth'; // Shared User type
import { AuthenticatedUserWithRoles } from '@shared/middleware/adminAuth'; // For admin user type

import { Event as EventModel, IEvent } from '../models/Event';
import { Comment as CommentModel, IComment } from '../models/Comment';
import { FlaggedContent, IFlaggedContent, FlagReason, FlagStatus } from '../models/FlaggedContent';

// Mock logger
jest.mock('@shared/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// Mock middlewares
let mockAuthUser: AuthenticatedUserWithRoles | null = null; // Use the more specific type for admin tests
let mockIsAdmin: boolean = false;

jest.mock('@shared/middleware/auth', () => ({
  authMiddleware: (req: any, res: any, next: () => void) => {
    if (mockAuthUser) {
      req.user = mockAuthUser;
      next();
    } else {
      res.status(401).json({ message: 'Unauthorized for test (authMiddleware)' });
    }
  },
}));

jest.mock('@shared/middleware/adminAuth', () => ({
  adminAuth: (req: any, res: any, next: () => void) => {
    if (mockIsAdmin && req.user && req.user.roles && req.user.roles.includes('admin')) {
      next();
    } else {
      res.status(403).json({ message: 'Forbidden for test (adminAuth)' });
    }
  },
}));


describe('Admin Moderation API', () => {
  let mongoServer: MongoMemoryServer;
  let testEvent: IEvent;
  let testCommentOnEvent: IComment;
  let flagOnEvent: IFlaggedContent;
  let flagOnComment: IFlaggedContent;
  let adminUserId: string;
  let regularUserId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  beforeEach(async () => {
    adminUserId = new mongoose.Types.ObjectId().toString();
    regularUserId = new mongoose.Types.ObjectId().toString();

    mockAuthUser = { id: adminUserId, email: 'admin@example.com', name: 'Admin Mod', roles: ['user', 'admin'] };
    mockIsAdmin = true;

    testEvent = await new EventModel({ userId: regularUserId, title: 'Event to Moderate', content: 'Content...' }).save();
    testCommentOnEvent = await new CommentModel({ resourceId: testEvent._id, resourceType: 'Event', userId: regularUserId, userName: 'Commenter', content: 'Comment to moderate' }).save();

    flagOnEvent = await new FlaggedContent({ resourceId: testEvent._id, resourceType: 'Event', reportedByUserId: regularUserId, reason: 'spam', status: 'pending_review' }).save();
    flagOnComment = await new FlaggedContent({ resourceId: testCommentOnEvent._id, resourceType: 'Comment', reportedByUserId: regularUserId, reason: 'offensive', status: 'pending_review' }).save();
  });

  afterEach(async () => {
    await EventModel.deleteMany({});
    await CommentModel.deleteMany({});
    await FlaggedContent.deleteMany({});
    mockAuthUser = null;
    mockIsAdmin = false;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('GET /api/admin/flags', () => {
    it('should list pending flags by default for an admin', async () => {
      // Create one resolved flag to ensure filtering
      await new FlaggedContent({ resourceId: testEvent._id, resourceType: 'Event', reportedByUserId: regularUserId, reason: 'spam', status: 'resolved_no_action' }).save();

      const res = await request(app).get('/api/admin/flags');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2); // flagOnEvent and flagOnComment are pending
      expect(res.body.data.every((flag: IFlaggedContent) => flag.status === 'pending_review')).toBe(true);
      expect(res.body.pagination.totalItems).toBe(2);
    });

    it('should filter flags by status for an admin', async () => {
      await new FlaggedContent({ resourceId: testEvent._id, resourceType: 'Event', reportedByUserId: regularUserId, reason: 'spam', status: 'resolved_no_action' }).save();

      const res = await request(app).get('/api/admin/flags?status=resolved_no_action');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].status).toBe('resolved_no_action');
    });

    it('should return 403 if a non-admin tries to list flags', async () => {
        mockAuthUser = { id: regularUserId, email: 'user@example.com', name: 'Regular User', roles: ['user'] };
        mockIsAdmin = false;
        const res = await request(app).get('/api/admin/flags');
        expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/admin/flags/:flagId/resolve', () => {
    it('should allow admin to resolve a flag (dismiss)', async () => {
      const resolutionPayload = {
        resolutionAction: 'dismiss',
        moderatorNotes: 'Reviewed, content is fine.',
      };
      const res = await request(app)
        .put(`/api/admin/flags/${flagOnEvent._id}/resolve`)
        .send(resolutionPayload);

      expect(res.status).toBe(200);
      expect(res.body._id).toBe(flagOnEvent._id.toString());
      expect(res.body.status).toBe('resolved_no_action');
      expect(res.body.moderatorUserId).toBe(adminUserId);
      expect(res.body.moderatorNotes).toBe(resolutionPayload.moderatorNotes);

      const dbFlag = await FlaggedContent.findById(flagOnEvent._id);
      expect(dbFlag?.status).toBe('resolved_no_action');
    });

    it('should allow admin to resolve a flag (hide_content) for an Event', async () => {
      const resolutionPayload = { resolutionAction: 'hide_content', moderatorNotes: 'Content violates guidelines.' };
      const res = await request(app)
        .put(`/api/admin/flags/${flagOnEvent._id}/resolve`)
        .send(resolutionPayload);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('resolved_content_hidden');

      const dbEvent = await EventModel.findById(testEvent._id);
      expect(dbEvent?.moderationStatus).toBe('hidden_by_moderator');
    });

    it('should allow admin to resolve a flag (delete_content) for a Comment', async () => {
        const resolutionPayload = { resolutionAction: 'delete_content', moderatorNotes: 'Comment was spam.' };
        const res = await request(app)
          .put(`/api/admin/flags/${flagOnComment._id}/resolve`)
          .send(resolutionPayload);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('resolved_content_deleted');

        const dbComment = await CommentModel.findById(testCommentOnEvent._id);
        expect(dbComment).toBeNull(); // Comment should be deleted
    });

    it('should return 400 if trying to resolve an already resolved flag', async () => {
        flagOnEvent.status = 'resolved_no_action';
        await flagOnEvent.save();
        const resolutionPayload = { resolutionAction: 'dismiss', moderatorNotes: 'Trying again.' };
        const res = await request(app)
          .put(`/api/admin/flags/${flagOnEvent._id}/resolve`)
          .send(resolutionPayload);
        expect(res.status).toBe(400);
        expect(res.body.message).toContain('Flag is not pending review');
    });
    // TODO: Test validation for resolutionAction, moderatorNotes length
  });

  describe('PUT /api/admin/:resourceType/:resourceId/moderation-status', () => {
    it('should allow admin to directly set moderationStatus of an Event to hidden_by_moderator', async () => {
        const payload = { status: 'hidden_by_moderator' };
        const res = await request(app)
            .put(`/api/admin/Event/${testEvent._id}/moderation-status`) // Path needs to match route definition
            .send(payload);

        expect(res.status).toBe(200);
        expect(res.body.moderationStatus).toBe('hidden_by_moderator');
        const dbEvent = await EventModel.findById(testEvent._id);
        expect(dbEvent?.moderationStatus).toBe('hidden_by_moderator');
    });

    // TODO: Test for Comment, test setting back to 'visible', test for invalid status, test 404 if resource not found
  });

});
