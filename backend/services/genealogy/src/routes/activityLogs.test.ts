import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../server'; // Assuming Express app is exported
import { User as AuthUser } from '@shared/types/auth';

import { FamilyTree, IFamilyTree } from '../models/FamilyTree';
import { ActivityLog, IActivityLog } from '../models/ActivityLog';
import { Event as EventModel } // For testing integration
from '../models/Event';
import { recordActivity } from '../services/activityLogService'; // To potentially spy on or ensure it's called

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

// Spy on recordActivity to check if it's called.
// Note: This requires activityLogService.js to export non-default function or to mock the module.
// For simplicity, we will check the DB for actual log entries in the integration part.
// const activityLogService = require('../services/activityLogService');
// const recordActivitySpy = jest.spyOn(activityLogService, 'recordActivity');


describe('Activity Logs API', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterEach(async () => {
    await FamilyTree.deleteMany({});
    await ActivityLog.deleteMany({});
    await EventModel.deleteMany({}); // Clean events if used for integration tests
    mockUser = null;
    // recordActivitySpy.mockClear(); // Clear spy if used
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  const createTestTree = async (ownerId: string, collaborators: { userId: string, role: string, acceptedAt?: Date }[] = []): Promise<IFamilyTree> => {
    const tree = new FamilyTree({
      name: 'Activity Test Tree',
      ownerId,
      privacy: 'private', // Default to private, tests can override if they create specific trees
      collaborators: collaborators.map(c => ({...c, status: 'accepted', acceptedAt: c.acceptedAt || new Date()})),
      settings: { allowCollaboration: true },
    });
    return await tree.save();
  };

  const setupMockUser = (userId: string, email: string = 'test@example.com', name?: string) => {
      mockUser = { id: userId, email, name: name || `User ${userId}` };
  };

  describe('GET /api/family-trees/:treeId/activity-logs', () => {
    it('should fetch activity logs for a specific family tree if user is owner', async () => {
      const ownerId = new mongoose.Types.ObjectId().toString();
      setupMockUser(ownerId);
      const tree = await createTestTree(ownerId);

      // Create some sample activity logs for this tree
      await ActivityLog.create([
        { userId: ownerId, userName: 'Owner', actionType: 'CREATE_FAMILY_TREE', familyTreeId: tree._id, details: 'Tree created' },
        { userId: ownerId, userName: 'Owner', actionType: 'UPDATE_FAMILY_TREE_SETTINGS', familyTreeId: tree._id, details: 'Settings updated' },
      ]);
      // Create a log for another tree to ensure filtering
      await ActivityLog.create({ userId: ownerId, actionType: 'CREATE_FAMILY_TREE', familyTreeId: new mongoose.Types.ObjectId(), details: 'Another tree' });


      const res = await request(app)
        .get(`/api/family-trees/${tree._id}/activity-logs?page=1&limit=10`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].details).toBe('Settings updated'); // Sorted by createdAt desc
      expect(res.body.data[1].details).toBe('Tree created');
      expect(res.body.pagination.totalItems).toBe(2);
    });

    it('should fetch activity logs if user is an accepted collaborator', async () => {
        const ownerId = new mongoose.Types.ObjectId().toString();
        const collaboratorId = new mongoose.Types.ObjectId().toString();
        setupMockUser(collaboratorId); // Logged in as collaborator
        const tree = await createTestTree(ownerId, [{ userId: collaboratorId, role: 'viewer' }]);

        await ActivityLog.create(
          { userId: ownerId, actionType: 'CREATE_FAMILY_TREE', familyTreeId: tree._id, details: 'Tree created by owner' }
        );

        const res = await request(app)
          .get(`/api/family-trees/${tree._id}/activity-logs`);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].details).toBe('Tree created by owner');
    });

    it('should return 403 if user does not have view access to the tree', async () => {
      const ownerId = new mongoose.Types.ObjectId().toString();
      const otherUserId = new mongoose.Types.ObjectId().toString();
      setupMockUser(otherUserId); // Logged in as a user with no relation to the tree
      const tree = await createTestTree(ownerId); // Tree is private by default

      const res = await request(app)
        .get(`/api/family-trees/${tree._id}/activity-logs`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('You do not have permission to view activity logs for this tree.');
    });

    // TODO: Add tests for pagination (page, limit)
  });

  describe('recordActivity Integration', () => {
    it('should create an activity log when a new event is created', async () => {
      const eventCreatorId = new mongoose.Types.ObjectId().toString();
      setupMockUser(eventCreatorId, 'eventcreator@example.com', 'Event Creator');
      const tree = await createTestTree(eventCreatorId); // Event needs a tree context for this test

      const eventPayload = {
        title: 'Major Family Event',
        content: 'Details about the major event.',
        date: new Date().toISOString(),
        familyTreeId: tree._id.toString(), // Link event to the tree
      };

      // Make request to create an event (this route is in events.ts, tested separately for its own functionality)
      // We assume the event creation itself works and now check for the side effect (activity log)
      const eventRes = await request(app)
        .post('/api/events') // Assuming global mount for events.ts router
        .send(eventPayload);

      expect(eventRes.status).toBe(201); // Precondition: event creation was successful
      const createdEvent = eventRes.body;

      // Check for the activity log
      const activityLog = await ActivityLog.findOne({
        actionType: 'CREATE_EVENT',
        userId: eventCreatorId,
        targetResourceId: createdEvent._id.toString(),
        familyTreeId: tree._id,
      });

      expect(activityLog).not.toBeNull();
      expect(activityLog?.targetResourceType).toBe('Event');
      expect(activityLog?.targetResourceName).toBe(eventPayload.title);
      expect(activityLog?.details).toContain(`created event '${eventPayload.title}'`);
      expect(activityLog?.userName).toBe('Event Creator');
    });

    // TODO: Add similar integration tests for:
    // - UPDATE_FAMILY_TREE_SETTINGS (after PUT /api/family-trees/:id)
    // - UPDATE_COLLABORATOR_ROLE (after PUT /api/family-trees/:treeId/collaborators/:collaboratorUserId)
  });

});
