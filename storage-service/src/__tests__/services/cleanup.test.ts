import { CleanupService } from '../../services/cleanup';
import { File, StorageUsage, StorageAnalytics } from '../../models';
import { createTestUser } from '../helpers/cleanup';

// Mock node-cron
jest.mock('node-cron');

// Mock S3Service
jest.mock('../../services/s3', () => ({
  S3Service: {
    deleteFile: jest.fn().mockResolvedValue(true),
    fileExists: jest.fn().mockResolvedValue(false) // Simulate orphaned files
  }
}));

describe('CleanupService', () => {
  describe('Initialization', () => {
    it('should initialize cleanup service with cron jobs', () => {
      const cronSchedule = require('node-cron').schedule;
      
      CleanupService.initialize();
      
      // Verify cron jobs were scheduled
      expect(cronSchedule).toHaveBeenCalledTimes(3);
      
      // Check daily cleanup schedule (2 AM)
      expect(cronSchedule).toHaveBeenCalledWith(
        '0 2 * * *',
        expect.any(Function)
      );
      
      // Check hourly analytics update
      expect(cronSchedule).toHaveBeenCalledWith(
        '0 * * * *',
        expect.any(Function)
      );
      
      // Check 6-hourly storage recalculation
      expect(cronSchedule).toHaveBeenCalledWith(
        '0 */6 * * *',
        expect.any(Function)
      );
    });

    it('should not reinitialize if already initialized', () => {
      const cronSchedule = require('node-cron').schedule;
      cronSchedule.mockClear();
      
      // Initialize twice
      CleanupService.initialize();
      CleanupService.initialize();
      
      // Should only be called once (from previous test or first call)
      expect(cronSchedule).not.toHaveBeenCalled();
    });
  });

  describe('cleanupTemporaryFiles', () => {
    beforeEach(async () => {
      const user = createTestUser();
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Create expired temporary files
      await File.create([
        {
          userId: user._id,
          originalName: 'expired1.jpg',
          filename: 'expired1.jpg',
          mimeType: 'image/jpeg',
          size: 1000000,
          category: 'image',
          s3Bucket: "dzinza-storage-test",
          s3Key: 'temp/expired1.jpg',
          url: 'temp-url-1',
          status: 'ready',
          expiresAt: yesterday
        },
        {
          userId: user._id,
          originalName: 'expired2.jpg',
          filename: 'expired2.jpg',
          mimeType: 'image/jpeg',
          size: 2000000,
          category: 'image',
          s3Bucket: "dzinza-storage-test",
          s3Key: 'temp/expired2.jpg',
          url: 'temp-url-2',
          status: 'ready',
          expiresAt: yesterday
        },
        {
          userId: user._id,
          originalName: 'valid.jpg',
          filename: 'valid.jpg',
          mimeType: 'image/jpeg',
          size: 500000,
          category: 'image',
          s3Bucket: "dzinza-storage-test",
          s3Key: 'temp/valid.jpg',
          url: 'temp-url-3',
          status: 'ready',
          expiresAt: tomorrow
        }
      ]);
    });

    it('should delete only expired temporary files', async () => {
      const deletedCount = await CleanupService.cleanupTemporaryFiles();

      expect(deletedCount).toBe(2);

      // Verify expired files were marked as deleted
      const expiredFiles = await File.find({
        expiresAt: { $lt: new Date() },
        status: 'deleted'
      });
      expect(expiredFiles).toHaveLength(2);

      // Verify non-expired file still exists
      const validFiles = await File.find({
        expiresAt: { $gt: new Date() },
        status: 'ready'
      });
      expect(validFiles).toHaveLength(1);
    });

    it('should handle S3 deletion errors gracefully', async () => {
      const { S3Service } = require('../../services/s3');
      S3Service.deleteFile.mockRejectedValueOnce(new Error('S3 Error'));

      const deletedCount = await CleanupService.cleanupTemporaryFiles();

      // Should still process other files even if one fails
      expect(deletedCount).toBeGreaterThan(0);
    });
  });

  describe('cleanupOrphanedFiles', () => {
    beforeEach(async () => {
      const user = createTestUser();

      // Create files that exist in DB but not in S3 (orphaned)
      await File.create([
        {
          userId: user._id,
          originalName: 'orphaned1.jpg',
          filename: 'orphaned1.jpg',
          mimeType: 'image/jpeg',
          size: 1000000,
          category: 'image',
          s3Bucket: "dzinza-storage-test",
          s3Key: 'orphaned/orphaned1.jpg',
          url: 'orphaned-url-1',
          status: 'ready'
        },
        {
          userId: user._id,
          originalName: 'orphaned2.pdf',
          filename: 'orphaned2.pdf',
          mimeType: 'application/pdf',
          size: 2000000,
          category: 'documents',
          s3Bucket: "dzinza-storage-test",
          s3Key: 'orphaned/orphaned2.pdf',
          url: 'orphaned-url-2',
          status: 'ready'
        }
      ]);
    });

    it('should mark orphaned files as deleted', async () => {
      const deletedCount = await CleanupService.cleanupOrphanedFiles();

      expect(deletedCount).toBe(2);

      // Verify files were marked as deleted
      const orphanedFiles = await File.find({ status: 'deleted' });
      expect(orphanedFiles).toHaveLength(2);
    });

    it('should handle files that exist in S3', async () => {
      const { S3Service } = require('../../services/s3');
      
      // Mock that first file exists in S3
      S3Service.fileExists
        .mockResolvedValueOnce(true)  // First file exists
        .mockResolvedValueOnce(false); // Second file doesn't exist

      const deletedCount = await CleanupService.cleanupOrphanedFiles();

      expect(deletedCount).toBe(1); // Only one orphaned file

      // Verify only one file was marked as deleted
      const deletedFiles = await File.find({ status: 'deleted' });
      expect(deletedFiles).toHaveLength(1);
    });
  });

  describe('cleanupErrorFiles', () => {
    beforeEach(async () => {
      const user = createTestUser();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Create old error files and recent error files
      await File.create([
        {
          userId: user._id,
          originalName: 'old-error1.jpg',
          filename: 'old-error1.jpg',
          mimeType: 'image/jpeg',
          size: 1000000,
          category: 'image',
          s3Bucket: "dzinza-storage-test",
          s3Key: 'errors/old-error1.jpg',
          url: 'error-url-1',
          status: 'error',
          uploadedAt: sevenDaysAgo
        },
        {
          userId: user._id,
          originalName: 'old-error2.jpg',
          filename: 'old-error2.jpg',
          mimeType: 'image/jpeg',
          size: 500000,
          category: 'image',
          s3Bucket: "dzinza-storage-test",
          s3Key: 'errors/old-error2.jpg',
          url: 'error-url-2',
          status: 'error',
          uploadedAt: sevenDaysAgo
        },
        {
          userId: user._id,
          originalName: 'recent-error.jpg',
          filename: 'recent-error.jpg',
          mimeType: 'image/jpeg',
          size: 750000,
          category: 'image',
          s3Bucket: "dzinza-storage-test",
          s3Key: 'errors/recent-error.jpg',
          url: 'error-url-3',
          status: 'error',
          uploadedAt: yesterday
        }
      ]);
    });

    it('should delete only error files older than 7 days', async () => {
      const deletedCount = await CleanupService.cleanupErrorFiles();

      expect(deletedCount).toBe(2);

      // Verify old error files were deleted from database
      const remainingErrorFiles = await File.find({ status: 'error' });
      expect(remainingErrorFiles).toHaveLength(1);
      expect(remainingErrorFiles[0].originalName).toBe('recent-error.jpg');
    });

    it('should handle S3 deletion errors for error files', async () => {
      const { S3Service } = require('../../services/s3');
      S3Service.deleteFile.mockRejectedValue(new Error('S3 Error'));

      const deletedCount = await CleanupService.cleanupErrorFiles();

      // Should still delete from database even if S3 fails
      expect(deletedCount).toBe(2);
    });
  });

  describe('cleanupStuckProcessingFiles', () => {
    beforeEach(async () => {
      const user = createTestUser();
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

      // Create stuck processing files and recent processing files
      await File.create([
        {
          userId: user._id,
          originalName: 'stuck1.jpg',
          filename: 'stuck1.jpg',
          mimeType: 'image/jpeg',
          size: 1000000,
          category: 'image',
          s3Bucket: "dzinza-storage-test",
          s3Key: 'processing/stuck1.jpg',
          url: 'processing-url-1',
          status: 'processing',
          uploadedAt: oneHourAgo
        },
        {
          userId: user._id,
          originalName: 'stuck2.jpg',
          filename: 'stuck2.jpg',
          mimeType: 'image/jpeg',
          size: 2000000,
          category: 'image',
          s3Bucket: "dzinza-storage-test",
          s3Key: 'processing/stuck2.jpg',
          url: 'processing-url-2',
          status: 'processing',
          uploadedAt: oneHourAgo
        },
        {
          userId: user._id,
          originalName: 'recent.jpg',
          filename: 'recent.jpg',
          mimeType: 'image/jpeg',
          size: 500000,
          category: 'image',
          s3Bucket: "dzinza-storage-test",
          s3Key: 'processing/recent.jpg',
          url: 'processing-url-3',
          status: 'processing',
          uploadedAt: thirtyMinutesAgo
        }
      ]);
    });

    it('should mark stuck processing files as error', async () => {
      const fixedCount = await CleanupService.cleanupStuckProcessingFiles();

      expect(fixedCount).toBe(2);

      // Verify stuck files were marked as error
      const errorFiles = await File.find({ status: 'error' });
      expect(errorFiles).toHaveLength(2);

      // Verify recent processing file is still processing
      const processingFiles = await File.find({ status: 'processing' });
      expect(processingFiles).toHaveLength(1);
      expect(processingFiles[0].originalName).toBe('recent.jpg');
    });
  });

  describe('updateStorageAnalytics', () => {
    beforeEach(async () => {
      const user = createTestUser();
      const today = new Date();
      
      // Create files for analytics
      await File.create([
        {
          userId: user._id,
          originalName: 'analytics1.jpg',
          filename: 'analytics1.jpg',
          mimeType: 'image/jpeg',
          size: 2000000,
          category: 'image',
          s3Bucket: "dzinza-storage-test",
          s3Key: 'analytics1.jpg',
          url: 'analytics-url-1',
          status: 'ready',
          uploadedAt: today
        },
        {
          userId: user._id,
          originalName: 'analytics2.pdf',
          filename: 'analytics2.pdf',
          mimeType: 'application/pdf',
          size: 1000000,
          category: 'documents',
          s3Bucket: "dzinza-storage-test",
          s3Key: 'analytics2.pdf',
          url: 'analytics-url-2',
          status: 'ready',
          uploadedAt: today
        }
      ]);
    });

    it('should create daily analytics record', async () => {
      await CleanupService.updateStorageAnalytics();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const analytics = await StorageAnalytics.findOne({ date: today });
      expect(analytics).toBeDefined();
      expect(analytics?.totalUsers).toBe(1);
      expect(analytics?.totalFiles).toBe(2);
      expect(analytics?.totalStorage).toBe(3000000);
      expect(analytics?.newUploadsToday).toBe(2);
      expect(analytics?.topFileTypes).toHaveLength(2);
    });

    it('should not create duplicate analytics for same day', async () => {
      // Run analytics twice
      await CleanupService.updateStorageAnalytics();
      await CleanupService.updateStorageAnalytics();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const analyticsRecords = await StorageAnalytics.find({ date: today });
      expect(analyticsRecords).toHaveLength(1);
    });

    it('should calculate storage growth rate', async () => {
      // Create previous day analytics
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      await StorageAnalytics.create({
        date: yesterday,
        totalUsers: 1,
        totalFiles: 1,
        totalStorage: 1000000,
        averageFileSize: 1000000,
        storageGrowthRate: 0
      });

      await CleanupService.updateStorageAnalytics();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayAnalytics = await StorageAnalytics.findOne({ date: today });
      expect(todayAnalytics?.storageGrowthRate).toBeGreaterThan(0);
    });
  });

  describe('recalculateStorageUsage', () => {
    beforeEach(async () => {
      const user = createTestUser();
      
      // Create files for different categories
      await File.create([
        {
          userId: user._id,
          originalName: 'image.jpg',
          filename: 'image.jpg',
          mimeType: 'image/jpeg',
          size: 2000000,
          category: 'image',
          s3Bucket: "dzinza-storage-test",
          s3Key: 'image.jpg',
          url: 'image-url',
          status: 'ready'
        },
        {
          userId: user._id,
          originalName: 'doc.pdf',
          filename: 'doc.pdf',
          mimeType: 'application/pdf',
          size: 1000000,
          category: 'documents',
          s3Bucket: "dzinza-storage-test",
          s3Key: 'doc.pdf',
          url: 'doc-url',
          status: 'ready'
        },
        {
          userId: user._id,
          originalName: 'deleted.jpg',
          filename: 'deleted.jpg',
          mimeType: 'image/jpeg',
          size: 500000,
          category: 'image',
          s3Bucket: "dzinza-storage-test",
          s3Key: 'deleted.jpg',
          url: 'deleted-url',
          status: 'deleted'
        }
      ]);
    });

    it('should recalculate storage usage for all users', async () => {
      await CleanupService.recalculateStorageUsage();

      const usage = await StorageUsage.findOne({});
      expect(usage).toBeDefined();
      expect(usage?.totalFiles).toBe(2); // Only non-deleted files
      expect(usage?.totalSize).toBe(3000000);
      expect(usage?.categorySizes.images).toBe(2000000);
      expect(usage?.categorySizes.documents).toBe(1000000);
      expect(usage?.quotaPercentage).toBeGreaterThan(0);
    });

    it('should update existing storage usage records', async () => {
      const user = createTestUser();
      
      // Create existing usage record with wrong data
      await StorageUsage.create({
        userId: user._id,
        totalFiles: 100,
        totalSize: 100000000,
        quotaUsed: 100000000
      });

      await CleanupService.recalculateStorageUsage();

      const usage = await StorageUsage.findOne({ userId: user._id });
      expect(usage?.totalFiles).toBe(2); // Corrected value
      expect(usage?.totalSize).toBe(3000000); // Corrected value
    });
  });

  describe('calculateUserStorageUsage', () => {
    beforeEach(async () => {
      const user = createTestUser();
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      // Create files with monthly uploads
      await File.create([
        {
          userId: user._id,
          originalName: 'monthly1.jpg',
          filename: 'monthly1.jpg',
          mimeType: 'image/jpeg',
          size: 1000000,
          category: 'image',
          s3Bucket: "dzinza-storage-test",
          s3Key: 'monthly1.jpg',
          url: 'monthly-url-1',
          status: 'ready',
          uploadedAt: thisMonth
        },
        {
          userId: user._id,
          originalName: 'monthly2.jpg',
          filename: 'monthly2.jpg',
          mimeType: 'image/jpeg',
          size: 2000000,
          category: 'image',
          s3Bucket: "dzinza-storage-test",
          s3Key: 'monthly2.jpg',
          url: 'monthly-url-2',
          status: 'ready',
          uploadedAt: thisMonth
        }
      ]);
    });

    it('should calculate usage for specific user', async () => {
      const user = createTestUser();
      
      await CleanupService.calculateUserStorageUsage(user._id);

      const usage = await StorageUsage.findOne({ userId: user._id });
      expect(usage).toBeDefined();
      expect(usage?.totalFiles).toBe(2);
      expect(usage?.totalSize).toBe(3000000);
      expect(usage?.monthlyUploads).toBe(2);
      expect(usage?.lastCalculated).toBeDefined();
    });

    it('should handle user with no files', async () => {
      const emptyUserId = '507f1f77bcf86cd799439020';
      
      await CleanupService.calculateUserStorageUsage(emptyUserId);

      const usage = await StorageUsage.findOne({ userId: emptyUserId });
      expect(usage).toBeDefined();
      expect(usage?.totalFiles).toBe(0);
      expect(usage?.totalSize).toBe(0);
      expect(usage?.monthlyUploads).toBe(0);
    });
  });
});
