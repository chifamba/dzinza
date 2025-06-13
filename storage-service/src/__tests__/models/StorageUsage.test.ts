import { StorageUsage, StorageAnalytics } from '../../models/StorageUsage';
import { createTestUser } from '../helpers/cleanup';

describe('StorageUsage Model', () => {
  describe('Schema Validation', () => {
    it('should create a valid storage usage document', async () => {
      const user = createTestUser();
      const usageData = {
        userId: user._id,
        totalFiles: 25,
        totalSize: 50000000, // 50MB
        categorySizes: {
          documents: 10000000,
          images: 35000000,
          videos: 5000000,
          audio: 0,
          other: 0
        },
        monthlyUploads: 5,
        quotaUsed: 50000000,
        quotaLimit: 5000000000, // 5GB
        quotaPercentage: 1.0
      };

      const usage = new StorageUsage(usageData);
      const savedUsage = await usage.save();

      expect(savedUsage._id).toBeDefined();
      expect(savedUsage.userId).toBe(user._id);
      expect(savedUsage.totalFiles).toBe(25);
      expect(savedUsage.totalSize).toBe(50000000);
      expect(savedUsage.categorySizes.images).toBe(35000000);
      expect(savedUsage.quotaPercentage).toBe(1.0);
      expect(savedUsage.lastCalculated).toBeDefined();
    });

    it('should require userId', async () => {
      const usageData = {
        totalFiles: 10,
        totalSize: 1000000
      };

      const usage = new StorageUsage(usageData);
      
      await expect(usage.save()).rejects.toThrow();
    });

    it('should default quota limit to 5GB', async () => {
      const user = createTestUser();
      const usageData = {
        userId: user._id,
        totalFiles: 5,
        totalSize: 1000000
      };

      const usage = new StorageUsage(usageData);
      const savedUsage = await usage.save();

      expect(savedUsage.quotaLimit).toBe(5 * 1024 * 1024 * 1024); // 5GB in bytes
    });

    it('should default category sizes', async () => {
      const user = createTestUser();
      const usageData = {
        userId: user._id,
        totalFiles: 3,
        totalSize: 500000
      };

      const usage = new StorageUsage(usageData);
      const savedUsage = await usage.save();

      expect(savedUsage.categorySizes.documents).toBe(0);
      expect(savedUsage.categorySizes.images).toBe(0);
      expect(savedUsage.categorySizes.videos).toBe(0);
      expect(savedUsage.categorySizes.audio).toBe(0);
      expect(savedUsage.categorySizes.other).toBe(0);
    });
  });

  describe('Virtual Properties', () => {
    it('should format quota used correctly', async () => {
      const user = createTestUser();
      const usage = new StorageUsage({
        userId: user._id,
        totalFiles: 10,
        totalSize: 2048000, // ~2MB
        quotaUsed: 2048000
      });

      const savedUsage = await usage.save();
      // Access virtual property using get()
      expect((savedUsage as any).formattedQuotaUsed).toBe('1.95 MB');
    });

    it('should format quota limit correctly', async () => {
      const user = createTestUser();
      const usage = new StorageUsage({
        userId: user._id,
        totalFiles: 10,
        totalSize: 1000000,
        quotaLimit: 5 * 1024 * 1024 * 1024 // 5GB
      });

      const savedUsage = await usage.save();
      // Access virtual property using get()
      expect((savedUsage as any).formattedQuotaLimit).toBe('5 GB');
    });
  });

  describe('Quota Calculations', () => {
    it('should calculate quota percentage correctly', async () => {
      const user = createTestUser();
      const quotaLimit = 1000000; // 1MB
      const quotaUsed = 250000;   // 0.25MB (25%)

      const usage = new StorageUsage({
        userId: user._id,
        totalFiles: 5,
        totalSize: quotaUsed,
        quotaUsed,
        quotaLimit,
        quotaPercentage: (quotaUsed / quotaLimit) * 100
      });

      const savedUsage = await usage.save();
      expect(savedUsage.quotaPercentage).toBe(25);
    });

    it('should handle quota over limit', async () => {
      const user = createTestUser();
      const quotaLimit = 1000000; // 1MB
      const quotaUsed = 1200000;  // 1.2MB (120%)

      const usage = new StorageUsage({
        userId: user._id,
        totalFiles: 10,
        totalSize: quotaUsed,
        quotaUsed,
        quotaLimit,
        quotaPercentage: Math.min((quotaUsed / quotaLimit) * 100, 100)
      });

      const savedUsage = await usage.save();
      expect(savedUsage.quotaPercentage).toBe(100);
    });
  });
});

describe('StorageAnalytics Model', () => {
  describe('Schema Validation', () => {
    it('should create a valid analytics document', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const analyticsData = {
        date: today,
        totalUsers: 150,
        totalFiles: 2500,
        totalStorage: 500000000, // 500MB
        newUploadsToday: 25,
        deletionsToday: 3,
        topFileTypes: [
          { type: 'images', count: 1500, size: 300000000 },
          { type: 'documents', count: 800, size: 150000000 },
          { type: 'videos', count: 200, size: 50000000 }
        ],
        averageFileSize: 200000, // 200KB
        storageGrowthRate: 5.2
      };

      const analytics = new StorageAnalytics(analyticsData);
      const savedAnalytics = await analytics.save();

      expect(savedAnalytics._id).toBeDefined();
      expect(savedAnalytics.date).toEqual(today);
      expect(savedAnalytics.totalUsers).toBe(150);
      expect(savedAnalytics.totalFiles).toBe(2500);
      expect(savedAnalytics.totalStorage).toBe(500000000);
      expect(savedAnalytics.topFileTypes).toHaveLength(3);
      expect(savedAnalytics.topFileTypes[0].type).toBe('images');
      expect(savedAnalytics.storageGrowthRate).toBe(5.2);
    });

    it('should require date', async () => {
      const analyticsData = {
        totalUsers: 100,
        totalFiles: 1000,
        totalStorage: 100000000
      };

      const analytics = new StorageAnalytics(analyticsData);
      
      await expect(analytics.save()).rejects.toThrow();
    });

    it('should require unique date', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const analyticsData = {
        date: today,
        totalUsers: 100,
        totalFiles: 1000,
        totalStorage: 100000000
      };

      // Save first document
      const analytics1 = new StorageAnalytics(analyticsData);
      await analytics1.save();

      // Try to save second document with same date
      const analytics2 = new StorageAnalytics(analyticsData);
      
      await expect(analytics2.save()).rejects.toThrow();
    });

    it('should default counters to 0', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const analyticsData = {
        date: today,
        totalUsers: 50,
        totalFiles: 500,
        totalStorage: 50000000
      };

      const analytics = new StorageAnalytics(analyticsData);
      const savedAnalytics = await analytics.save();

      expect(savedAnalytics.newUploadsToday).toBe(0);
      expect(savedAnalytics.deletionsToday).toBe(0);
    });
  });

  describe('File Type Statistics', () => {
    it('should store top file types correctly', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const topFileTypes = [
        { type: 'images', count: 1000, size: 500000000 },
        { type: 'documents', count: 500, size: 100000000 },
        { type: 'videos', count: 100, size: 200000000 }
      ];

      const analytics = new StorageAnalytics({
        date: today,
        totalUsers: 100,
        totalFiles: 1600,
        totalStorage: 800000000,
        topFileTypes
      });

      const savedAnalytics = await analytics.save();
      expect(savedAnalytics.topFileTypes).toHaveLength(3);
      expect(savedAnalytics.topFileTypes[0].type).toBe('images');
      expect(savedAnalytics.topFileTypes[0].count).toBe(1000);
      expect(savedAnalytics.topFileTypes[0].size).toBe(500000000);
    });
  });

  describe('Growth Rate Calculations', () => {
    it('should store positive growth rate', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const analytics = new StorageAnalytics({
        date: today,
        totalUsers: 120,
        totalFiles: 1200,
        totalStorage: 120000000,
        storageGrowthRate: 8.5
      });

      const savedAnalytics = await analytics.save();
      expect(savedAnalytics.storageGrowthRate).toBe(8.5);
    });

    it('should store negative growth rate', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const analytics = new StorageAnalytics({
        date: today,
        totalUsers: 80,
        totalFiles: 800,
        totalStorage: 80000000,
        storageGrowthRate: -2.3
      });

      const savedAnalytics = await analytics.save();
      expect(savedAnalytics.storageGrowthRate).toBe(-2.3);
    });
  });
});
