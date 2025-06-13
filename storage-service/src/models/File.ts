import mongoose, { Schema, Document } from 'mongoose';

export interface IFile extends Document {
  _id: string;
  userId: string;
  originalName: string;
  filename: string;
  mimeType: string;
  size: number;
  s3Key: string;
  s3Bucket: string;
  url: string;
  category: 'document' | 'image' | 'video' | 'audio' | 'other';
  tags: string[];
  description?: string;
  isPublic: boolean;
  metadata: {
    width?: number;
    height?: number;
    duration?: number;
    exif?: Record<string, any>;
    thumbnails?: {
      small: string;
      medium: string;
      large: string;
    };
    processedVersions?: {
      optimized?: string;
      watermarked?: string;
      compressed?: string;
    };
  };
  uploadedAt: Date;
  lastAccessedAt: Date;
  downloadCount: number;
  status: 'uploading' | 'processing' | 'ready' | 'error' | 'deleted';
  errorMessage?: string;
  expiresAt?: Date; // For temporary files
  parentId?: string; // For thumbnails/versions linked to original
  relatedPersons?: string[]; // IDs of persons this file relates to
  relatedEvents?: string[]; // IDs of events this file relates to
  familyTreeId?: string; // Associated family tree
}

const FileSchema = new Schema<IFile>({
  userId: { type: String, required: true, index: true },
  originalName: { type: String, required: true },
  filename: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  s3Key: { type: String, required: true, unique: true },
  s3Bucket: { type: String, required: true },
  url: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['document', 'image', 'video', 'audio', 'other'],
    required: true,
    index: true
  },
  tags: [{ type: String, index: true }],
  description: { type: String },
  isPublic: { type: Boolean, default: false, index: true },
  metadata: {
    width: Number,
    height: Number,
    duration: Number,
    exif: Schema.Types.Mixed,
    thumbnails: {
      small: String,
      medium: String,
      large: String,
    },
    processedVersions: {
      optimized: String,
      watermarked: String,
      compressed: String,
    }
  },
  uploadedAt: { type: Date, default: Date.now, index: true },
  lastAccessedAt: { type: Date, default: Date.now },
  downloadCount: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['uploading', 'processing', 'ready', 'error', 'deleted'],
    default: 'uploading',
    index: true
  },
  errorMessage: String,
  expiresAt: { type: Date, index: true }, // TTL index for cleanup
  parentId: { type: Schema.Types.ObjectId, ref: 'File' },
  relatedPersons: [{ type: String, index: true }],
  relatedEvents: [{ type: String, index: true }],
  familyTreeId: { type: String, index: true }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
FileSchema.index({ userId: 1, uploadedAt: -1 });
FileSchema.index({ userId: 1, category: 1 });
FileSchema.index({ userId: 1, tags: 1 });
FileSchema.index({ status: 1, uploadedAt: -1 });
FileSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Virtual for file type
FileSchema.virtual('fileType').get(function() {
  const mimeType = this.mimeType;
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf') || mimeType.includes('document')) return 'document';
  return 'other';
});

// Virtual for human-readable size
FileSchema.virtual('formattedSize').get(function() {
  const bytes = this.size;
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

// Pre-save middleware
FileSchema.pre('save', function(next) {
  if (this.isModified('downloadCount')) {
    this.lastAccessedAt = new Date();
  }
  next();
});

export const File = mongoose.model<IFile>('File', FileSchema);
