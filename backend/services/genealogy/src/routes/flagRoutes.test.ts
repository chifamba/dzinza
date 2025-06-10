import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../server'; // Assuming Express app is exported from genealogy server.ts
import { User as AuthUser } from '@shared/types/auth'; // Shared User type

import { Event as EventModel, IEvent } from '../models/Event';
import { Comment as CommentModel, IComment } from '../models/Comment';
import { FlaggedContent, IFlaggedContent } from '../models/FlaggedContent';

// Mock logger
jest.mock('@shared/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// Mock authMiddleware
let mockAuthUser: AuthUser | null = null;
jest.mock('@shared/middleware/auth', () => ({
  authMiddleware: (req: any, res: any, next: () => void) => {
    if (mockAuthUser) {
      req.user = mockAuthUser;
      next();
    } else {
      // For this route, auth is required.
      res.status(401).json({ message: 'Unauthorized for test (authMiddleware)' });
    }
  },
}));

describe('Flagging API (/api/flags)', () => {
  let mongoServer: MongoMemoryServer;
  let testEvent: IEvent;
  let testComment: IComment;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  beforeEach(async () => {
    // Create some resources to flag
    const eventOwnerId = new mongoose.Types.ObjectId().toString();
    testEvent = await new EventModel({ userId: eventOwnerId, title: 'Test Event for Flagging', content: 'Some content' }).save();
    testComment = await new CommentModel({ resourceId: testEvent._id, resourceType: 'Event', userId: eventOwnerId, userName: 'EventOwner', content: 'A comment to flag' }).save();

    // Default authenticated user for flagging
    mockAuthUser = { id: new mongoose.Types.ObjectId().toString(), email: 'reporter@example.com', name: 'Reporter User', roles: ['user'] };
  });

  afterEach(async () => {
    await EventModel.deleteMany({});
    await CommentModel.deleteMany({});
    await FlaggedContent.deleteMany({});
    mockAuthUser = null;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('POST /api/flags', () => {
    it('should allow an authenticated user to flag an event successfully', async () => {
      const flagPayload = {
        resourceId: testEvent._id.toString(),
        resourceType: 'Event',
        reason: 'spam',
      };

      const res = await request(app)
        .post('/api/flags')
        .send(flagPayload);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body.resourceId).toBe(flagPayload.resourceId);
      expect(res.body.resourceType).toBe(flagPayload.resourceType);
      expect(res.body.reason).toBe(flagPayload.reason);
      expect(res.body.reportedByUserId).toBe(mockAuthUser!.id);
      expect(res.body.status).toBe('pending_review');

      const dbFlag = await FlaggedContent.findById(res.body._id);
      expect(dbFlag).not.toBeNull();
    });

    it('should allow flagging a comment with a custom reason for "other"', async () => {
        const flagPayload = {
          resourceId: testComment._id.toString(),
          resourceType: 'Comment',
          reason: 'other',
          customReason: 'This comment seems out of context.',
        };

        const res = await request(app)
          .post('/api/flags')
          .send(flagPayload);

        expect(res.status).toBe(201);
        expect(res.body.customReason).toBe(flagPayload.customReason);
        expect(res.body.reason).toBe('other');
    });

    it('should return 400 if resourceId is missing or invalid', async () => {
      const flagPayload = {
        // resourceId: testEvent._id.toString(), // Missing
        resourceType: 'Event',
        reason: 'spam',
      };
      const resMissing = await request(app).post('/api/flags').send(flagPayload);
      expect(resMissing.status).toBe(400);
      expect(resMissing.body.errors).toEqual(expect.arrayContaining([
          expect.objectContaining({ msg: 'Valid resource ID is required.'})
      ]));

      const resInvalid = await request(app).post('/api/flags').send({...flagPayload, resourceId: 'invalid-id'});
      expect(resInvalid.status).toBe(400);
    });

    it('should return 400 if reason is "other" but customReason is missing', async () => {
        const flagPayload = {
          resourceId: testEvent._id.toString(),
          resourceType: 'Event',
          reason: 'other',
          // customReason: 'This is missing',
        };
        const res = await request(app).post('/api/flags').send(flagPayload);
        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual(expect.arrayContaining([
            expect.objectContaining({ msg: 'Custom reason is required when reason is "other".'})
        ]));
    });

    it('should return 404 if the resource to be flagged does not exist', async () => {
        const nonExistentId = new mongoose.Types.ObjectId().toString();
        const flagPayload = {
            resourceId: nonExistentId,
            resourceType: 'Event',
            reason: 'spam',
        };
        const res = await request(app).post('/api/flags').send(flagPayload);
        expect(res.status).toBe(404);
        expect(res.body.message).toBe(`Event with ID ${nonExistentId} not found.`);
    });

    it('should return 409 if the same user tries to flag the same content again while pending review', async () => {
      const flagPayload = {
        resourceId: testEvent._id.toString(),
        resourceType: 'Event',
        reason: 'spam',
      };
      // First flag
      await request(app).post('/api/flags').send(flagPayload).expect(201);

      // Second attempt by the same user
      const res = await request(app).post('/api/flags').send(flagPayload);
      expect(res.status).toBe(409);
      expect(res.body.message).toBe('You have already flagged this content and it is pending review.');
    });

    it('should allow a different user to flag the same content', async () => {
        const flagPayload = {
          resourceId: testEvent._id.toString(),
          resourceType: 'Event',
          reason: 'spam',
        };
        // First user flags
        await request(app).post('/api/flags').send(flagPayload).expect(201);

        // Setup different user
        mockAuthUser = { id: new mongoose.Types.ObjectId().toString(), email: 'reporter2@example.com', name: 'Reporter Two', roles: ['user'] };

        // Second user flags the same content
        const res = await request(app).post('/api/flags').send(flagPayload);
        expect(res.status).toBe(201); // Should be successful for the second user
    });

  });
});
