import express from 'express';
import multer from 'multer';
import { authMiddleware } from '@shared/middleware/auth';
import { S3Service } from '../services/s3';
import { ImageProcessor } from '../services/imageProcessor';
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
 *     summary: Upload media files with advanced processing
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
 *               options:
 *                 type: object
 *                 properties:
 *                   generateThumbnails:
 *                     type: boolean
 *                     default: true
 *                   watermark:
 *                     type: boolean
 *                     default: false
 *                   optimize:
 *                     type: boolean
 *                     default: true
 *                   quality:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 100
 *                     default: 85
 *     responses:
 *       200:
 *         description: Media files uploaded and processed successfully
 */
router.post('/upload', authMiddleware, upload.array('files', 10), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    const userId = req.user?.id;
    const options = req.body.options ? JSON.parse(req.body.options) : {};
    
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
        const category = file.mimetype.startsWith('image/') ? 'image' : 'video';
        
        // Upload original file
        const s3Result = await S3Service.uploadFile(
          file.buffer,
          file.originalname,
          file.mimetype,
          {
            userId: userId!,
            category: category as 'photo' | 'video',
            privacy: options.privacy || 'private'
          }
        );

        // Create file record
        const fileDoc = new File({
          userId,
          originalName: file.originalname,
          filename: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          s3Key: s3Result.key,
          s3Bucket: process.env.S3_BUCKET || 'dzinza-storage',
          url: s3Result.url,
          category,
          isPublic: false,
          status: 'processing'
        });

        await fileDoc.save();

        // Process media file
        let processedData: any = {};

        if (category === 'image') {
          processedData = await ImageProcessor.processImage(file.buffer, {
            generateThumbnails: options.generateThumbnails !== false,
            watermark: options.watermark ? {
              text: options.watermark.text || 'Dzinza'
            } : undefined,
            optimizeForWeb: options.optimize !== false,
            extractMetadata: true
          });

          // Upload processed versions
          if (processedData.thumbnails) {
            const thumbnails: any = {};
            for (const thumbnail of processedData.thumbnails) {
              const thumbResult = await S3Service.uploadBuffer(thumbnail.buffer, {
                filename: `thumb_${thumbnail.name}_${file.originalname}`,
                contentType: 'image/jpeg'
              });
              thumbnails[thumbnail.name] = thumbResult.url;
            }
            processedData.thumbnailUrls = thumbnails;
          }

          if (processedData.optimized) {
            const optimizedResult = await S3Service.uploadBuffer(processedData.optimized.buffer, {
              filename: `optimized_${file.originalname}`,
              contentType: file.mimetype
            });
            processedData.optimizedUrl = optimizedResult.url;
          }
        }

        // Update file record with processing results
        fileDoc.metadata = {
          ...fileDoc.metadata,
          width: processedData.original?.metadata.width,
          height: processedData.original?.metadata.height,
          exif: processedData.original?.metadata.exif,
          thumbnails: processedData.thumbnailUrls,
          processedVersions: processedData.optimizedUrl ? { optimized: processedData.optimizedUrl } : undefined
        };
        fileDoc.status = 'ready';
        await fileDoc.save();

        results.push({
          id: fileDoc._id,
          filename: fileDoc.filename,
          url: fileDoc.url,
          category: fileDoc.category,
          size: fileDoc.size,
          metadata: fileDoc.metadata,
          status: fileDoc.status
        });

        logger.info(`Media file processed: ${fileDoc.filename}`, { userId, fileId: fileDoc._id });

      } catch (error) {
        logger.error('Error processing media file:', error);
        results.push({
          filename: file.originalname,
          error: 'Processing failed',
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
 * /api/media/{id}/process:
 *   post:
 *     summary: Reprocess existing media file with new options
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               generateThumbnails:
 *                 type: boolean
 *               watermark:
 *                 type: boolean
 *               optimize:
 *                 type: boolean
 *               quality:
 *                 type: number
 *     responses:
 *       200:
 *         description: Media file reprocessed successfully
 */
router.post('/:id/process', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const options = req.body;

    const file = await File.findOne({ _id: id, userId });
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (!file.mimeType.startsWith('image/')) {
      return res.status(400).json({ error: 'File is not an image' });
    }

    // Download original file from S3
    const originalBuffer = await S3Service.downloadFile(file.s3Key);
    
    // Reprocess with new options
    const processedData = await ImageProcessor.processImage(originalBuffer, {
      generateThumbnails: options.generateThumbnails !== false,
      watermark: options.watermark ? {
        text: 'Dzinza',
        position: 'bottom-right' as const,
        opacity: 0.3
      } : undefined,
      optimizeForWeb: options.optimize !== false,
      extractMetadata: true
    });

    // Upload new processed versions
    const updates: any = {};

    if (processedData.thumbnails) {
      const thumbnails: any = {};
      for (const thumbnail of processedData.thumbnails) {
        const thumbResult = await S3Service.uploadBuffer(thumbnail.buffer, {
          filename: `thumb_${thumbnail.name}_${Date.now()}_${file.filename}`,
          contentType: 'image/jpeg',
          category: 'image'
        });
        thumbnails[thumbnail.name] = thumbResult.url;
      }
      updates['metadata.thumbnails'] = thumbnails;
    }

    // Upload optimized version if available
    if (processedData.optimized) {
      const optimizedResult = await S3Service.uploadBuffer(processedData.optimized.buffer, {
        filename: `optimized_${Date.now()}_${file.filename}`,
        contentType: file.mimeType,
        category: 'image'
      });
      updates['metadata.processedVersions.optimized'] = optimizedResult.url;
    }

    // Update file record
    await File.findByIdAndUpdate(id, updates);
    const updatedFile = await File.findById(id);

    res.json({
      message: 'Media file reprocessed successfully',
      file: {
        id: updatedFile!._id,
        filename: updatedFile!.filename,
        metadata: updatedFile!.metadata
      }
    });

  } catch (error) {
    logger.error('Media reprocessing error:', error);
    res.status(500).json({ error: 'Media reprocessing failed' });
  }
});

/**
 * @swagger
 * /api/media/{id}/thumbnail/{size}:
 *   get:
 *     summary: Get thumbnail for media file
 *     tags: [Media]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: size
 *         required: true
 *         schema:
 *           type: string
 *           enum: [small, medium, large]
 *     responses:
 *       302:
 *         description: Redirect to thumbnail URL
 */
router.get('/:id/thumbnail/:size', async (req, res) => {
  try {
    const { id, size } = req.params;
    
    // Validate thumbnail size
    const validSizes = ['small', 'medium', 'large'] as const;
    if (!validSizes.includes(size as any)) {
      return res.status(400).json({ error: 'Invalid thumbnail size. Must be small, medium, or large' });
    }
    
    const file = await File.findById(id);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const thumbnailSize = size as 'small' | 'medium' | 'large';
    if (!file.metadata?.thumbnails || !file.metadata.thumbnails[thumbnailSize]) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }

    // Redirect to thumbnail URL or generate presigned URL
    const thumbnailUrl = file.metadata.thumbnails[thumbnailSize];
    res.redirect(thumbnailUrl);

  } catch (error) {
    logger.error('Thumbnail access error:', error);
    res.status(500).json({ error: 'Failed to access thumbnail' });
  }
});

/**
 * @swagger
 * /api/media/gallery:
 *   get:
 *     summary: Get user's media gallery with filtering
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [image, video]
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
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [newest, oldest, name, size]
 *           default: newest
 *     responses:
 *       200:
 *         description: Media gallery retrieved successfully
 */
router.get('/gallery', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { category, page = 1, limit = 20, sort = 'newest' } = req.query;
    
    const query: any = { 
      userId, 
      status: 'ready',
      category: { $in: ['image', 'video'] }
    };
    
    if (category) {
      query.category = category;
    }

    // Sort options
    const sortOptions: any = {};
    switch (sort) {
      case 'oldest':
        sortOptions.uploadedAt = 1;
        break;
      case 'name':
        sortOptions.originalName = 1;
        break;
      case 'size':
        sortOptions.size = -1;
        break;
      default: // newest
        sortOptions.uploadedAt = -1;
    }

    const skip = (Number(page) - 1) * Number(limit);
    
    const [files, total] = await Promise.all([
      File.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit))
        .select('originalName filename url category size metadata uploadedAt tags description'),
      File.countDocuments(query)
    ]);

    res.json({
      files: files.map(file => {
        // Helper function to format file size
        const formatBytes = (bytes: number): string => {
          if (bytes === 0) return '0 Bytes';
          const k = 1024;
          const sizes = ['Bytes', 'KB', 'MB', 'GB'];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        return {
          id: file._id,
          originalName: file.originalName,
          filename: file.filename,
          url: file.url,
          category: file.category,
          size: file.size,
          formattedSize: formatBytes(file.size),
          thumbnails: file.metadata?.thumbnails,
          uploadedAt: file.uploadedAt,
          tags: file.tags,
          description: file.description
        };
      }),
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
