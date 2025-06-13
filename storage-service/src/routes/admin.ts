import express from 'express';
import { authMiddleware } from '@shared/middleware/auth';
import { File, StorageUsage, StorageAnalytics } from '../models';
import { S3Service } from '../services/s3';
import { logger } from '@shared/utils/logger';

const router = express.Router();

// Admin middleware to check if user has admin privileges
const adminMiddleware = (req: any, res: any, next: any) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

/**
 * @swagger
 * /api/admin/storage/overview:
 *   get:
 *     summary: Get storage system overview (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Storage overview retrieved successfully
 */
router.get('/overview', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // Get overall statistics
    const [
      totalFiles,
      totalUsers,
      totalStorageBytes,
      recentUploads,
      errorFiles,
      processingFiles
    ] = await Promise.all([
      File.countDocuments({ status: { $ne: 'deleted' } }),
      File.distinct('userId').then(users => users.length),
      File.aggregate([
        { $match: { status: { $ne: 'deleted' } } },
        { $group: { _id: null, totalSize: { $sum: '$size' } } }
      ]).then(result => result[0]?.totalSize || 0),
      File.countDocuments({
        uploadedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        status: 'ready'
      }),
      File.countDocuments({ status: 'error' }),
      File.countDocuments({ status: 'processing' })
    ]);

    // File type distribution
    const fileTypeStats = await File.aggregate([
      { $match: { status: { $ne: 'deleted' } } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalSize: { $sum: '$size' }
        }
      }
    ]);

    // Top users by storage
    const topUsers = await File.aggregate([
      { $match: { status: { $ne: 'deleted' } } },
      {
        $group: {
          _id: '$userId',
          fileCount: { $sum: 1 },
          totalSize: { $sum: '$size' }
        }
      },
      { $sort: { totalSize: -1 } },
      { $limit: 10 }
    ]);

    // Recent analytics
    const recentAnalytics = await StorageAnalytics.findOne()
      .sort({ date: -1 })
      .lean();

    res.json({
      overview: {
        totalFiles,
        totalUsers,
        totalStorage: totalStorageBytes,
        formattedTotalStorage: formatBytes(totalStorageBytes),
        recentUploads,
        errorFiles,
        processingFiles
      },
      fileTypes: fileTypeStats.map(stat => ({
        category: stat._id,
        count: stat.count,
        size: stat.totalSize,
        formattedSize: formatBytes(stat.totalSize)
      })),
      topUsers: topUsers.map(user => ({
        userId: user._id,
        fileCount: user.fileCount,
        totalSize: user.totalSize,
        formattedSize: formatBytes(user.totalSize)
      })),
      analytics: recentAnalytics
    });

  } catch (error) {
    logger.error('Admin overview error:', error);
    res.status(500).json({ error: 'Failed to fetch storage overview' });
  }
});

/**
 * @swagger
 * /api/admin/storage/users:
 *   get:
 *     summary: Get storage usage by users (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [usage, files, recent]
 *           default: usage
 *     responses:
 *       200:
 *         description: User storage data retrieved successfully
 */
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 50, sort = 'usage' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    let sortField: any = {};
    switch (sort) {
      case 'files':
        sortField = { totalFiles: -1 };
        break;
      case 'recent':
        sortField = { lastCalculated: -1 };
        break;
      default: // usage
        sortField = { totalSize: -1 };
    }

    const [users, total] = await Promise.all([
      StorageUsage.find()
        .sort(sortField)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      StorageUsage.countDocuments()
    ]);

    res.json({
      users: users.map(user => ({
        userId: user.userId,
        totalFiles: user.totalFiles,
        totalSize: user.totalSize,
        formattedSize: formatBytes(user.totalSize),
        quotaUsage: user.quotaPercentage,
        categorySizes: Object.entries(user.categorySizes).map(([category, size]) => ({
          category,
          size,
          formattedSize: formatBytes(size as number)
        })),
        lastCalculated: user.lastCalculated
      })),
      pagination: {
        current: Number(page),
        total: Math.ceil(total / Number(limit)),
        count: users.length,
        totalUsers: total
      }
    });

  } catch (error) {
    logger.error('Admin users storage error:', error);
    res.status(500).json({ error: 'Failed to fetch user storage data' });
  }
});

/**
 * @swagger
 * /api/admin/storage/cleanup:
 *   post:
 *     summary: Run storage cleanup operations (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [temp, orphaned, errors, all]
 *               dryRun:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       200:
 *         description: Cleanup operation completed
 */
router.post('/cleanup', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { type = 'temp', dryRun = true } = req.body;
    const results: any = {
      type,
      dryRun,
      filesFound: 0,
      filesProcessed: 0,
      spaceSaved: 0,
      errors: []
    };

    switch (type) {
      case 'temp':
        // Find expired temporary files
        const tempFiles = await File.find({
          expiresAt: { $lt: new Date() },
          status: { $ne: 'deleted' }
        });
        
        results.filesFound = tempFiles.length;
        
        if (!dryRun) {
          for (const file of tempFiles) {
            try {
              await S3Service.deleteFile(file.s3Key);
              await File.findByIdAndUpdate(file._id, { status: 'deleted' });
              results.filesProcessed++;
              results.spaceSaved += file.size;
            } catch (error) {
              results.errors.push(`Failed to delete ${file.filename}: ${error}`);
            }
          }
        } else {
          results.spaceSaved = tempFiles.reduce((sum, file) => sum + file.size, 0);
        }
        break;

      case 'orphaned':
        // Find files in database that don't exist in S3
        const dbFiles = await File.find({ status: 'ready' }).select('s3Key size filename');
        results.filesFound = dbFiles.length;
        
        if (!dryRun) {
          for (const file of dbFiles) {
            try {
              const exists = await S3Service.fileExists(file.s3Key);
              if (!exists) {
                await File.findOneAndUpdate(
                  { s3Key: file.s3Key },
                  { status: 'deleted' }
                );
                results.filesProcessed++;
                results.spaceSaved += file.size;
              }
            } catch (error) {
              results.errors.push(`Failed to check ${file.filename}: ${error}`);
            }
          }
        }
        break;

      case 'errors':
        // Clean up files with error status older than 24 hours
        const errorFiles = await File.find({
          status: 'error',
          uploadedAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        });
        
        results.filesFound = errorFiles.length;
        
        if (!dryRun) {
          for (const file of errorFiles) {
            try {
              // Try to delete from S3 (may not exist)
              try {
                await S3Service.deleteFile(file.s3Key);
              } catch (s3Error) {
                // Ignore S3 errors for error files
              }
              await File.findByIdAndDelete(file._id);
              results.filesProcessed++;
              results.spaceSaved += file.size;
            } catch (error) {
              results.errors.push(`Failed to delete error file ${file.filename}: ${error}`);
            }
          }
        } else {
          results.spaceSaved = errorFiles.reduce((sum, file) => sum + file.size, 0);
        }
        break;

      case 'all':
        // Run all cleanup types
        // This would recursively call this endpoint for each type
        return res.json({ message: 'Use specific cleanup types', availableTypes: ['temp', 'orphaned', 'errors'] });

      default:
        return res.status(400).json({ error: 'Invalid cleanup type' });
    }

    results.formattedSpaceSaved = formatBytes(results.spaceSaved);

    if (!dryRun) {
      logger.info('Storage cleanup completed', results);
    }

    res.json({
      message: dryRun ? 'Cleanup preview completed' : 'Cleanup completed',
      results
    });

  } catch (error) {
    logger.error('Admin cleanup error:', error);
    res.status(500).json({ error: 'Cleanup operation failed' });
  }
});

/**
 * @swagger
 * /api/admin/storage/analytics:
 *   get:
 *     summary: Get storage analytics (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *     responses:
 *       200:
 *         description: Storage analytics retrieved successfully
 */
router.get('/analytics', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const analytics = await StorageAnalytics.find({
      date: { $gte: startDate }
    }).sort({ date: 1 });

    // Calculate trends
    const latest = analytics[analytics.length - 1];
    const previous = analytics[analytics.length - 2];
    
    const trends = latest && previous ? {
      storageGrowth: ((latest.totalStorage - previous.totalStorage) / previous.totalStorage * 100).toFixed(2),
      fileGrowth: ((latest.totalFiles - previous.totalFiles) / previous.totalFiles * 100).toFixed(2),
      userGrowth: ((latest.totalUsers - previous.totalUsers) / Math.max(previous.totalUsers, 1) * 100).toFixed(2)
    } : null;

    res.json({
      analytics: analytics.map(day => ({
        date: day.date,
        totalFiles: day.totalFiles,
        totalStorage: day.totalStorage,
        formattedStorage: formatBytes(day.totalStorage),
        totalUsers: day.totalUsers,
        newUploads: day.newUploadsToday,
        deletions: day.deletionsToday,
        topFileTypes: day.topFileTypes,
        averageFileSize: formatBytes(day.averageFileSize),
        growthRate: day.storageGrowthRate
      })),
      trends,
      summary: latest ? {
        currentStorage: formatBytes(latest.totalStorage),
        currentFiles: latest.totalFiles,
        currentUsers: latest.totalUsers,
        dailyUploads: latest.newUploadsToday,
        averageFileSize: formatBytes(latest.averageFileSize)
      } : null
    });

  } catch (error) {
    logger.error('Admin analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
 * @swagger
 * /api/admin/storage/recalculate:
 *   post:
 *     summary: Recalculate storage usage for all users (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Storage recalculation started
 */
router.post('/recalculate', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // Get all users with files
    const users = await File.distinct('userId');
    
    let processed = 0;
    const errors: string[] = [];

    for (const userId of users) {
      try {
        // Calculate user's storage usage
        const userFiles = await File.find({ userId, status: { $ne: 'deleted' } });
        
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

        const monthlyUploads = await File.countDocuments({
          userId,
          uploadedAt: { $gte: monthStart },
          status: 'ready'
        });

        // Update or create storage usage record
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

        processed++;

      } catch (error) {
        errors.push(`User ${userId}: ${error}`);
      }
    }

    res.json({
      message: 'Storage recalculation completed',
      usersProcessed: processed,
      totalUsers: users.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    logger.error('Storage recalculation error:', error);
    res.status(500).json({ error: 'Recalculation failed' });
  }
});

// Utility function
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default router;
