import express from 'express';
import multer from 'multer';
import { authMiddleware } from '@shared/middleware/auth';
import { S3Service } from '../services/s3';
import { File } from '../models/File';
import { logger } from '@shared/utils/logger';

const router = express.Router();

// Configure multer for memory storage with larger limits for media
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB for videos
    files: 10
  },
  fileFilter: (req, file, cb) => {
    // Allow images and videos
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff',
      'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type for media upload'));
    }
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
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Media files uploaded successfully
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
      files: results,
      totalProcessed: results.filter(r => r.status === 'ready').length,
      totalErrors: results.filter(r => r.status === 'error').length
    });

  } catch (error) {
    logger.error('Media upload error:', error);
    res.status(500).json({ error: 'Media upload failed' });
  }
});

/**
 * @swagger
 * /api/media/{id}:
 *   get:
 *     summary: Get media file details
 *     tags: [Media]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Media file details retrieved successfully
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const file = await File.findById(id);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({
      id: file._id,
      originalName: file.originalName,
      filename: file.filename,
      url: file.url,
      category: file.category,
      size: file.size,
      mimeType: file.mimeType,
      uploadedAt: file.uploadedAt,
      status: file.status
    });

  } catch (error) {
    logger.error('Media file fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch media file' });
  }
});

/**
 * @swagger
 * /api/media/gallery:
 *   get:
 *     summary: Get user's media gallery
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [photo, video]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Media gallery retrieved successfully
 */
router.get('/gallery', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { category, page = 1, limit = 20 } = req.query;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const query: any = { 
      userId, 
      status: 'ready',
      category: { $in: ['photo', 'video'] }
    };
    
    if (category) {
      query.category = category;
    }

    const skip = (Number(page) - 1) * Number(limit);
    
    const [files, total] = await Promise.all([
      File.find(query)
        .sort({ uploadedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select('originalName filename url category size uploadedAt'),
      File.countDocuments(query)
    ]);

    res.json({
      files: files.map(file => ({
        id: file._id,
        originalName: file.originalName,
        filename: file.filename,
        url: file.url,
        category: file.category,
        size: file.size,
        uploadedAt: file.uploadedAt
      })),
      pagination: {
        current: Number(page),
        total: Math.ceil(total / Number(limit)),
        count: files.length,
        totalFiles: total
      }
    });

  } catch (error) {
    logger.error('Gallery fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch gallery' });
  }
});

export default router;
