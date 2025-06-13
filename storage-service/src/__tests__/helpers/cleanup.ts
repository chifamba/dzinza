import fs from 'fs';
import path from 'path';
import { Types } from 'mongoose';
import { File } from '../../models/File';

// Test cleanup helpers
export function setupTestCleanup() {
  // Clean up any test files created during testing
  process.on('exit', cleanupTestFiles);
  process.on('SIGINT', cleanupTestFiles);
  process.on('SIGTERM', cleanupTestFiles);
}

function cleanupTestFiles() {
  const testUploadsDir = path.join(__dirname, '../../temp/test-uploads');
  if (fs.existsSync(testUploadsDir)) {
    fs.rmSync(testUploadsDir, { recursive: true, force: true });
  }
}

// Mock user helper
export const createTestUser = () => ({
  _id: new Types.ObjectId().toString(),
  email: 'test@example.com',
  name: 'Test User'
});

// Mock file helpers for File model instances
let fileCounter = 0;
export const createMockFile = (userId: string, options: Partial<{
  originalName: string;
  filename: string;
  mimeType: string;
  size: number;
  category: 'document' | 'image' | 'video' | 'audio' | 'other';
  s3Key: string;
  s3Bucket: string;
  url: string;
  status: 'uploading' | 'processing' | 'ready' | 'error' | 'deleted';
  tags: string[];
  description: string;
}> = {}) => {
  const timestamp = Date.now();
  const uniqueId = `${timestamp}-${++fileCounter}`;
  const defaults = {
    originalName: 'test-file.jpg',
    filename: `${uniqueId}-test-file.jpg`,
    mimeType: 'image/jpeg',
    size: 1024000,
    category: 'image' as const,
    s3Key: `files/${uniqueId}-test-file.jpg`,
    s3Bucket: 'dzinza-storage-test',
    url: `https://dzinza-storage-test.s3.amazonaws.com/files/${uniqueId}-test-file.jpg`,
    status: 'ready' as const,
    tags: [],
    description: 'Test file for unit testing'
  };

  return new File({
    userId,
    ...defaults,
    ...options
  });
};

// Mock multer file helper (for upload testing)
export const createMockMulterFile = (options: {
  filename?: string;
  mimetype?: string;
  size?: number;
  buffer?: Buffer;
} = {}) => {
  const {
    filename = 'test-image.jpg',
    mimetype = 'image/jpeg',
    size = 1024,
    buffer = Buffer.from('mock-file-content')
  } = options;

  return {
    fieldname: 'file',
    originalname: filename,
    encoding: '7bit',
    mimetype,
    size,
    buffer,
    destination: '',
    filename: `${Date.now()}-${filename}`,
    path: '',
    stream: null as any
  };
};

export const createMockS3File = (options: any = {}) => {
  return {
    ...createMockMulterFile(options),
    key: options.key || `uploads/${Date.now()}-${options.filename || 'test.jpg'}`,
    location: options.location || 'https://test-bucket.s3.amazonaws.com/test-key',
    bucket: 'test-bucket'
  };
};

// Database test helpers
export const createTestAdminUser = () => ({
  _id: new Types.ObjectId().toString(),
  email: 'admin@example.com',
  isAdmin: true
});

// JWT token helpers for testing
export const createTestToken = (user: any) => {
  // Simple mock token for testing
  return Buffer.from(JSON.stringify(user)).toString('base64');
};

// Mock request helpers
export const createMockRequest = (overrides: any = {}) => ({
  user: createTestUser(),
  body: {},
  params: {},
  query: {},
  headers: {},
  file: null,
  files: [],
  ...overrides
});

export const createMockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  res.header = jest.fn().mockReturnValue(res);
  return res;
};

export const createMockNext = () => jest.fn();
