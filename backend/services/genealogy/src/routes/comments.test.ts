import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../server'; // Assuming Express app is exported
import { User as AuthUser } from '@shared/types/auth';

import { Event as EventModel, IEvent } from '../models/Event';
import { Comment as CommentModel, IComment } from '../models/Comment';
import { Notification as NotificationModel } from '../models/Notification'; // For checking notification creation

// Mock logger
jest.mock('@shared/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// Mock authMiddleware
let mockUser: AuthUser | null = null;
jest.mock('@shared/middleware/auth', () => ({
  authMiddleware: (req: any, res: any, next: () => void) => {
    req.user = mockUser || { id: 'default-test-user-id', email: 'test@example.com', name: 'Test User' };
    next();
  },
}));

// Mock notificationCreator (optional, if you want to avoid actual Notification creation during comment tests)
// Or, let it run and verify NotificationModel entries. For this test, we'll verify NotificationModel.
// jest.mock('../services/notificationCreator', () => ({
//   createNotification: jest.fn().mockResolvedValue({ _id: 'mock-notification-id' }),
// }));


describe('Comments API (/api/events/:eventId/comments and /api/comments/:commentId)', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterEach(async () => {
    await EventModel.deleteMany({});
    await CommentModel.deleteMany({});
    await NotificationModel.deleteMany({});
    mockUser = null;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  const createTestEvent = async (userId: string, title: string = 'Test Event'): Promise<IEvent> => {
    const event = new EventModel({
      userId,
      title,
      content: 'Event content',
      date: new Date(),
      privacy: 'public', // Assume public for easier testing of comment viewing
    });
    return await event.save();
  };

  const setupMockUser = (userId: string, email: string, name?: string) => {
      mockUser = { id: userId, email, name: name || `User ${userId}` };
  };

  describe('POST /api/events/:eventId/comments', () => {
    it('should create a comment successfully on an event', async () => {
      const eventOwnerId = new mongoose.Types.ObjectId().toString();
      const commenterId = new mongoose.Types.ObjectId().toString();
      setupMockUser(commenterId, 'commenter@example.com', 'Commenter User');
      const event = await createTestEvent(eventOwnerId);

      const commentPayload = { content: 'This is a great event!' };

      const res = await request(app)
        .post(`/api/events/${event._id}/comments`)
        .send(commentPayload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body.content).toBe(commentPayload.content);
      expect(res.body.userId).toBe(commenterId);
      expect(res.body.userName).toBe('Commenter User'); // Assuming name is on req.user
      expect(res.body.resourceId).toBe(event._id.toString());
      expect(res.body.resourceType).toBe('Event');

      const dbComment = await CommentModel.findById(res.body._id);
      expect(dbComment).not.toBeNull();
    });

    it('should create a notification for the event owner when a different user comments', async () => {
      const eventOwnerId = new mongoose.Types.ObjectId().toString();
      const commenterId = new mongoose.Types.ObjectId().toString(); // Different user
      setupMockUser(commenterId, 'commenter@example.com', 'Commenter User');
      const event = await createTestEvent(eventOwnerId, 'Noteworthy Event');

      const commentPayload = { content: 'Interesting discussion point.' };

      await request(app)
        .post(`/api/events/${event._id}/comments`)
        .send(commentPayload);

      const notification = await NotificationModel.findOne({
        userId: eventOwnerId, // Notification for event owner
        type: 'new_comment',
        actorId: commenterId,
        resourceId: event._id.toString(),
      });
      expect(notification).not.toBeNull();
      expect(notification?.title).toContain('Commenter User commented on your event: "Noteworthy Event"');
    });

    it('should NOT create a notification if event owner comments on their own event', async () => {
        const eventOwnerId = new mongoose.Types.ObjectId().toString();
        setupMockUser(eventOwnerId, 'owner@example.com', 'Event Owner'); // Commenter is the owner
        const event = await createTestEvent(eventOwnerId);

        const commentPayload = { content: 'Just adding a note to my own event.' };

        await request(app)
          .post(`/api/events/${event._id}/comments`)
          .send(commentPayload);

        const notification = await NotificationModel.findOne({ userId: eventOwnerId, type: 'new_comment' });
        expect(notification).toBeNull();
    });

    it('should fail validation for empty content', async () => {
      const eventOwnerId = new mongoose.Types.ObjectId().toString();
      const commenterId = new mongoose.Types.ObjectId().toString();
      setupMockUser(commenterId, 'commenter@example.com');
      const event = await createTestEvent(eventOwnerId);

      const commentPayload = { content: '' }; // Empty content

      const res = await request(app)
        .post(`/api/events/${event._id}/comments`)
        .send(commentPayload);

      expect(res.status).toBe(400);
      expect(res.body.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({ msg: 'Comment content cannot be empty.' })
      ]));
    });

    // TODO: Add tests for parentId (replies), resource not found (404)
  });

  describe('GET /api/events/:eventId/comments', () => {
    it('should fetch comments for an event with pagination', async () => {
      const eventOwnerId = new mongoose.Types.ObjectId().toString();
      const commenterId = new mongoose.Types.ObjectId().toString();
      setupMockUser(commenterId, 'commenter@example.com');
      const event = await createTestEvent(eventOwnerId);

      // Create some comments
      await CommentModel.create([
        { resourceId: event._id, resourceType: 'Event', userId: commenterId, userName: 'User1', content: 'First comment', createdAt: new Date(Date.now() - 10000) },
        { resourceId: event._id, resourceType: 'Event', userId: eventOwnerId, userName: 'Owner', content: 'Second comment', createdAt: new Date(Date.now() - 5000) },
        { resourceId: event._id, resourceType: 'Event', userId: commenterId, userName: 'User1', content: 'Third comment' },
      ]);

      const res = await request(app)
        .get(`/api/events/${event._id}/comments?page=1&limit=2`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.totalItems).toBe(3);
      expect(res.body.pagination.totalPages).toBe(2);
      expect(res.body.pagination.page).toBe(1);
      // Comments are sorted createdAt ascending
      expect(res.body.data[0].content).toBe('First comment');
      expect(res.body.data[1].content).toBe('Second comment');
    });

    // TODO: Add tests for resource not found (404), different pages
  });

  // TODO: Add describe blocks for PUT /api/comments/:commentId and DELETE /api/comments/:commentId

});
