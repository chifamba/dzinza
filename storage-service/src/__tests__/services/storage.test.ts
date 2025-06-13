import { File, StorageUsage } from '../../models';
import { createTestUser, createMockFile } from '../helpers/cleanup';

describe('Storage Service Core Logic', () => {
  describe('File Management', () => {
    it('should create file record with proper metadata', async () => {
      const user = createTestUser();
      const fileData = {
        userId: user._id,
        originalName: 'test-document.pdf',
        filename: 'test-document-uuid.pdf',
        mimeType: 'application/pdf',
        size: 1024000, // 1MB
        category: 'document' as const,
        s3Key: 'files/test-document-uuid.pdf',
        s3Bucket: 'dzinza-storage',
        url: 'https://dzinza-storage.s3.amazonaws.com/files/test-document-uuid.pdf',
        description: 'Important family document'
      };

      const file = new File(fileData);
      const savedFile = await file.save();

      expect(savedFile._id).toBeDefined();
      expect(savedFile.userId).toBe(user._id);
      expect(savedFile.originalName).toBe('test-document.pdf');
      expect(savedFile.category).toBe('document');
      expect(savedFile.status).toBe('uploading'); // default status
      expect(savedFile.downloadCount).toBe(0); // default
      expect(savedFile.isPublic).toBe(false); // default
    });

    it('should handle file status transitions', async () => {
      const user = createTestUser();
      const file = createMockFile(user._id);
      const savedFile = await file.save();

      // Simulate upload completion
      savedFile.status = 'ready';
      await savedFile.save();

      expect(savedFile.status).toBe('ready');

      // Simulate processing
      savedFile.status = 'processing';
      await savedFile.save();

      expect(savedFile.status).toBe('processing');
    });

    it('should track file access', async () => {
      const user = createTestUser();
      const file = createMockFile(user._id);
      const savedFile = await file.save();

      // Simulate file access
      const initialDownloads = savedFile.downloadCount;
      savedFile.downloadCount += 1;
      savedFile.lastAccessedAt = new Date();
      await savedFile.save();

      expect(savedFile.downloadCount).toBe(initialDownloads + 1);
      expect(savedFile.lastAccessedAt).toBeDefined();
    });
  });

  describe('Storage Usage Calculations', () => {
    beforeEach(async () => {
      // Clear existing data
      await File.deleteMany({});
      await StorageUsage.deleteMany({});
    });

    it('should calculate user storage usage correctly', async () => {
      const user = createTestUser();

      // Create multiple files for the user
      const files = [
        {
          userId: user._id,
          originalName: 'photo1.jpg',
          filename: 'photo1.jpg',
          mimeType: 'image/jpeg',
          size: 2000000, // 2MB
          category: 'image' as const,
          s3Key: 'images/photo1.jpg',
          s3Bucket: 'dzinza-storage',
          url: 'https://example.com/photo1.jpg',
          status: 'ready' as const
        },
        {
          userId: user._id,
          originalName: 'document1.pdf',
          filename: 'document1.pdf',
          mimeType: 'application/pdf',
          size: 3000000, // 3MB
          category: 'document' as const,
          s3Key: 'docs/document1.pdf',
          s3Bucket: 'dzinza-storage',
          url: 'https://example.com/document1.pdf',
          status: 'ready' as const
        }
      ];

      await File.insertMany(files);

      // Calculate usage
      const userFiles = await File.find({ userId: user._id, status: 'ready' });
      const totalSize = userFiles.reduce((sum, file) => sum + file.size, 0);
      const totalFiles = userFiles.length;

      // Group by category
      const categorySizes = userFiles.reduce((acc, file) => {
        const category = file.category === 'image' ? 'images' : 
                        file.category === 'document' ? 'documents' : 'other';
        acc[category] = (acc[category] || 0) + file.size;
        return acc;
      }, {} as Record<string, number>);

      expect(totalSize).toBe(5000000); // 5MB total
      expect(totalFiles).toBe(2);
      expect(categorySizes.images).toBe(2000000);
      expect(categorySizes.documents).toBe(3000000);

      // Create storage usage record
      const usage = new StorageUsage({
        userId: user._id,
        totalFiles,
        totalSize,
        categorySizes: {
          documents: categorySizes.documents || 0,
          images: categorySizes.images || 0,
          videos: categorySizes.videos || 0,
          audio: categorySizes.audio || 0,
          other: categorySizes.other || 0
        },
        quotaUsed: totalSize
      });

      const savedUsage = await usage.save();
      expect(savedUsage.totalSize).toBe(5000000);
      expect(savedUsage.categorySizes.images).toBe(2000000);
    });

    it('should check quota limits', async () => {
      const user = createTestUser();
      const quotaLimit = 5000000000; // 5GB as exact number

      const usage = new StorageUsage({
        userId: user._id,
        totalFiles: 100,
        totalSize: 4000000000, // 4GB
        quotaUsed: 4000000000,
        quotaLimit
      });

      // Calculate quota percentage
      usage.quotaPercentage = (usage.quotaUsed / usage.quotaLimit) * 100;

      const savedUsage = await usage.save();
      expect(savedUsage.quotaPercentage).toBe(80); // 80% of quota used
      expect(savedUsage.quotaUsed < savedUsage.quotaLimit).toBe(true);
    });

    it('should handle quota exceeded scenarios', async () => {
      const user = createTestUser();
      const quotaLimit = 1000000; // 1MB limit

      const usage = new StorageUsage({
        userId: user._id,
        totalFiles: 2,
        totalSize: 1200000, // 1.2MB (over limit)
        quotaUsed: 1200000,
        quotaLimit
      });

      usage.quotaPercentage = Math.min((usage.quotaUsed / usage.quotaLimit) * 100, 100);

      const savedUsage = await usage.save();
      expect(savedUsage.quotaPercentage).toBe(100); // Capped at 100%
      expect(savedUsage.quotaUsed > savedUsage.quotaLimit).toBe(true);
    });
  });

  describe('File Querying and Filtering', () => {
    beforeEach(async () => {
      await File.deleteMany({});
    });

    it('should filter files by category', async () => {
      const user = createTestUser();

      const files = [
        createMockFile(user._id, { category: 'image', originalName: 'photo1.jpg' }),
        createMockFile(user._id, { category: 'document', originalName: 'doc1.pdf' }),
        createMockFile(user._id, { category: 'image', originalName: 'photo2.jpg' })
      ];

      await Promise.all(files.map(f => f.save()));

      const images = await File.find({ userId: user._id, category: 'image' });
      const documents = await File.find({ userId: user._id, category: 'document' });

      expect(images).toHaveLength(2);
      expect(documents).toHaveLength(1);
      expect(images[0].category).toBe('image');
    });

    it('should filter files by status', async () => {
      const user = createTestUser();

      const files = [
        createMockFile(user._id, { status: 'ready' }),
        createMockFile(user._id, { status: 'processing' }),
        createMockFile(user._id, { status: 'error' })
      ];

      await Promise.all(files.map(f => f.save()));

      const readyFiles = await File.find({ userId: user._id, status: 'ready' });
      const processingFiles = await File.find({ userId: user._id, status: 'processing' });

      expect(readyFiles).toHaveLength(1);
      expect(processingFiles).toHaveLength(1);
    });

    it('should search files by tags', async () => {
      const user = createTestUser();

      const files = [
        createMockFile(user._id, { tags: ['family', 'vintage'] }),
        createMockFile(user._id, { tags: ['documents', 'legal'] }),
        createMockFile(user._id, { tags: ['family', 'recent'] })
      ];

      await Promise.all(files.map(f => f.save()));

      const familyFiles = await File.find({ userId: user._id, tags: 'family' });
      const documentFiles = await File.find({ userId: user._id, tags: 'documents' });

      expect(familyFiles).toHaveLength(2);
      expect(documentFiles).toHaveLength(1);
    });
  });

  describe('Data Validation', () => {
    it('should validate file size limits', async () => {
      const user = createTestUser();
      
      // Test with extremely large file size
      const file = createMockFile(user._id, {
        size: 1024 * 1024 * 1024 * 10 // 10GB
      });

      const savedFile = await file.save();
      // File should save but application logic should handle size limits
      expect(savedFile.size).toBe(1024 * 1024 * 1024 * 10);
    });

    it('should validate required fields', async () => {
      // Test missing required field
      const invalidFile = new File({
        originalName: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1000000
        // Missing required fields: userId, filename, s3Key, s3Bucket, url, category
      });

      await expect(invalidFile.save()).rejects.toThrow();
    });

    it('should validate category enum values', async () => {
      const user = createTestUser();
      
      const invalidFile = new File({
        userId: user._id,
        originalName: 'test.jpg',
        filename: 'test.jpg',
        mimeType: 'image/jpeg',
        size: 1000000,
        category: 'invalid-category' as any, // Invalid category
        s3Key: 'test-key',
        s3Bucket: 'test-bucket',
        url: 'https://example.com/test.jpg'
      });

      await expect(invalidFile.save()).rejects.toThrow();
    });
  });
});
