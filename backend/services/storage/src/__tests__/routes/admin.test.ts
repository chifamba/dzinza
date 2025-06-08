import request from 'supertest';
import express from 'express';
import { File, StorageUsage, StorageAnalytics } from '../../models';
import adminRoutes from '../../routes/admin';
import { 
  createTestUser, 
  createTestAdminUser, 
  createTestToken 
} from '../helpers/cleanup';

// Mock the auth module
jest.mock('../../../../../shared/middleware/auth', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.user = { id: 'admin-user-id', email: 'admin@example.com', isAdmin: true };
    next();
  },
  requireAdmin: (req: any, res: any, next: any) => {
    req.user = { id: 'admin-user-id', email: 'admin@example.com', isAdmin: true };
    next();
  }
}));

// Create test app
const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);

describe('Admin Routes', () => {
  describe('GET /api/admin/storage/overview', () => {
    beforeEach(async () => {
      const user = createTestUser();
      
      // Create test files
      await File.create([
        {
          userId: user._id,
          originalName: 'test1.jpg',
          filename: 'test1.jpg',
          mimetype: 'image/jpeg',
          size: 1000000,
          category: 'image',
          s3Key: 'test1.jpg',
          url: 'url1',
          status: 'ready'
        },
        {
          userId: user._id,
          originalName: 'test2.pdf',
          filename: 'test2.pdf',
          mimetype: 'application/pdf',
          size: 2000000,
          category: 'documents',
          s3Key: 'test2.pdf',
          url: 'url2',
          status: 'ready'
        },
        {
          userId: user._id,
          originalName: 'error.jpg',
          filename: 'error.jpg',
          mimetype: 'image/jpeg',
          size: 500000,
          category: 'image',
          s3Key: 'error.jpg',
          url: 'url3',
          status: 'error'
        }
      ]);
    });

    it('should return comprehensive storage overview', async () => {
      const response = await request(app)
        .get('/api/admin/storage/overview')
        .expect(200);

      expect(response.body.overview).toBeDefined();
      expect(response.body.overview.totalFiles).toBe(2); // Only ready files
      expect(response.body.overview.totalUsers).toBe(1);
      expect(response.body.overview.totalStorage).toBe(3000000);
      expect(response.body.overview.formattedTotalStorage).toBe('3.00 MB');
      expect(response.body.overview.errorFiles).toBe(1);
      expect(response.body.overview.processingFiles).toBe(0);

      expect(response.body.fileTypes).toBeDefined();
      expect(response.body.fileTypes).toHaveLength(2);
      
      expect(response.body.topUsers).toBeDefined();
      expect(response.body.topUsers[0].fileCount).toBe(2);
      expect(response.body.topUsers[0].totalSize).toBe(3000000);
    });

    it('should include recent analytics if available', async () => {
      // Create analytics record
      await StorageAnalytics.create({
        date: new Date(),
        totalUsers: 10,
        totalFiles: 100,
        totalStorage: 100000000,
        newUploadsToday: 5,
        deletionsToday: 1,
        averageFileSize: 1000000,
        storageGrowthRate: 3.5
      });

      const response = await request(app)
        .get('/api/admin/storage/overview')
        .expect(200);

      expect(response.body.recentAnalytics).toBeDefined();
      expect(response.body.recentAnalytics.totalUsers).toBe(10);
      expect(response.body.recentAnalytics.storageGrowthRate).toBe(3.5);
    });
  });

  describe('GET /api/admin/storage/users', () => {
    beforeEach(async () => {
      const user1 = createTestUser();
      const user2 = { ...createTestUser(), _id: '507f1f77bcf86cd799439013' };

      // Create storage usage records
      await StorageUsage.create([
        {
          userId: user1._id,
          totalFiles: 10,
          totalSize: 5000000,
          quotaUsed: 5000000,
          quotaPercentage: 1.0
        },
        {
          userId: user2._id,
          totalFiles: 25,
          totalSize: 15000000,
          quotaUsed: 15000000,
          quotaPercentage: 3.0
        }
      ]);
    });

    it('should return paginated user storage data', async () => {
      const response = await request(app)
        .get('/api/admin/storage/users')
        .query({ page: 1, limit: 10, sort: 'usage' })
        .expect(200);

      expect(response.body.users).toHaveLength(2);
      expect(response.body.pagination.current).toBe(1);
      expect(response.body.pagination.totalUsers).toBe(2);

      // Should be sorted by usage (descending)
      expect(response.body.users[0].totalSize).toBeGreaterThanOrEqual(
        response.body.users[1].totalSize
      );
    });

    it('should sort by file count', async () => {
      const response = await request(app)
        .get('/api/admin/storage/users')
        .query({ sort: 'files' })
        .expect(200);

      expect(response.body.users[0].totalFiles).toBeGreaterThanOrEqual(
        response.body.users[1].totalFiles
      );
    });

    it('should format user storage data correctly', async () => {
      const response = await request(app)
        .get('/api/admin/storage/users')
        .expect(200);

      const user = response.body.users[0];
      expect(user.formattedSize).toBeDefined();
      expect(user.quotaUsage).toBeDefined();
      expect(user.categorySizes).toBeDefined();
    });
  });

  describe('POST /api/admin/storage/cleanup', () => {
    beforeEach(async () => {
      const user = createTestUser();

      // Create temporary files (expired)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await File.create([
        {
          userId: user._id,
          originalName: 'temp1.jpg',
          filename: 'temp1.jpg',
          mimetype: 'image/jpeg',
          size: 1000000,
          category: 'image',
          s3Key: 'temp/temp1.jpg',
          url: 'temp-url-1',
          status: 'ready',
          expiresAt: yesterday
        },
        {
          userId: user._id,
          originalName: 'temp2.jpg',
          filename: 'temp2.jpg',
          mimetype: 'image/jpeg',
          size: 2000000,
          category: 'image',
          s3Key: 'temp/temp2.jpg',
          url: 'temp-url-2',
          status: 'ready',
          expiresAt: yesterday
        }
      ]);
    });

    it('should perform dry run cleanup of temporary files', async () => {
      const response = await request(app)
        .post('/api/admin/storage/cleanup')
        .send({
          type: 'temp',
          dryRun: true
        })
        .expect(200);

      expect(response.body.message).toContain('preview');
      expect(response.body.results.type).toBe('temp');
      expect(response.body.results.dryRun).toBe(true);
      expect(response.body.results.filesFound).toBe(2);
      expect(response.body.results.filesProcessed).toBe(0);
      expect(response.body.results.spaceSaved).toBe(3000000);
      expect(response.body.results.formattedSpaceSaved).toBe('3.00 MB');

      // Verify files still exist
      const tempFiles = await File.find({ expiresAt: { $exists: true } });
      expect(tempFiles).toHaveLength(2);
    });

    it('should actually cleanup temporary files when not dry run', async () => {
      const response = await request(app)
        .post('/api/admin/storage/cleanup')
        .send({
          type: 'temp',
          dryRun: false
        })
        .expect(200);

      expect(response.body.message).toContain('completed');
      expect(response.body.results.filesProcessed).toBe(2);
      expect(response.body.results.spaceSaved).toBe(3000000);

      // Verify files were marked as deleted
      const deletedFiles = await File.find({ 
        expiresAt: { $exists: true },
        status: 'deleted'
      });
      expect(deletedFiles).toHaveLength(2);
    });

    it('should cleanup error files', async () => {
      // Create old error files
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const user = createTestUser();

      await File.create({
        userId: user._id,
        originalName: 'error.jpg',
        filename: 'error.jpg',
        mimetype: 'image/jpeg',
        size: 500000,
        category: 'image',
        s3Key: 'error.jpg',
        url: 'error-url',
        status: 'error',
        uploadedAt: twoDaysAgo
      });

      const response = await request(app)
        .post('/api/admin/storage/cleanup')
        .send({
          type: 'errors',
          dryRun: false
        })
        .expect(200);

      expect(response.body.results.filesFound).toBe(1);
      expect(response.body.results.filesProcessed).toBe(1);

      // Verify error file was deleted
      const errorFiles = await File.find({ status: 'error' });
      expect(errorFiles).toHaveLength(0);
    });

    it('should handle invalid cleanup type', async () => {
      const response = await request(app)
        .post('/api/admin/storage/cleanup')
        .send({
          type: 'invalid',
          dryRun: true
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid cleanup type');
    });
  });

  describe('GET /api/admin/storage/analytics', () => {
    beforeEach(async () => {
      // Create analytics for the last 7 days
      const dates = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        dates.push(date);
      }

      const analyticsData = dates.map((date, index) => ({
        date,
        totalUsers: 100 + index * 5,
        totalFiles: 1000 + index * 50,
        totalStorage: 100000000 + index * 5000000,
        newUploadsToday: 10 + index,
        deletionsToday: index,
        averageFileSize: 100000,
        storageGrowthRate: 2.5 + index * 0.5
      }));

      await StorageAnalytics.create(analyticsData);
    });

    it('should return analytics for specified days', async () => {
      const response = await request(app)
        .get('/api/admin/storage/analytics')
        .query({ days: 7 })
        .expect(200);

      expect(response.body.analytics).toHaveLength(7);
      expect(response.body.analytics[0].date).toBeDefined();
      expect(response.body.analytics[0].formattedStorage).toBeDefined();
      expect(response.body.analytics[0].averageFileSize).toBeDefined();

      // Should be sorted by date ascending
      const dates = response.body.analytics.map((a: any) => new Date(a.date));
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i].getTime()).toBeGreaterThanOrEqual(dates[i-1].getTime());
      }
    });

    it('should calculate trends between latest and previous day', async () => {
      const response = await request(app)
        .get('/api/admin/storage/analytics')
        .query({ days: 7 })
        .expect(200);

      expect(response.body.trends).toBeDefined();
      expect(response.body.trends.storageGrowth).toBeDefined();
      expect(response.body.trends.fileGrowth).toBeDefined();
      expect(response.body.trends.userGrowth).toBeDefined();
      
      // All should be positive growth based on our test data
      expect(parseFloat(response.body.trends.storageGrowth)).toBeGreaterThan(0);
      expect(parseFloat(response.body.trends.fileGrowth)).toBeGreaterThan(0);
    });

    it('should include summary of latest analytics', async () => {
      const response = await request(app)
        .get('/api/admin/storage/analytics')
        .query({ days: 7 })
        .expect(200);

      expect(response.body.summary).toBeDefined();
      expect(response.body.summary.currentStorage).toBeDefined();
      expect(response.body.summary.currentFiles).toBeDefined();
      expect(response.body.summary.currentUsers).toBeDefined();
      expect(response.body.summary.dailyGrowthRate).toBeDefined();
    });

    it('should default to 30 days if no days specified', async () => {
      const response = await request(app)
        .get('/api/admin/storage/analytics')
        .expect(200);

      // Should return all 7 analytics records (less than 30 days)
      expect(response.body.analytics).toHaveLength(7);
    });
  });

  describe('POST /api/admin/storage/recalculate', () => {
    beforeEach(async () => {
      const user = createTestUser();
      
      // Create files for testing recalculation
      await File.create([
        {
          userId: user._id,
          originalName: 'calc1.jpg',
          filename: 'calc1.jpg',
          mimetype: 'image/jpeg',
          size: 1000000,
          category: 'image',
          s3Key: 'calc1.jpg',
          url: 'calc-url-1',
          status: 'ready'
        },
        {
          userId: user._id,
          originalName: 'calc2.pdf',
          filename: 'calc2.pdf',
          mimetype: 'application/pdf',
          size: 2000000,
          category: 'documents',
          s3Key: 'calc2.pdf',
          url: 'calc-url-2',
          status: 'ready'
        }
      ]);
    });

    it('should recalculate storage usage for all users', async () => {
      const response = await request(app)
        .post('/api/admin/storage/recalculate')
        .expect(200);

      expect(response.body.message).toBe('Storage recalculation completed');
      expect(response.body.usersProcessed).toBe(1);
      expect(response.body.totalUsers).toBe(1);

      // Verify storage usage was created/updated
      const usage = await StorageUsage.findOne({});
      expect(usage).toBeDefined();
      expect(usage?.totalFiles).toBe(2);
      expect(usage?.totalSize).toBe(3000000);
      expect(usage?.categorySizes.images).toBe(1000000);
      expect(usage?.categorySizes.documents).toBe(2000000);
    });

    it('should handle users with no files', async () => {
      // Create a user with no files by having storage usage but no actual files
      const anotherUser = '507f1f77bcf86cd799439020';
      await StorageUsage.create({
        userId: anotherUser,
        totalFiles: 5,
        totalSize: 5000000
      });

      const response = await request(app)
        .post('/api/admin/storage/recalculate')
        .expect(200);

      expect(response.body.usersProcessed).toBe(2);
      
      // Check that the user with no files got reset to 0
      const emptyUsage = await StorageUsage.findOne({ userId: anotherUser });
      expect(emptyUsage?.totalFiles).toBe(0);
      expect(emptyUsage?.totalSize).toBe(0);
    });
  });

  describe('Admin Authorization', () => {
    it('should reject non-admin users', async () => {
      // Mock non-admin user
      const originalAuthMiddleware = require('../../../shared/middleware/auth').authMiddleware;
      require('../../../shared/middleware/auth').authMiddleware = (req: any, res: any, next: any) => {
        req.user = createTestUser(); // Regular user (not admin)
        next();
      };

      const response = await request(app)
        .get('/api/admin/storage/overview')
        .expect(403);

      expect(response.body.error).toBe('Admin access required');

      // Restore original middleware
      require('../../../shared/middleware/auth').authMiddleware = originalAuthMiddleware;
    });
  });
});
