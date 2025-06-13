import request from 'supertest';
import express from 'express';
import { File } from '../../models/File';
import mediaRoutes from '../../routes/media';
import { 
  createTestUser, 
  createMockFile, 
  createTestToken 
} from '../helpers/cleanup';

// Mock the auth module and other dependencies
jest.mock('../../../../../shared/middleware/auth', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user-id', email: 'test@example.com' };
    next();
  }
}));

// Mock S3Service
jest.mock('../../services/s3', () => ({
  S3Service: {
    uploadFile: jest.fn().mockResolvedValue({
      key: 'test-key',
      url: 'https://test-bucket.s3.amazonaws.com/test-key',
      size: 1000,
      contentType: 'image/jpeg',
      etag: 'test-etag',
      lastModified: new Date()
    })
  }
}));

// Create test app
const app = express();
app.use(express.json());
app.use('/api/media', mediaRoutes);

describe('Media Routes', () => {
  describe('POST /api/media/upload', () => {
    it('should upload multiple media files successfully', async () => {
      const response = await request(app)
        .post('/api/media/upload')
        .attach('files', Buffer.from('test-image-1'), 'photo1.jpg')
        .attach('files', Buffer.from('test-image-2'), 'photo2.jpg')
        .field('category', 'image')
        .field('description', 'Family photos from 1950s')
        .expect(200);

      expect(response.body.message).toBe('Media upload completed');
      expect(response.body.files).toHaveLength(2);
      expect(response.body.totalProcessed).toBe(2);
      expect(response.body.totalErrors).toBe(0);

      // Verify files were saved to database
      const savedFiles = await File.find({});
      expect(savedFiles).toHaveLength(2);
      expect(savedFiles[0].category).toBe('image');
      expect(savedFiles[0].description).toBe('Family photos from 1950s');
    });

    it('should process images with thumbnails and optimization', async () => {
      const response = await request(app)
        .post('/api/media/upload')
        .attach('files', Buffer.from('test-large-image'), 'large-photo.jpg')
        .field('category', 'image')
        .field('generateThumbnails', 'true')
        .field('optimize', 'true')
        .expect(200);

      expect(response.body.files[0].metadata).toBeDefined();
      expect(response.body.files[0].status).toBe('ready');

      // Verify thumbnail was generated
      const savedFile = await File.findOne({ originalName: 'large-photo.jpg' });
      expect(savedFile?.metadata?.thumbnails).toBeDefined();
      expect(savedFile?.metadata?.thumbnails?.small).toBeDefined();
      expect(savedFile?.metadata?.thumbnails?.medium).toBeDefined();
    });

    it('should handle unsupported file types', async () => {
      const response = await request(app)
        .post('/api/media/upload')
        .attach('files', Buffer.from('executable-content'), 'virus.exe')
        .field('category', 'documents')
        .expect(200);

      expect(response.body.totalErrors).toBe(1);
      expect(response.body.files[0].error).toBeDefined();
      expect(response.body.files[0].status).toBe('error');
    });

    it('should respect file size limits', async () => {
      // Create a mock large file
      const largeFileBuffer = Buffer.alloc(100 * 1024 * 1024); // 100MB

      const response = await request(app)
        .post('/api/media/upload')
        .attach('files', largeFileBuffer, 'huge-file.jpg')
        .field('category', 'image')
        .expect(200);

      expect(response.body.totalErrors).toBe(1);
      expect(response.body.files[0].error).toContain('File too large');
    });

    it('should add genealogy context to uploads', async () => {
      const familyTreeId = '507f1f77bcf86cd799439013';
      const personId = '507f1f77bcf86cd799439014';

      const response =      await request(app)
        .post('/api/media/upload')
        .attach('files', Buffer.from('profile-photo'), 'grandmother.jpg')
        .field('category', 'image')
        .field('familyTreeId', familyTreeId)
        .field('relatedPersons', personId)
        .expect(200);

      const savedFile = await File.findOne({ originalName: 'grandmother.jpg' });
      expect(savedFile?.familyTreeId).toBe(familyTreeId);
      expect(savedFile?.relatedPersons).toContain(personId);
    });
  });

  describe('POST /api/media/process-images', () => {
    beforeEach(async () => {
      // Create test files
      const user = createTestUser();
      await File.create([
        {
          userId: user._id,
          originalName: 'photo1.jpg',
          filename: 'photo1.jpg',
          mimeType: 'image/jpeg',
          size: 2000000,
          category: 'image',
          s3Key: 'test-key-1',
          s3Bucket: 'test-bucket',
          url: 'test-url-1',
          status: 'ready'
        },
        {
          userId: user._id,
          originalName: 'photo2.jpg',
          filename: 'photo2.jpg',
          mimeType: 'image/jpeg',
          size: 3000000,
          category: 'image',
          s3Key: 'test-key-2',
          s3Bucket: 'test-bucket',
          url: 'test-url-2',
          status: 'ready'
        }
      ]);
    });

    it('should apply watermark to selected images', async () => {
      const files = await File.find({});
      const fileIds = files.map(f => f._id.toString());

      const response = await request(app)
        .post('/api/media/process-images')
        .send({
          fileIds,
          operations: ['watermark'],
          watermarkText: 'Dzinza Heritage Collection'
        })
        .expect(200);

      expect(response.body.message).toBe('Image processing completed');
      expect(response.body.processedCount).toBe(2);
      expect(response.body.results).toHaveLength(2);
    });

    it('should resize images to specified dimensions', async () => {
      const files = await File.find({});
      const fileIds = files.map(f => f._id.toString());

      const response = await request(app)
        .post('/api/media/process-images')
        .send({
          fileIds,
          operations: ['resize'],
          width: 800,
          height: 600
        })
        .expect(200);

      expect(response.body.processedCount).toBe(2);
      
      // Check that metadata was updated
      const updatedFiles = await File.find({});
      updatedFiles.forEach(file => {
        expect(file.metadata?.processedVersions).toBeDefined();
      });
    });

    it('should enhance image quality', async () => {
      const files = await File.find({});
      const fileIds = files.map(f => f._id.toString());

      const response = await request(app)
        .post('/api/media/process-images')
        .send({
          fileIds,
          operations: ['enhance'],
          quality: 85
        })
        .expect(200);

      expect(response.body.processedCount).toBe(2);
    });

    it('should handle invalid file IDs', async () => {
      const response = await request(app)
        .post('/api/media/process-images')
        .send({
          fileIds: ['invalid-id-1', 'invalid-id-2'],
          operations: ['watermark']
        })
        .expect(400);

      expect(response.body.error).toContain('Invalid file IDs');
    });
  });

  describe('GET /api/media/gallery', () => {
    beforeEach(async () => {
      const user = createTestUser();
      await File.create([
        {
          userId: user._id,
          originalName: 'family-1920.jpg',
          filename: 'family-1920.jpg',
          mimetype: 'image/jpeg',
          size: 2000000,
          category: 'image',
          s3Key: 'images/family-1920.jpg',
          url: 'test-url-1',
          status: 'ready',
          tags: ['family', '1920s', 'vintage'],
          uploadedAt: new Date('2023-01-15')
        },
        {
          userId: user._id,
          originalName: 'wedding-1945.jpg',
          filename: 'wedding-1945.jpg',
          mimetype: 'image/jpeg',
          size: 3000000,
          category: 'image',
          s3Key: 'images/wedding-1945.jpg',
          url: 'test-url-2',
          status: 'ready',
          tags: ['wedding', '1940s'],
          uploadedAt: new Date('2023-01-20')
        },
        {
          userId: user._id,
          originalName: 'document.pdf',
          filename: 'document.pdf',
          mimetype: 'application/pdf',
          size: 1000000,
          category: 'documents',
          s3Key: 'docs/document.pdf',
          url: 'test-url-3',
          status: 'ready',
          uploadedAt: new Date('2023-01-10')
        }
      ]);
    });

    it('should return paginated gallery with all files', async () => {
      const response = await request(app)
        .get('/api/media/gallery')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.files).toHaveLength(3);
      expect(response.body.pagination.total).toBe(1);
      expect(response.body.pagination.current).toBe(1);
      expect(response.body.pagination.count).toBe(3);
    });

    it('should filter by category', async () => {
      const response = await request(app)
        .get('/api/media/gallery')
        .query({ category: 'image' })
        .expect(200);

      expect(response.body.files).toHaveLength(2);
      response.body.files.forEach((file: any) => {
        expect(file.category).toBe('image');
      });
    });

    it('should search by tags', async () => {
      const response = await request(app)
        .get('/api/media/gallery')
        .query({ search: 'family' })
        .expect(200);

      expect(response.body.files).toHaveLength(1);
      expect(response.body.files[0].originalName).toBe('family-1920.jpg');
    });

    it('should sort by upload date', async () => {
      const response = await request(app)
        .get('/api/media/gallery')
        .query({ sort: 'oldest' })
        .expect(200);

      expect(response.body.files[0].originalName).toBe('document.pdf');
      expect(response.body.files[2].originalName).toBe('wedding-1945.jpg');
    });

    it('should sort by file size', async () => {
      const response = await request(app)
        .get('/api/media/gallery')
        .query({ sort: 'size' })
        .expect(200);

      expect(response.body.files[0].size).toBeGreaterThanOrEqual(response.body.files[1].size);
    });

    it('should handle pagination correctly', async () => {
      const response = await request(app)
        .get('/api/media/gallery')
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(response.body.files).toHaveLength(2);
      expect(response.body.pagination.total).toBe(2);
      expect(response.body.pagination.hasMore).toBe(true);
    });
  });

  describe('GET /api/media/download/:fileId', () => {
    let testFile: any;

    beforeEach(async () => {
      const user = createTestUser();
      testFile = await File.create({
        userId: user._id,
        originalName: 'download-test.jpg',
        filename: 'download-test.jpg',
        mimetype: 'image/jpeg',
        size: 1000000,
        category: 'image',
        s3Key: 'downloads/download-test.jpg',
        url: 'test-download-url',
        status: 'ready'
      });
    });

    it('should generate download URL for file', async () => {
      const response = await request(app)
        .get(`/api/media/download/${testFile._id}`)
        .expect(200);

      expect(response.body.downloadUrl).toBeDefined();
      expect(response.body.filename).toBe('download-test.jpg');
      expect(response.body.expiresIn).toBe(3600); // 1 hour
    });

    it('should handle non-existent file', async () => {
      const fakeId = '507f1f77bcf86cd799439999';
      
      const response = await request(app)
        .get(`/api/media/download/${fakeId}`)
        .expect(404);

      expect(response.body.error).toBe('File not found');
    });

    it('should reject access to other users files', async () => {
      // Create file for different user
      const otherFile = await File.create({
        userId: '507f1f77bcf86cd799439020', // Different user
        originalName: 'private.jpg',
        filename: 'private.jpg',
        mimetype: 'image/jpeg',
        size: 1000000,
        category: 'image',
        s3Key: 'private/private.jpg',
        url: 'test-private-url',
        status: 'ready'
      });

      const response = await request(app)
        .get(`/api/media/download/${otherFile._id}`)
        .expect(403);

      expect(response.body.error).toBe('Access denied');
    });
  });

  describe('DELETE /api/media/:fileId', () => {
    let testFile: any;

    beforeEach(async () => {
      const user = createTestUser();
      testFile = await File.create({
        userId: user._id,
        originalName: 'delete-test.jpg',
        filename: 'delete-test.jpg',
        mimetype: 'image/jpeg',
        size: 1000000,
        category: 'image',
        s3Key: 'test/delete-test.jpg',
        url: 'test-delete-url',
        status: 'ready'
      });
    });

    it('should delete file successfully', async () => {
      const response = await request(app)
        .delete(`/api/media/${testFile._id}`)
        .expect(200);

      expect(response.body.message).toBe('File deleted successfully');

      // Verify file was marked as deleted
      const deletedFile = await File.findById(testFile._id);
      expect(deletedFile?.status).toBe('deleted');
    });

    it('should handle non-existent file deletion', async () => {
      const fakeId = '507f1f77bcf86cd799439999';
      
      const response = await request(app)
        .delete(`/api/media/${fakeId}`)
        .expect(404);

      expect(response.body.error).toBe('File not found');
    });
  });
});
