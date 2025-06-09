import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  _id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  profilePhoto?: string;
  dateOfBirth?: Date;
  preferredLanguage: 'en' | 'sn' | 'nd';
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  passwordChangedAt?: Date;
  googleId?: string; // Added for Google OAuth
  authProvider?: 'local' | 'google'; // Added to distinguish auth methods
  lastLogin?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  isActive: boolean;
  roles: string[];
  mfaEnabled: boolean;
  mfaSecret?: string;
  backupCodes: string[];
  preferences: {
    notifications: {
      email: boolean;
      push: boolean;
      newsletter: boolean;
    };
    privacy: {
      profileVisibility: 'public' | 'family' | 'private';
      allowMessages: boolean;
      showOnlineStatus: boolean;
    };
    theme: 'light' | 'dark' | 'auto';
    timezone: string;
  };
  metadata: {
    signupSource: string;
    ipAddress?: string;
    userAgent?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  isLocked(): boolean;
  incLoginAttempts(): Promise<void>;
  generateEmailVerificationToken(): string;
  generatePasswordResetToken(): string;
}

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  password: {
    type: String,
    // Password is not required if authProvider is 'google'
    required: function(this: IUser) { return this.authProvider === 'local'; },
    minlength: 8,
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
  },
  profilePhoto: {
    type: String,
    default: null,
  },
  dateOfBirth: {
    type: Date,
    default: null,
  },
  preferredLanguage: {
    type: String,
    enum: ['en', 'sn', 'nd'],
    default: 'en',
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  passwordChangedAt: Date,
  googleId: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple documents to have null for this field but unique if value is present
    index: true,
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local',
  },
  lastLogin: Date,
  loginAttempts: {
    type: Number,
    default: 0,
  },
  lockUntil: Date,
  isActive: {
    type: Boolean,
    default: true,
  },
  roles: [{
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user',
  }],
  mfaEnabled: {
    type: Boolean,
    default: false,
  },
  mfaSecret: String,
  backupCodes: [String],
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      newsletter: { type: Boolean, default: false },
    },
    privacy: {
      profileVisibility: {
        type: String,
        enum: ['public', 'family', 'private'],
        default: 'family',
      },
      allowMessages: { type: Boolean, default: true },
      showOnlineStatus: { type: Boolean, default: true },
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto',
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
  },
  metadata: {
    signupSource: {
      type: String,
      default: 'web',
    },
    ipAddress: String,
    userAgent: String,
  },
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.mfaSecret;
      delete ret.backupCodes;
      delete ret.emailVerificationToken;
      delete ret.passwordResetToken;
      return ret;
    },
  },
});

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ googleId: 1 }); // Index for googleId
UserSchema.index({ isActive: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ 'preferences.privacy.profileVisibility': 1 });

// Virtual for full name
UserSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for account lock status
UserSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > new Date());
});

// Pre-save middleware to hash password
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to check if account is locked
UserSchema.methods.isLocked = function(): boolean {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

// Method to increment login attempts
UserSchema.methods.incLoginAttempts = async function(): Promise<void> {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < new Date()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }

  const updates: any = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }

  return this.updateOne(updates);
};

// Method to generate email verification token
UserSchema.methods.generateEmailVerificationToken = function(): string {
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  this.emailVerificationToken = token;
  this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  return token;
};

// Method to generate password reset token
UserSchema.methods.generatePasswordResetToken = function(): string {
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  this.passwordResetToken = token;
  this.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  return token;
};

export const User = mongoose.model<IUser>('User', UserSchema);
