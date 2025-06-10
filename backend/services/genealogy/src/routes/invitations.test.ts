import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../server'; // Assuming your Express app is exported from server.ts
import { User as AuthUser } from '@shared/types/auth'; // Path to shared User type for req.user

import { FamilyTree, IFamilyTree } from '../models/FamilyTree';
import { Invitation, IInvitation } from '../models/Invitation';
import { User } from '../models/User'; // Assuming a local User model for owner/collaborator details if needed by tests

// Mock the logger to avoid console noise during tests
jest.mock('@shared/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock authMiddleware - for testing routes that require authentication
// In a real setup, you might have a test helper to generate valid JWTs
// For simplicity here, we'll mock it to directly set req.user
let mockUser: AuthUser | null = null;

jest.mock('@shared/middleware/auth', () => ({
  authMiddleware: (req: any, res: any, next: () => void) => {
    if (mockUser) {
      req.user = mockUser;
      next();
    } else {
      // If you want to test unauthenticated access for some routes (not these ones)
      // res.status(401).json({ message: 'Unauthorized for test' });
      // For these tests, we assume a user is always needed
      req.user = { id: 'test-user-id', email: 'test@example.com', name: 'Test User' }; // Default mock user
      next();
    }
  },
}));


describe('Invitations API (/api/family-trees/:treeId/invitations)', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterEach(async () => {
    // Clean up database after each test
    await FamilyTree.deleteMany({});
    await Invitation.deleteMany({});
    // await User.deleteMany({}); // If local User model is used for test data
    mockUser = null; // Reset mock user
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Helper to create a family tree for tests
  const createTestTree = async (ownerId: string, name: string = 'Test Tree'): Promise<IFamilyTree> => {
    const tree = new FamilyTree({
      name,
      ownerId,
      privacy: 'private',
      settings: { allowCollaboration: true },
    });
    return await tree.save();
  };

  // Helper to create a test user for mocking req.user
  const setupMockUser = (userId: string, email: string, name?: string) => {
      mockUser = { id: userId, email, name: name || `User ${userId}` };
  };


  describe('POST /api/family-trees/:treeId/invitations', () => {
    it('should create an invitation successfully by tree owner', async () => {
      const ownerId = new mongoose.Types.ObjectId().toString();
      setupMockUser(ownerId, 'owner@example.com', 'Tree Owner');
      const tree = await createTestTree(ownerId);

      const invitationPayload = {
        email: 'invitee@example.com',
        permissionLevel: 'viewer',
      };

      const res = await request(app)
        .post(`/api/family-trees/${tree._id}/invitations`)
        .send(invitationPayload)
        .set('Accept', 'application/json');
        // .set('Authorization', `Bearer test-token`); // If not mocking authMiddleware to set req.user

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body.inviteeEmail).toBe(invitationPayload.email.toLowerCase());
      expect(res.body.familyTreeId).toBe(tree._id.toString());
      expect(res.body.permissionLevel).toBe(invitationPayload.permissionLevel);
      expect(res.body.status).toBe('pending');
      expect(res.body).toHaveProperty('token'); // Token should be in response for this setup
      expect(res.body).toHaveProperty('expiresAt');

      const dbInvitation = await Invitation.findById(res.body._id);
      expect(dbInvitation).not.toBeNull();
      expect(dbInvitation?.inviterUserId).toBe(ownerId);
    });

    it('should fail if user is not authorized to manage the tree', async () => {
      const ownerId = new mongoose.Types.ObjectId().toString();
      const nonOwnerId = new mongoose.Types.ObjectId().toString();
      setupMockUser(nonOwnerId, 'nonowner@example.com'); // This user tries to invite
      const tree = await createTestTree(ownerId); // Tree owned by someone else

      const invitationPayload = {
        email: 'invitee@example.com',
        permissionLevel: 'viewer',
      };

      const res = await request(app)
        .post(`/api/family-trees/${tree._id}/invitations`)
        .send(invitationPayload);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('You do not have permission');
    });

    it('should fail for invalid email', async () => {
      const ownerId = new mongoose.Types.ObjectId().toString();
      setupMockUser(ownerId, 'owner@example.com');
      const tree = await createTestTree(ownerId);

      const invitationPayload = {
        email: 'invalid-email',
        permissionLevel: 'viewer',
      };

      const res = await request(app)
        .post(`/api/family-trees/${tree._id}/invitations`)
        .send(invitationPayload);

      expect(res.status).toBe(400);
      expect(res.body.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({ msg: 'A valid email is required for the invitee.' })
      ]));
    });

    it('should fail for invalid permission level', async () => {
        const ownerId = new mongoose.Types.ObjectId().toString();
        setupMockUser(ownerId, 'owner@example.com');
        const tree = await createTestTree(ownerId);

        const invitationPayload = {
          email: 'invitee@example.com',
          permissionLevel: 'owner', // Invalid
        };

        const res = await request(app)
          .post(`/api/family-trees/${tree._id}/invitations`)
          .send(invitationPayload);

        expect(res.status).toBe(400);
        expect(res.body.errors).toEqual(expect.arrayContaining([
          expect.objectContaining({ msg: 'Permission level must be either "viewer" or "editor".' })
        ]));
    });

    it('should prevent duplicate pending invitations for the same email and tree', async () => {
      const ownerId = new mongoose.Types.ObjectId().toString();
      setupMockUser(ownerId, 'owner@example.com');
      const tree = await createTestTree(ownerId);
      const inviteeEmail = 'duplicate@example.com';

      // Create first invitation
      await new Invitation({
        familyTreeId: tree._id,
        inviterUserId: ownerId,
        inviteeEmail: inviteeEmail,
        permissionLevel: 'viewer',
        status: 'pending',
        token: 'testtoken123',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
      }).save();

      const invitationPayload = {
        email: inviteeEmail,
        permissionLevel: 'editor',
      };

      const res = await request(app)
        .post(`/api/family-trees/${tree._id}/invitations`)
        .send(invitationPayload);

      expect(res.status).toBe(409); // Conflict
      expect(res.body.message).toContain('An active pending invitation for this email already exists');
    });

    // TODO: Add test for admin collaborator being able to invite
    // TODO: Add test for collaboration not enabled on tree
    // TODO: Add test for trying to invite self
    // TODO: Add test for trying to invite existing active collaborator
  });

  // TODO: Add describe block for POST /api/invitations/accept?token=:token
  //    - Test successful acceptance
  //    - Test collaborator added to FamilyTree.collaborators
  //    - Test Invitation status updated
  //    - Test failures (invalid token, expired token, user not invitee)

});
