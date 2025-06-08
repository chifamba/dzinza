import express from 'express';
import multer from 'multer';
import { authMiddleware } from '@shared/middleware/auth';
import { S3Service } from '../services/s3';
import { File } from '../models/File';
import { logger } from '@shared/utils/logger';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
    files: 10
  }
});

/**
 * @swagger
 * /api/media/upload:
 *   post:
 *     summary: Upload media files
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 */
router.post('/upload', authMiddleware, upload.array('files', 10), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    const userId = req.user?.id;
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const results = [];

    for (const file of files) {
      try {
        // Determine file category
        const category = file.mimetype.startsWith('image/') ? 'photo' : 'video';
        
        // Upload original file
        const s3Result = await S3Service.uploadFile(
          file.buffer,
          file.originalname,
          file.mimetype,
          {
            userId,
            category: category as 'photo' | 'video',
            privacy: 'private'
          }
        );

        // Create file record
        const fileDoc = new File({
          userId,
          originalName: file.originalname,
          filename: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          category: category as 'photo' | 'video',
          s3Key: s3Result.key,
          s3Bucket: process.env.S3_BUCKET || 'dzinza-storage',
          url: s3Result.url,
          isPublic: false,
          status: 'ready'
        });

        await fileDoc.save();

        results.push({
          id: fileDoc._id,
          filename: fileDoc.filename,
          url: fileDoc.url,
          category: fileDoc.category,
          size: fileDoc.size,
          status: fileDoc.status
        });

        logger.info(`Media file uploaded: ${fileDoc.filename}`, { userId, fileId: fileDoc._id });

      } catch (error) {
        logger.error('Error uploading media file:', error);
        results.push({
          filename: file.originalname,
          error: 'Upload failed',
          status: 'error'
        });
      }
    }

    res.json({
      message: 'Media upload completed',
      files: results
    });

  } catch (error) {
    logger.error('Media upload error:', error);
    res.status(500).json({ error: 'Media upload failed' });
  }
});

/**
 * @swagger
 * /api/media/gallery:
 *   get:
 *     summary: Get user's media gallery
 *     tags: [Media]
 */
router.get('/gallery', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const files = await File.find({ 
      userId, 
      status: 'ready',
      category: { $in: ['photo', 'video'] }
    })
    .sort({ uploadedAt: -1 })
    .limit(20);

    res.json({
      files: files.map(file => ({
        id: file._id,
        originalName: file.originalName,
        url: file.url,
        category: file.category,
        size: file.size
      }))
    });

  } catch (error) {
    logger.error('Gallery fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch gallery' });
  }
});

export default router;