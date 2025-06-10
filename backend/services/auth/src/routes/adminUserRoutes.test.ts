import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../server'; // Assuming your Express app is exported from server.ts (auth service)
import { User, IUser } from '../models/User'; // Adjust path
import { AuthenticatedUserWithRoles } from '@shared/middleware/adminAuth'; // Adjust path

// Mock the logger
jest.mock('@shared/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// Mock middlewares
let mockAuthUser: AuthenticatedUserWithRoles | null = null;
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

describe('Admin User Management API (/api/admin/users)', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterEach(async () => {
    await User.deleteMany({});
    mockAuthUser = null;
    mockIsAdmin = false;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  const createTestUser = async (userData: Partial<IUser>): Promise<IUser> => {
    const user = new User(userData);
    return await user.save();
  };

  const setupMockAdminUser = (userId: string = new mongoose.Types.ObjectId().toString()) => {
      mockAuthUser = { id: userId, email: 'admin@example.com', name: 'Admin User', roles: ['user', 'admin'] };
      mockIsAdmin = true;
  };

  const setupMockRegularUser = (userId: string = new mongoose.Types.ObjectId().toString()) => {
      mockAuthUser = { id: userId, email: 'user@example.com', name: 'Regular User', roles: ['user'] };
      mockIsAdmin = false; // Even if they have 'admin' in roles, adminAuth mock will deny if mockIsAdmin is false
  };


  describe('GET /api/admin/users', () => {
    it('should list users for an admin', async () => {
      setupMockAdminUser();
      await createTestUser({ email: 'user1@example.com', firstName: 'User', lastName: 'One', roles: ['user'] });
      await createTestUser({ email: 'user2@example.com', firstName: 'User', lastName: 'Two', roles: ['user'] });

      const res = await request(app).get('/api/admin/users?page=1&limit=5');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.total).toBe(2);
      expect(res.body.data[0].email).toBe('user2@example.com'); // Sorted by createdAt desc
    });

    it('should return 403 if non-admin tries to list users', async () => {
      setupMockRegularUser(); // This user is authenticated but not an admin via mockIsAdmin
       mockAuthUser!.roles = ['user']; // Ensure roles don't include admin for this test case

      const res = await request(app).get('/api/admin/users');
      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Forbidden for test (adminAuth)');
    });

    it('should filter users by email', async () => {
        setupMockAdminUser();
        await createTestUser({ email: 'testuser1@example.com', firstName: 'Test1' });
        await createTestUser({ email: 'another@example.com', firstName: 'Another' });

        const res = await request(app).get('/api/admin/users?email=testuser1');
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].email).toBe('testuser1@example.com');
    });
  });

  describe('PUT /api/admin/users/:userId', () => {
    it('should allow admin to update another user\'s details (firstName, isActive, roles)', async () => {
      const adminId = new mongoose.Types.ObjectId().toString();
      setupMockAdminUser(adminId);
      const userToUpdate = await createTestUser({ email: 'user@example.com', firstName: 'Original', lastName: 'Name', roles: ['user'], isActive: true });

      const updates = {
        firstName: 'UpdatedFirst',
        isActive: false,
        roles: ['user', 'editor'], // New role, not admin
      };

      const res = await request(app)
        .put(`/api/admin/users/${userToUpdate._id}`)
        .send(updates);

      expect(res.status).toBe(200);
      expect(res.body.firstName).toBe('UpdatedFirst');
      expect(res.body.isActive).toBe(false);
      expect(res.body.roles).toEqual(expect.arrayContaining(['user', 'editor']));

      const dbUser = await User.findById(userToUpdate._id);
      expect(dbUser?.firstName).toBe('UpdatedFirst');
    });

    it('should prevent admin from removing their own admin role', async () => {
      const adminId = new mongoose.Types.ObjectId().toString();
      // For this test, the user being updated IS the admin making the request
      await createTestUser({ _id: adminId, email: 'admin@example.com', roles: ['user', 'admin'], isActive: true });
      setupMockAdminUser(adminId); // Current logged-in user is this admin

      const updates = { roles: ['user'] }; // Attempting to remove 'admin' role

      const res = await request(app)
        .put(`/api/admin/users/${adminId}`)
        .send(updates);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Administrators cannot remove their own admin role.');
    });

    it('should prevent admin from deactivating their own account', async () => {
      const adminId = new mongoose.Types.ObjectId().toString();
      await createTestUser({ _id: adminId, email: 'admin@example.com', roles: ['user', 'admin'], isActive: true });
      setupMockAdminUser(adminId);

      const updates = { isActive: false };

      const res = await request(app)
        .put(`/api/admin/users/${adminId}`)
        .send(updates);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Administrators cannot deactivate their own account via this endpoint.');
    });

    it('should return 403 if a non-admin tries to update a user', async () => {
        const regularUserId = new mongoose.Types.ObjectId().toString();
        setupMockRegularUser(regularUserId); // Logged in as non-admin
        mockAuthUser!.roles = ['user'];


        const userToUpdate = await createTestUser({ email: 'target@example.com', roles: ['user'] });
        const updates = { firstName: "Malicious Update" };

        const res = await request(app)
            .put(`/api/admin/users/${userToUpdate._id}`)
            .send(updates);

        expect(res.status).toBe(403);
    });

    // TODO: Test validation errors for body (e.g. invalid role in roles array)
  });

  // TODO: Add describe blocks for GET /api/admin/users/:userId and DELETE /api/admin/users/:userId
});
