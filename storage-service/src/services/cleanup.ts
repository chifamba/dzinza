import cron from 'node-cron';
import { File, StorageUsage, StorageAnalytics } from '../models';
import { S3Service } from './s3';
import { logger } from '@shared/utils/logger';

export class CleanupService {
  private static isInitialized = false;

  public static initialize(): void {
    if (this.isInitialized) {
      return;
    }

    // Run cleanup every day at 2 AM
    cron.schedule('0 2 * * *', async () => {
      logger.info('Starting daily cleanup tasks');
      await this.runDailyCleanup();
    });

    // Run analytics update every hour
    cron.schedule('0 * * * *', async () => {
      await this.updateStorageAnalytics();
    });

    // Run storage usage recalculation every 6 hours
    cron.schedule('0 */6 * * *', async () => {
      await this.recalculateStorageUsage();
    });

    this.isInitialized = true;
    logger.info('Cleanup service initialized with scheduled tasks');
  }

  public static async runDailyCleanup(): Promise<void> {
    try {
      logger.info('Running daily cleanup tasks');

      // 1. Clean up temporary files
      await this.cleanupTemporaryFiles();

      // 2. Clean up orphaned files
      await this.cleanupOrphanedFiles();

      // 3. Clean up error files older than 7 days
      await this.cleanupErrorFiles();

      // 4. Clean up old processing files (stuck for more than 1 hour)
      await this.cleanupStuckProcessingFiles();

      logger.info('Daily cleanup tasks completed');

    } catch (error) {
      logger.error('Daily cleanup failed:', error);
    }
  }

  public static async cleanupTemporaryFiles(): Promise<number> {
    try {
      const expiredFiles = await File.find({
        expiresAt: { $lt: new Date() },
        status: { $ne: 'deleted' }
      });

      let deletedCount = 0;
      let freedSpace = 0;

      for (const file of expiredFiles) {
        try {
          // Delete from S3
          await S3Service.deleteFile(file.s3Key);
          
          // Mark as deleted in database
          await File.findByIdAndUpdate(file._id, { 
            status: 'deleted',
            deletedAt: new Date()
          });
          
          deletedCount++;
          freedSpace += file.size;
          
          logger.debug(`Deleted temporary file: ${file.filename}`);

        } catch (error) {
          logger.error(`Failed to delete temporary file ${file.filename}:`, error);
        }
      }

      if (deletedCount > 0) {
        logger.info(`Cleaned up ${deletedCount} temporary files, freed ${this.formatBytes(freedSpace)}`);
      }

      return deletedCount;

    } catch (error) {
      logger.error('Temporary files cleanup failed:', error);
      return 0;
    }
  }

  public static async cleanupOrphanedFiles(): Promise<number> {
    try {
      // Find files that exist in S3 but not in database
      const s3Files = await S3Service.listAllFiles();
      const dbFileKeys = await File.find({ status: { $ne: 'deleted' } })
        .distinct('s3Key');

      const orphanedS3Files = s3Files.filter((s3Key: string) => !dbFileKeys.includes(s3Key));
      
      let deletedCount = 0;

      for (const s3Key of orphanedS3Files) {
        try {
          await S3Service.deleteFile(s3Key);
          deletedCount++;
          logger.debug(`Deleted orphaned S3 file: ${s3Key}`);
        } catch (error) {
          logger.error(`Failed to delete orphaned S3 file ${s3Key}:`, error);
        }
      }

      // Find database records without S3 files
      const dbFiles = await File.find({ status: 'ready' }).select('_id s3Key filename size');
      let dbOrphansCount = 0;
      let freedSpace = 0;

      for (const file of dbFiles) {
        try {
          const exists = await S3Service.fileExists(file.s3Key);
          if (!exists) {
            await File.findByIdAndUpdate(file._id, { 
              status: 'deleted',
              deletedAt: new Date(),
              errorMessage: 'File not found in S3'
            });
            dbOrphansCount++;
            freedSpace += file.size;
            logger.debug(`Marked as deleted DB record without S3 file: ${file.filename}`);
          }
        } catch (error) {
          logger.error(`Failed to check existence of ${file.filename}:`, error);
        }
      }

      const totalCleaned = deletedCount + dbOrphansCount;
      if (totalCleaned > 0) {
        logger.info(`Cleaned up ${deletedCount} orphaned S3 files and ${dbOrphansCount} orphaned DB records`);
      }

      return totalCleaned;

    } catch (error) {
      logger.error('Orphaned files cleanup failed:', error);
      return 0;
    }
  }

  public static async cleanupErrorFiles(): Promise<number> {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const errorFiles = await File.find({
        status: 'error',
        uploadedAt: { $lt: sevenDaysAgo }
      });

      let deletedCount = 0;
      let freedSpace = 0;

      for (const file of errorFiles) {
        try {
          // Try to delete from S3 (may not exist)
          try {
            await S3Service.deleteFile(file.s3Key);
          } catch (s3Error) {
            // Ignore S3 errors for error files
          }

          // Delete from database
          await File.findByIdAndDelete(file._id);
          
          deletedCount++;
          freedSpace += file.size;
          
          logger.debug(`Deleted old error file: ${file.filename}`);

        } catch (error) {
          logger.error(`Failed to delete error file ${file.filename}:`, error);
        }
      }

      if (deletedCount > 0) {
        logger.info(`Cleaned up ${deletedCount} old error files, freed ${this.formatBytes(freedSpace)}`);
      }

      return deletedCount;

    } catch (error) {
      logger.error('Error files cleanup failed:', error);
      return 0;
    }
  }

  public static async cleanupStuckProcessingFiles(): Promise<number> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const stuckFiles = await File.find({
        status: 'processing',
        uploadedAt: { $lt: oneHourAgo }
      });

      let updatedCount = 0;

      for (const file of stuckFiles) {
        try {
          await File.findByIdAndUpdate(file._id, {
            status: 'error',
            errorMessage: 'Processing timeout - file was stuck in processing state'
          });
          
          updatedCount++;
          logger.debug(`Marked stuck processing file as error: ${file.filename}`);

        } catch (error) {
          logger.error(`Failed to update stuck processing file ${file.filename}:`, error);
        }
      }

      if (updatedCount > 0) {
        logger.info(`Marked ${updatedCount} stuck processing files as error`);
      }

      return updatedCount;

    } catch (error) {
      logger.error('Stuck processing files cleanup failed:', error);
      return 0;
    }
  }

  public static async updateStorageAnalytics(): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check if analytics for today already exist
      const existingAnalytics = await StorageAnalytics.findOne({ date: today });
      if (existingAnalytics) {
        return; // Already calculated for today
      }

      // Calculate analytics
      const [
        totalUsers,
        totalFiles,
        totalStorageResult,
        todayUploads,
        todayDeletions,
        fileTypeStats,
        avgFileSizeResult
      ] = await Promise.all([
        File.distinct('userId', { status: { $ne: 'deleted' } }).then(users => users.length),
        File.countDocuments({ status: { $ne: 'deleted' } }),
        File.aggregate([
          { $match: { status: { $ne: 'deleted' } } },
          { $group: { _id: null, total: { $sum: '$size' } } }
        ]),
        File.countDocuments({
          uploadedAt: { $gte: today },
          status: 'ready'
        }),
        File.countDocuments({
          updatedAt: { $gte: today },
          status: 'deleted'
        }),
        File.aggregate([
          { $match: { status: { $ne: 'deleted' } } },
          {
            $group: {
              _id: '$category',
              count: { $sum: 1 },
              size: { $sum: '$size' }
            }
          }
        ]),
        File.aggregate([
          { $match: { status: { $ne: 'deleted' } } },
          { $group: { _id: null, avgSize: { $avg: '$size' } } }
        ])
      ]);

      const totalStorage = totalStorageResult[0]?.total || 0;
      const averageFileSize = avgFileSizeResult[0]?.avgSize || 0;

      // Calculate growth rate compared to yesterday
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayAnalytics = await StorageAnalytics.findOne({ date: yesterday });
      
      const storageGrowthRate = yesterdayAnalytics 
        ? ((totalStorage - yesterdayAnalytics.totalStorage) / yesterdayAnalytics.totalStorage * 100)
        : 0;

      // Create analytics record
      const analytics = new StorageAnalytics({
        date: today,
        totalUsers,
        totalFiles,
        totalStorage,
        newUploadsToday: todayUploads,
        deletionsToday: todayDeletions,
        topFileTypes: fileTypeStats.map(stat => ({
          type: stat._id,
          count: stat.count,
          size: stat.size
        })),
        averageFileSize,
        storageGrowthRate
      });

      await analytics.save();
      logger.info('Storage analytics updated for', today.toISOString().split('T')[0]);

    } catch (error) {
      logger.error('Failed to update storage analytics:', error);
    }
  }

  public static async recalculateStorageUsage(): Promise<void> {
    try {
      // Get all users with files
      const users = await File.distinct('userId', { status: { $ne: 'deleted' } });
      
      let processed = 0;

      for (const userId of users) {
        try {
          await this.calculateUserStorageUsage(userId);
          processed++;
        } catch (error) {
          logger.error(`Failed to recalculate storage for user ${userId}:`, error);
        }
      }

      logger.info(`Recalculated storage usage for ${processed}/${users.length} users`);

    } catch (error) {
      logger.error('Storage usage recalculation failed:', error);
    }
  }

  public static async calculateUserStorageUsage(userId: string): Promise<void> {
    try {
      const userFiles = await File.find({ 
        userId, 
        status: { $ne: 'deleted' } 
      }).select('size category uploadedAt');
      
      const totalFiles = userFiles.length;
      const totalSize = userFiles.reduce((sum, file) => sum + file.size, 0);
      
      const categorySizes = {
        documents: 0,
        images: 0,
        videos: 0,
        audio: 0,
        other: 0
      };

      userFiles.forEach(file => {
        if (categorySizes.hasOwnProperty(file.category)) {
          categorySizes[file.category as keyof typeof categorySizes] += file.size;
        }
      });

      // Get current month uploads
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const monthlyUploads = userFiles.filter(file => 
        file.uploadedAt >= monthStart
      ).length;

      // Update storage usage
      const quotaLimit = 5 * 1024 * 1024 * 1024; // 5GB default
      const quotaPercentage = (totalSize / quotaLimit) * 100;

      await StorageUsage.findOneAndUpdate(
        { userId },
        {
          totalFiles,
          totalSize,
          categorySizes,
          monthlyUploads,
          lastCalculated: new Date(),
          quotaUsed: totalSize,
          quotaPercentage: Math.min(quotaPercentage, 100)
        },
        { upsert: true }
      );

    } catch (error) {
      logger.error(`Failed to calculate storage usage for user ${userId}:`, error);
      throw error;
    }
  }

  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export standalone cleanup function for manual use
export const cleanupTempFiles = () => CleanupService.cleanupTemporaryFiles();
