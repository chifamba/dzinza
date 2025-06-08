import sharp from 'sharp';
import exifr from 'exifr';
import { logger } from '@shared/utils/logger';

export interface ImageProcessingOptions {
  generateThumbnails?: boolean;
  thumbnailSizes?: Array<{ width: number; height: number; name: string }>;
  optimizeForWeb?: boolean;
  extractMetadata?: boolean;
  watermark?: {
    text?: string;
    image?: Buffer;
    position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    opacity?: number;
  };
}

export interface ProcessedImage {
  original: {
    buffer: Buffer;
    metadata: ImageMetadata;
  };
  thumbnails?: Array<{
    name: string;
    buffer: Buffer;
    width: number;
    height: number;
  }>;
  optimized?: {
    buffer: Buffer;
    metadata: ImageMetadata;
  };
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  colorSpace?: string;
  hasAlpha?: boolean;
  exif?: Record<string, any>;
  gps?: {
    latitude?: number;
    longitude?: number;
    altitude?: number;
  };
  camera?: {
    make?: string;
    model?: string;
    software?: string;
    dateTime?: Date;
  };
}

export class ImageProcessor {
  private static _isReady = false;
  private static defaultThumbnailSizes = [
    { width: 150, height: 150, name: 'thumb' },
    { width: 300, height: 300, name: 'small' },
    { width: 600, height: 600, name: 'medium' },
    { width: 1200, height: 1200, name: 'large' }
  ];

  static async initialize(): Promise<void> {
    try {
      // Test Sharp functionality
      await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 255, g: 255, b: 255 }
        }
      }).png().toBuffer();

      this._isReady = true;
      logger.info('Image Processor initialized');
    } catch (error) {
      logger.error('Failed to initialize Image Processor:', error);
      throw error;
    }
  }

  static isImageProcessor(): boolean {
    return this._isReady;
  }

  static async processImage(
    imageBuffer: Buffer,
    options: ImageProcessingOptions = {}
  ): Promise<ProcessedImage> {
    if (!this._isReady) {
      throw new Error('Image Processor not initialized');
    }

    try {
      const result: ProcessedImage = {
        original: {
          buffer: imageBuffer,
          metadata: await this.extractMetadata(imageBuffer)
        }
      };

      // Generate thumbnails
      if (options.generateThumbnails !== false) {
        const sizes = options.thumbnailSizes || this.defaultThumbnailSizes;
        result.thumbnails = await this.generateThumbnails(imageBuffer, sizes);
      }

      // Optimize for web
      if (options.optimizeForWeb) {
        result.optimized = await this.optimizeForWeb(imageBuffer);
      }

      // Apply watermark
      if (options.watermark) {
        result.original.buffer = await this.applyWatermark(
          result.original.buffer,
          options.watermark
        );
      }

      return result;
    } catch (error) {
      logger.error('Error processing image:', error);
      throw error;
    }
  }

  static async extractMetadata(imageBuffer: Buffer): Promise<ImageMetadata> {
    try {
      const sharpMetadata = await sharp(imageBuffer).metadata();
      
      let exifData: Record<string, any> = {};
      let gps: ImageMetadata['gps'] = {};
      let camera: ImageMetadata['camera'] = {};

      try {
        const exif = await exifr.parse(imageBuffer);
        if (exif) {
          exifData = exif;

          // Extract GPS data
          if (exif.latitude && exif.longitude) {
            gps = {
              latitude: exif.latitude,
              longitude: exif.longitude,
              altitude: exif.altitude
            };
          }

          // Extract camera data
          if (exif.Make || exif.Model) {
            camera = {
              make: exif.Make,
              model: exif.Model,
              software: exif.Software,
              dateTime: exif.DateTime ? new Date(exif.DateTime) : undefined
            };
          }
        }
      } catch (exifError) {
        logger.warn('Could not extract EXIF data:', exifError);
      }

      return {
        width: sharpMetadata.width || 0,
        height: sharpMetadata.height || 0,
        format: sharpMetadata.format || 'unknown',
        size: imageBuffer.length,
        colorSpace: sharpMetadata.space,
        hasAlpha: sharpMetadata.hasAlpha,
        exif: Object.keys(exifData).length > 0 ? exifData : undefined,
        gps: Object.keys(gps).length > 0 ? gps : undefined,
        camera: Object.keys(camera).length > 0 ? camera : undefined
      };
    } catch (error) {
      logger.error('Error extracting image metadata:', error);
      throw error;
    }
  }

  static async generateThumbnails(
    imageBuffer: Buffer,
    sizes: Array<{ width: number; height: number; name: string }>
  ): Promise<Array<{ name: string; buffer: Buffer; width: number; height: number }>> {
    const thumbnails = [];

    for (const size of sizes) {
      try {
        const thumbnailBuffer = await sharp(imageBuffer)
          .resize(size.width, size.height, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({
            quality: 85,
            progressive: true
          })
          .toBuffer();

        thumbnails.push({
          name: size.name,
          buffer: thumbnailBuffer,
          width: size.width,
          height: size.height
        });
      } catch (error) {
        logger.error(`Error generating ${size.name} thumbnail:`, error);
        // Continue with other thumbnails even if one fails
      }
    }

    return thumbnails;
  }

  static async optimizeForWeb(imageBuffer: Buffer): Promise<{
    buffer: Buffer;
    metadata: ImageMetadata;
  }> {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      
      let optimizedBuffer: Buffer;

      // Choose optimal format based on image characteristics
      if (metadata.hasAlpha) {
        // PNG for images with transparency
        optimizedBuffer = await sharp(imageBuffer)
          .png({
            compressionLevel: 9,
            progressive: true
          })
          .toBuffer();
      } else if (metadata.density && metadata.density > 150) {
        // High quality JPEG for photos
        optimizedBuffer = await sharp(imageBuffer)
          .jpeg({
            quality: 90,
            progressive: true,
            mozjpeg: true
          })
          .toBuffer();
      } else {
        // Standard JPEG for most images
        optimizedBuffer = await sharp(imageBuffer)
          .jpeg({
            quality: 85,
            progressive: true
          })
          .toBuffer();
      }

      const optimizedMetadata = await this.extractMetadata(optimizedBuffer);

      return {
        buffer: optimizedBuffer,
        metadata: optimizedMetadata
      };
    } catch (error) {
      logger.error('Error optimizing image for web:', error);
      throw error;
    }
  }

  static async applyWatermark(
    imageBuffer: Buffer,
    watermarkOptions: NonNullable<ImageProcessingOptions['watermark']>
  ): Promise<Buffer> {
    try {
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();

      if (!metadata.width || !metadata.height) {
        throw new Error('Invalid image dimensions');
      }

      let watermarkBuffer: Buffer;

      if (watermarkOptions.text) {
        // Create text watermark
        const fontSize = Math.max(16, Math.min(metadata.width, metadata.height) / 20);
        const textWidth = watermarkOptions.text.length * fontSize * 0.6;
        const textHeight = fontSize * 1.4;

        watermarkBuffer = await sharp({
          create: {
            width: Math.round(textWidth),
            height: Math.round(textHeight),
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          }
        })
        .composite([{
          input: Buffer.from(`
            <svg width="${textWidth}" height="${textHeight}">
              <text x="0" y="${fontSize}" font-family="Arial" font-size="${fontSize}" fill="white" fill-opacity="${watermarkOptions.opacity || 0.5}">
                ${watermarkOptions.text}
              </text>
            </svg>
          `),
          top: 0,
          left: 0
        }])
        .png()
        .toBuffer();
      } else if (watermarkOptions.image) {
        watermarkBuffer = watermarkOptions.image;
      } else {
        throw new Error('Watermark text or image required');
      }

      // Calculate position
      const watermarkMetadata = await sharp(watermarkBuffer).metadata();
      const watermarkWidth = watermarkMetadata.width || 0;
      const watermarkHeight = watermarkMetadata.height || 0;

      let left = 0;
      let top = 0;

      switch (watermarkOptions.position) {
        case 'top-left':
          left = 10;
          top = 10;
          break;
        case 'top-right':
          left = metadata.width - watermarkWidth - 10;
          top = 10;
          break;
        case 'bottom-left':
          left = 10;
          top = metadata.height - watermarkHeight - 10;
          break;
        case 'bottom-right':
          left = metadata.width - watermarkWidth - 10;
          top = metadata.height - watermarkHeight - 10;
          break;
        case 'center':
        default:
          left = Math.round((metadata.width - watermarkWidth) / 2);
          top = Math.round((metadata.height - watermarkHeight) / 2);
          break;
      }

      return await image
        .composite([{
          input: watermarkBuffer,
          left: Math.max(0, left),
          top: Math.max(0, top),
          blend: 'over'
        }])
        .toBuffer();
    } catch (error) {
      logger.error('Error applying watermark:', error);
      throw error;
    }
  }

  static async resizeImage(
    imageBuffer: Buffer,
    width: number,
    height?: number,
    options: {
      fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
      quality?: number;
      format?: 'jpeg' | 'png' | 'webp';
    } = {}
  ): Promise<Buffer> {
    if (!this._isReady) {
      throw new Error('Image Processor not initialized');
    }

    try {
      let resizer = sharp(imageBuffer).resize(width, height, {
        fit: options.fit || 'inside',
        withoutEnlargement: true
      });

      switch (options.format) {
        case 'png':
          resizer = resizer.png({ quality: options.quality || 90 });
          break;
        case 'webp':
          resizer = resizer.webp({ quality: options.quality || 85 });
          break;
        case 'jpeg':
        default:
          resizer = resizer.jpeg({ 
            quality: options.quality || 85,
            progressive: true 
          });
          break;
      }

      return await resizer.toBuffer();
    } catch (error) {
      logger.error('Error resizing image:', error);
      throw error;
    }
  }

  static async convertFormat(
    imageBuffer: Buffer,
    targetFormat: 'jpeg' | 'png' | 'webp',
    quality: number = 85
  ): Promise<Buffer> {
    if (!this._isReady) {
      throw new Error('Image Processor not initialized');
    }

    try {
      let converter = sharp(imageBuffer);

      switch (targetFormat) {
        case 'png':
          converter = converter.png({ quality });
          break;
        case 'webp':
          converter = converter.webp({ quality });
          break;
        case 'jpeg':
        default:
          converter = converter.jpeg({ quality, progressive: true });
          break;
      }

      return await converter.toBuffer();
    } catch (error) {
      logger.error('Error converting image format:', error);
      throw error;
    }
  }

  static async removeExifData(imageBuffer: Buffer): Promise<Buffer> {
    if (!this._isReady) {
      throw new Error('Image Processor not initialized');
    }

    try {
      return await sharp(imageBuffer)
        .rotate() // This removes EXIF orientation data
        .toBuffer();
    } catch (error) {
      logger.error('Error removing EXIF data:', error);
      throw error;
    }
  }

  static isReady(): boolean {
    return this._isReady;
  }
}
