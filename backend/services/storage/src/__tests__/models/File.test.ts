import { File, IFile } from '../../models/File';
import { createTestUser } from '../helpers/cleanup';

describe('File Model', () => {
  describe('Schema Validation', () => {
    it('should create a valid file document', async () => {
      const user = createTestUser();
      const fileData = {
        userId: user._id,
        originalName: 'family-photo.jpg',
        filename: '1703123456789-family-photo.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        category: 'image' as const,
        s3Key: 'uploads/images/1703123456789-family-photo.jpg',
        s3Bucket: 'test-bucket',
        url: 'https://test-bucket.s3.amazonaws.com/uploads/images/1703123456789-family-photo.jpg',
        status: 'ready'
      };

      const file = new File(fileData);
      const savedFile = await file.save();

      expect(savedFile._id).toBeDefined();
      expect(savedFile.userId).toBe(user._id);
      expect(savedFile.originalName).toBe('family-photo.jpg');
      expect(savedFile.filename).toBe('1703123456789-family-photo.jpg');
      expect(savedFile.mimeType).toBe('image/jpeg');
      expect(savedFile.size).toBe(1024000);
      expect(savedFile.status).toBe('ready');
      expect(savedFile.uploadedAt).toBeDefined();
    });

    it('should require userId', async () => {
      const fileData = {
        originalName: 'test.jpg',
        filename: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        category: 'image' as const,
        s3Key: 'test-key',
        s3Bucket: 'test-bucket',
        url: 'test-url'
      };

      const file = new File(fileData);
      
      await expect(file.save()).rejects.toThrow();
    });

    it('should default status to "uploading"', async () => {
      const user = createTestUser();
      const fileData = {
        userId: user._id,
        originalName: 'test.jpg',
        filename: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        category: 'image' as const,
        s3Key: 'test-key',
        s3Bucket: 'test-bucket',
        url: 'test-url'
      };

      const file = new File(fileData);
      const savedFile = await file.save();

      expect(savedFile.status).toBe('uploading');
    });
  });
});
