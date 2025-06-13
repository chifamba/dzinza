import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, CreateBucketCommand, ListObjectsV2Command, BucketLocationConstraint } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import { logger } from '@shared/utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface UploadOptions {
  userId: string;
  familyTreeId?: string;
  category: 'photo' | 'document' | 'audio' | 'video' | 'other';
  privacy: 'public' | 'private' | 'family';
  metadata?: Record<string, string>;
}

export interface FileInfo {
  key: string;
  url: string;
  size: number;
  contentType: string;
  etag: string;
  lastModified: Date;
  metadata?: Record<string, string>;
}

export interface PresignedUrlOptions {
  expiresIn?: number; // seconds
  responseContentDisposition?: string;
  responseContentType?: string;
}

export class S3Service {
  private static client: S3Client;
  private static bucket: string;
  private static region: string;
  private static isInitialized = false;

  static async initialize(): Promise<void> {
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.bucket = process.env.S3_BUCKET || 'dzinza-storage';

    this.client = new S3Client({
      region: this.region,
      credentials: process.env.AWS_ACCESS_KEY_ID ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      } : undefined, // Use IAM role if no credentials provided
    });

    try {
      // Test connection and create bucket if it doesn't exist
      await this.ensureBucketExists();
      this.isInitialized = true;
      logger.info(`S3 Service initialized with bucket: ${this.bucket}`);
    } catch (error) {
      logger.error('Failed to initialize S3 service:', error);
      throw error;
    }
  }

  private static async ensureBucketExists(): Promise<void> {
    try {
      // Try to head the bucket first
      await this.client.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key: 'test'
      }));
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        // Bucket doesn't exist, create it
        try {
          await this.client.send(new CreateBucketCommand({
            Bucket: this.bucket,
            CreateBucketConfiguration: this.region !== 'us-east-1' ? {
              LocationConstraint: this.region as BucketLocationConstraint
            } : undefined
          }));
          logger.info(`Created S3 bucket: ${this.bucket}`);
        } catch (createError) {
          logger.error('Failed to create S3 bucket:', createError);
          throw createError;
        }
      } else {
        // Some other error occurred
        logger.error('Error checking S3 bucket:', error);
        throw error;
      }
    }
  }

  static isConnected(): boolean {
    return this.isInitialized;
  }

  static async uploadFile(
    buffer: Buffer,
    fileName: string,
    contentType: string,
    options: UploadOptions
  ): Promise<FileInfo> {
    if (!this.isInitialized) {
      throw new Error('S3 Service not initialized');
    }

    const fileExtension = fileName.split('.').pop();
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;
    const key = this.generateKey(options, uniqueFileName);

    const metadata: Record<string, string> = {
      'user-id': options.userId,
      'category': options.category,
      'privacy': options.privacy,
      'original-name': fileName,
      'upload-date': new Date().toISOString(),
      ...options.metadata
    };

    if (options.familyTreeId) {
      metadata['family-tree-id'] = options.familyTreeId;
    }

    try {
      const upload = new Upload({
        client: this.client,
        params: {
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          Metadata: metadata,
          ServerSideEncryption: 'AES256',
          StorageClass: 'STANDARD_IA' // Cost-effective for genealogy files
        }
      });

      const result = await upload.done();
      
      return {
        key,
        url: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`,
        size: buffer.length,
        contentType,
        etag: result.ETag || '',
        lastModified: new Date(),
        metadata
      };
    } catch (error) {
      logger.error('Error uploading file to S3:', error);
      throw error;
    }
  }

  static async getFile(key: string): Promise<Buffer> {
    if (!this.isInitialized) {
      throw new Error('S3 Service not initialized');
    }

    try {
      const response = await this.client.send(new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      }));

      if (!response.Body) {
        throw new Error('File body is empty');
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      const reader = response.Body as any;
      
      for await (const chunk of reader) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      logger.error(`Error getting file from S3: ${key}`, error);
      throw error;
    }
  }

  static async getFileInfo(key: string): Promise<FileInfo> {
    if (!this.isInitialized) {
      throw new Error('S3 Service not initialized');
    }

    try {
      const response = await this.client.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key
      }));

      return {
        key,
        url: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`,
        size: response.ContentLength || 0,
        contentType: response.ContentType || 'application/octet-stream',
        etag: response.ETag || '',
        lastModified: response.LastModified || new Date(),
        metadata: response.Metadata
      };
    } catch (error) {
      logger.error(`Error getting file info from S3: ${key}`, error);
      throw error;
    }
  }

  static async deleteFile(key: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('S3 Service not initialized');
    }

    try {
      await this.client.send(new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key
      }));
      logger.info(`Deleted file from S3: ${key}`);
    } catch (error) {
      logger.error(`Error deleting file from S3: ${key}`, error);
      throw error;
    }
  }

  static async getPresignedUrl(
    key: string,
    operation: 'get' | 'put',
    options: PresignedUrlOptions = {}
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('S3 Service not initialized');
    }

    const expiresIn = options.expiresIn || 3600; // 1 hour default

    try {
      if (operation === 'get') {
        const command = new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
          ResponseContentDisposition: options.responseContentDisposition,
          ResponseContentType: options.responseContentType
        });

        return await getSignedUrl(this.client, command, { expiresIn });
      } else {
        const command = new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          ContentType: options.responseContentType
        });

        return await getSignedUrl(this.client, command, { expiresIn });
      }
    } catch (error) {
      logger.error(`Error generating presigned URL for: ${key}`, error);
      throw error;
    }
  }

  static async listFiles(
    prefix: string,
    maxKeys: number = 1000
  ): Promise<FileInfo[]> {
    if (!this.isInitialized) {
      throw new Error('S3 Service not initialized');
    }

    try {
      const response = await this.client.send(new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: maxKeys
      }));

      return (response.Contents || []).map(object => ({
        key: object.Key!,
        url: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${object.Key}`,
        size: object.Size || 0,
        contentType: 'application/octet-stream', // Would need separate HEAD requests for actual content type
        etag: object.ETag || '',
        lastModified: object.LastModified || new Date()
      }));
    } catch (error) {
      logger.error(`Error listing files with prefix: ${prefix}`, error);
      throw error;
    }
  }

  static async copyFile(sourceKey: string, destinationKey: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('S3 Service not initialized');
    }

    try {
      const sourceBuffer = await this.getFile(sourceKey);
      const sourceInfo = await this.getFileInfo(sourceKey);
      
      await this.client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: destinationKey,
        Body: sourceBuffer,
        ContentType: sourceInfo.contentType,
        Metadata: sourceInfo.metadata,
        ServerSideEncryption: 'AES256'
      }));

      logger.info(`Copied file from ${sourceKey} to ${destinationKey}`);
    } catch (error) {
      logger.error(`Error copying file from ${sourceKey} to ${destinationKey}:`, error);
      throw error;
    }
  }

  private static generateKey(options: UploadOptions, fileName: string): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    let basePath = `users/${options.userId}/${options.category}/${year}/${month}`;
    
    if (options.familyTreeId) {
      basePath = `family-trees/${options.familyTreeId}/${options.category}/${year}/${month}`;
    }
    
    return `${basePath}/${fileName}`;
  }

  static async getUserStorageUsage(userId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    sizeByCategory: Record<string, { files: number; size: number }>;
  }> {
    if (!this.isInitialized) {
      throw new Error('S3 Service not initialized');
    }

    try {
      const prefix = `users/${userId}/`;
      const files = await this.listFiles(prefix);
      
      const sizeByCategory: Record<string, { files: number; size: number }> = {};
      let totalSize = 0;
      
      for (const file of files) {
        totalSize += file.size;
        
        // Extract category from key
        const keyParts = file.key.split('/');
        const category = keyParts[2] || 'other';
        
        if (!sizeByCategory[category]) {
          sizeByCategory[category] = { files: 0, size: 0 };
        }
        
        sizeByCategory[category].files++;
        sizeByCategory[category].size += file.size;
      }
      
      return {
        totalFiles: files.length,
        totalSize,
        sizeByCategory
      };
    } catch (error) {
      logger.error(`Error calculating storage usage for user: ${userId}`, error);
      throw error;
    }
  }

  static async uploadBuffer(
    buffer: Buffer,
    options: {
      filename: string;
      contentType: string;
      category?: string;
      metadata?: Record<string, string>;
    }
  ): Promise<FileInfo> {
    if (!this.isInitialized) {
      throw new Error('S3 Service not initialized');
    }

    try {
      const key = options.filename;
      
      await this.client.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: options.contentType,
        Metadata: options.metadata,
        ServerSideEncryption: 'AES256'
      }));

      return {
        key,
        url: `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`,
        size: buffer.length,
        contentType: options.contentType,
        etag: '',
        lastModified: new Date(),
        metadata: options.metadata
      };
    } catch (error) {
      logger.error(`Error uploading buffer to S3 with key: ${options.filename}`, error);
      throw error;
    }
  }

  static async downloadFile(key: string): Promise<Buffer> {
    return this.getFile(key);
  }

  static async fileExists(key: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('S3 Service not initialized');
    }

    try {
      await this.client.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key
      }));
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  static async listAllFiles(prefix: string = ''): Promise<string[]> {
    if (!this.isInitialized) {
      throw new Error('S3 Service not initialized');
    }

    const allFiles: string[] = [];
    let continuationToken: string | undefined;

    try {
      do {
        const response = await this.client.send(new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken
        }));

        if (response.Contents) {
          allFiles.push(...response.Contents.map(obj => obj.Key!).filter(key => key));
        }

        continuationToken = response.NextContinuationToken;
      } while (continuationToken);

      return allFiles;
    } catch (error) {
      logger.error(`Error listing all files with prefix: ${prefix}`, error);
      throw error;
    }
  }

  static async close(): Promise<void> {
    if (this.client) {
      this.client.destroy();
      this.isInitialized = false;
      logger.info('S3 Service connection closed');
    }
  }
}
