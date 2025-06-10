import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../server'; // Assuming Express app is exported from server.ts (auth service)
import { SiteSetting, ISiteSetting, GLOBAL_SETTINGS_ID } from '../models/SiteSetting'; // Adjust path
import { AuthenticatedUserWithRoles } from '@shared/middleware/adminAuth'; // Adjust path

// Mock logger
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


describe('Admin Site Settings API (/api/admin/settings)', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterEach(async () => {
    await SiteSetting.deleteMany({});
    mockAuthUser = null;
    mockIsAdmin = false;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  const setupMockAdminUser = (userId: string = new mongoose.Types.ObjectId().toString()) => {
      mockAuthUser = { id: userId, email: 'admin@example.com', name: 'Admin User', roles: ['user', 'admin'] };
      mockIsAdmin = true;
  };

  const setupMockRegularUser = (userId: string = new mongoose.Types.ObjectId().toString()) => {
    mockAuthUser = { id: userId, email: 'user@example.com', name: 'Regular User', roles: ['user'] };
    mockIsAdmin = false;
  };


  describe('GET /api/admin/settings', () => {
    it('should retrieve default settings if none exist (first time access by admin)', async () => {
      setupMockAdminUser();
      const res = await request(app).get('/api/admin/settings');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('_id', GLOBAL_SETTINGS_ID);
      expect(res.body.siteName).toBe('Dzinza Platform'); // Default value
      expect(res.body.maintenanceMode).toBe(false);

      const dbSettings = await SiteSetting.findById(GLOBAL_SETTINGS_ID);
      expect(dbSettings).not.toBeNull(); // Should have been created
    });

    it('should retrieve existing settings for an admin', async () => {
      setupMockAdminUser();
      await new SiteSetting({ siteName: 'My Custom Platform', maintenanceMode: true }).save();

      const res = await request(app).get('/api/admin/settings');

      expect(res.status).toBe(200);
      expect(res.body.siteName).toBe('My Custom Platform');
      expect(res.body.maintenanceMode).toBe(true);
    });

    it('should return 403 if a non-admin tries to access settings', async () => {
      setupMockRegularUser();
      mockAuthUser!.roles = ['user']; // Ensure not admin

      const res = await request(app).get('/api/admin/settings');
      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/admin/settings', () => {
    it('should allow admin to update site settings (e.g., siteName, maintenanceMode)', async () => {
      const adminId = new mongoose.Types.ObjectId().toString();
      setupMockAdminUser(adminId);
      await (SiteSetting as any).getSettings(); // Ensure settings doc exists

      const updates = {
        siteName: 'Updated Dzinza Site',
        maintenanceMode: true,
        contactEmail: 'support@updated.com',
      };

      const res = await request(app)
        .put('/api/admin/settings')
        .send(updates);

      expect(res.status).toBe(200);
      expect(res.body.siteName).toBe(updates.siteName);
      expect(res.body.maintenanceMode).toBe(updates.maintenanceMode);
      expect(res.body.contactEmail).toBe(updates.contactEmail);
      expect(res.body.updatedBy.toString()).toBe(adminId);

      const dbSettings = await SiteSetting.findById(GLOBAL_SETTINGS_ID);
      expect(dbSettings?.siteName).toBe(updates.siteName);
    });

    it('should correctly update featureFlags', async () => {
        setupMockAdminUser();
        await (SiteSetting as any).getSettings();

        const updates = {
          featureFlags: { newOnboarding: true, betaFeatureX: false }
        };

        const res = await request(app)
          .put('/api/admin/settings')
          .send(updates);

        expect(res.status).toBe(200);
        expect(res.body.featureFlags).toBeDefined();
        // Mongoose Map toObject() converts Map to a plain object.
        expect(res.body.featureFlags.newOnboarding).toBe(true);
        expect(res.body.featureFlags.betaFeatureX).toBe(false);

        const dbSettings = await SiteSetting.findById(GLOBAL_SETTINGS_ID);
        expect(dbSettings?.featureFlags.get('newOnboarding')).toBe(true);
    });

    it('should return validation error for invalid defaultLanguage', async () => {
      setupMockAdminUser();
      await (SiteSetting as any).getSettings();

      const updates = { defaultLanguage: 'fr' }; // 'fr' is not in enum ['en', 'sn', 'nd']

      const res = await request(app)
        .put('/api/admin/settings')
        .send(updates);

      expect(res.status).toBe(400);
      expect(res.body.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({ msg: expect.stringContaining('Default language must be one of:') })
      ]));
    });

    it('should return 403 if non-admin tries to update settings', async () => {
        setupMockRegularUser();
        mockAuthUser!.roles = ['user'];
        const updates = { siteName: "Attempted Update" };

        const res = await request(app)
            .put('/api/admin/settings')
            .send(updates);
        expect(res.status).toBe(403);
    });
  });
});
