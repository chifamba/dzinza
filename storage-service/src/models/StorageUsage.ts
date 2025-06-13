import mongoose, { Schema, Document } from 'mongoose';

export interface IStorageUsage extends Document {
  userId: string;
  totalFiles: number;
  totalSize: number;
  categorySizes: {
    documents: number;
    images: number;
    videos: number;
    audio: number;
    other: number;
  };
  monthlyUploads: number;
  lastCalculated: Date;
  quotaLimit: number; // in bytes
  quotaUsed: number;  // in bytes
  quotaPercentage: number;
}

const StorageUsageSchema = new Schema<IStorageUsage>({
  userId: { type: String, required: true, unique: true, index: true },
  totalFiles: { type: Number, default: 0 },
  totalSize: { type: Number, default: 0 },
  categorySizes: {
    documents: { type: Number, default: 0 },
    images: { type: Number, default: 0 },
    videos: { type: Number, default: 0 },
    audio: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },
  monthlyUploads: { type: Number, default: 0 },
  lastCalculated: { type: Date, default: Date.now },
  quotaLimit: { type: Number, default: 5 * 1024 * 1024 * 1024 }, // 5GB default
  quotaUsed: { type: Number, default: 0 },
  quotaPercentage: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Virtual for formatted quota
StorageUsageSchema.virtual('formattedQuotaUsed').get(function() {
  return formatBytes(this.quotaUsed);
});

StorageUsageSchema.virtual('formattedQuotaLimit').get(function() {
  return formatBytes(this.quotaLimit);
});

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export const StorageUsage = mongoose.model<IStorageUsage>('StorageUsage', StorageUsageSchema);

// System-wide storage analytics
export interface IStorageAnalytics extends Document {
  date: Date;
  totalUsers: number;
  totalFiles: number;
  totalStorage: number;
  newUploadsToday: number;
  deletionsToday: number;
  topFileTypes: Array<{
    type: string;
    count: number;
    size: number;
  }>;
  averageFileSize: number;
  storageGrowthRate: number; // percentage
}

const StorageAnalyticsSchema = new Schema<IStorageAnalytics>({
  date: { type: Date, required: true, unique: true, index: true },
  totalUsers: { type: Number, required: true },
  totalFiles: { type: Number, required: true },
  totalStorage: { type: Number, required: true },
  newUploadsToday: { type: Number, default: 0 },
  deletionsToday: { type: Number, default: 0 },
  topFileTypes: [{
    type: { type: String, required: true },
    count: { type: Number, required: true },
    size: { type: Number, required: true }
  }],
  averageFileSize: { type: Number, default: 0 },
  storageGrowthRate: { type: Number, default: 0 }
}, {
  timestamps: true
});

// TTL index - keep analytics for 1 year
StorageAnalyticsSchema.index({ date: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

export const StorageAnalytics = mongoose.model<IStorageAnalytics>('StorageAnalytics', StorageAnalyticsSchema);
