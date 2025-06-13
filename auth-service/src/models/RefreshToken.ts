import mongoose, { Schema, Document } from 'mongoose';

export interface IRefreshToken extends Document {
  _id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  isRevoked: boolean;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  revokedAt?: Date;
  revokedReason?: string;
}

const RefreshTokenSchema = new Schema<IRefreshToken>({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  token: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }, // TTL index
  },
  isRevoked: {
    type: Boolean,
    default: false,
    index: true,
  },
  ipAddress: String,
  userAgent: String,
  revokedAt: Date,
  revokedReason: {
    type: String,
    enum: ['logout', 'security', 'expired', 'admin'],
  },
}, {
  timestamps: true,
});

// Compound indexes
RefreshTokenSchema.index({ userId: 1, isRevoked: 1 });
RefreshTokenSchema.index({ token: 1, isRevoked: 1 });

// Method to revoke token
RefreshTokenSchema.methods.revoke = function(reason: string = 'logout') {
  this.isRevoked = true;
  this.revokedAt = new Date();
  this.revokedReason = reason;
  return this.save();
};

// Static method to revoke all tokens for a user
RefreshTokenSchema.statics.revokeAllForUser = async function(userId: string, reason: string = 'security') {
  return this.updateMany(
    { userId, isRevoked: false },
    {
      $set: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: reason
      }
    }
  );
};

export const RefreshToken = mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema);
