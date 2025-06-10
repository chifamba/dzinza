import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  _id: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, unknown>; // Changed from any to unknown
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  timestamp: Date;
  correlationId?: string;
  sessionId?: string;
}

const AuditLogSchema = new Schema<IAuditLog>({
  userId: {
    type: String,
    index: true,
  },
  action: {
    type: String,
    required: true,
    index: true,
  },
  resource: {
    type: String,
    required: true,
    index: true,
  },
  resourceId: {
    type: String,
    index: true,
  },
  details: {
    type: Schema.Types.Mixed,
    default: {},
  },
  ipAddress: String,
  userAgent: String,
  success: {
    type: Boolean,
    required: true,
    index: true,
  },
  errorMessage: String,
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  correlationId: String,
  sessionId: String,
}, {
  timestamps: false, // We use our own timestamp field
});

// Indexes for querying
AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ resource: 1, action: 1 });
AuditLogSchema.index({ success: 1, timestamp: -1 });

// TTL index to automatically delete old audit logs after 2 years
AuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2 * 365 * 24 * 60 * 60 });

// Static method to log action
AuditLogSchema.statics.logAction = function(data: {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>; // Changed from any to unknown
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  correlationId?: string;
  sessionId?: string;
}) {
  return this.create({
    ...data,
    timestamp: new Date(),
  });
};

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
