import mongoose, { Schema, Document } from 'mongoose';

/**
 * @swagger
 * components:
 *   schemas:
 *     FamilyTree:
 *       type: object
 *       required:
 *         - name
 *         - ownerId
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated unique identifier
 *         name:
 *           type: string
 *           description: Name of the family tree
 *         description:
 *           type: string
 *           description: Description of the family tree
 *         ownerId:
 *           type: string
 *           description: User ID of the tree owner
 *         collaborators:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [viewer, editor, admin]
 *               invitedAt:
 *                 type: string
 *                 format: date-time
 *               acceptedAt:
 *                 type: string
 *                 format: date-time
 *         rootPersonId:
 *           type: string
 *           description: ID of the root person in the tree
 *         privacy:
 *           type: string
 *           enum: [public, family, private]
 *           description: Privacy level of the family tree
 *         settings:
 *           type: object
 *           properties:
 *             allowCollaboration:
 *               type: boolean
 *             showLivingPersons:
 *               type: boolean
 *             defaultPersonPrivacy:
 *               type: string
 *               enum: [public, family, private]
 *             theme:
 *               type: string
 *               enum: [modern, classic, minimal]
 *         statistics:
 *           type: object
 *           properties:
 *             totalPersons:
 *               type: number
 *             totalGenerations:
 *               type: number
 *             oldestBirthYear:
 *               type: number
 *             newestBirthYear:
 *               type: number
 *             completenessScore:
 *               type: number
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

export interface IFamilyTree extends Document {
  name: string;
  description?: string;
  ownerId: string;
  collaborators: Array<{
    userId: string;
    role: 'viewer' | 'editor' | 'admin';
    invitedAt: Date;
    acceptedAt?: Date;
  }>;
  rootPersonId?: mongoose.Types.ObjectId;
  privacy: 'public' | 'family' | 'private';
  settings: {
    allowCollaboration: boolean;
    showLivingPersons: boolean;
    defaultPersonPrivacy: 'public' | 'family' | 'private';
    theme: 'modern' | 'classic' | 'minimal';
  };
  statistics: {
    totalPersons: number;
    totalGenerations: number;
    oldestBirthYear?: number;
    newestBirthYear?: number;
    completenessScore: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const FamilyTreeSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  ownerId: {
    type: String,
    required: true,
    index: true,
  },
  collaborators: [{
    userId: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['viewer', 'editor', 'admin'],
      default: 'viewer',
    },
    invitedAt: {
      type: Date,
      default: Date.now,
    },
    acceptedAt: Date,
  }],
  rootPersonId: {
    type: Schema.Types.ObjectId,
    ref: 'Person',
  },
  privacy: {
    type: String,
    enum: ['public', 'family', 'private'],
    default: 'family',
  },
  settings: {
    allowCollaboration: {
      type: Boolean,
      default: true,
    },
    showLivingPersons: {
      type: Boolean,
      default: false,
    },
    defaultPersonPrivacy: {
      type: String,
      enum: ['public', 'family', 'private'],
      default: 'family',
    },
    theme: {
      type: String,
      enum: ['modern', 'classic', 'minimal'],
      default: 'modern',
    },
  },
  statistics: {
    totalPersons: {
      type: Number,
      default: 0,
    },
    totalGenerations: {
      type: Number,
      default: 0,
    },
    oldestBirthYear: Number,
    newestBirthYear: Number,
    completenessScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for performance
FamilyTreeSchema.index({ ownerId: 1 });
FamilyTreeSchema.index({ 'collaborators.userId': 1 });
FamilyTreeSchema.index({ privacy: 1 });
FamilyTreeSchema.index({ createdAt: -1 });

// Virtual for checking if user has access
FamilyTreeSchema.virtual('userRole').get(function(this: IFamilyTree & { _currentUserId?: string }) {
  if (!this._currentUserId) return null;
  
  if (this.ownerId === this._currentUserId) return 'owner';
  
  const collaborator = this.collaborators.find(c => c.userId === this._currentUserId && c.acceptedAt);
  return collaborator?.role || null;
});

// Method to check if user can view the tree
FamilyTreeSchema.methods.canUserView = function(userId: string): boolean {
  if (this.privacy === 'public') return true;
  if (this.ownerId === userId) return true;
  
  const collaborator = this.collaborators.find(c => c.userId === userId && c.acceptedAt);
  return !!collaborator;
};

// Method to check if user can edit the tree
FamilyTreeSchema.methods.canUserEdit = function(userId: string): boolean {
  if (this.ownerId === userId) return true;
  
  const collaborator = this.collaborators.find(c => c.userId === userId && c.acceptedAt);
  return collaborator?.role === 'editor' || collaborator?.role === 'admin';
};

// Method to check if user can manage the tree (add/remove collaborators, etc.)
FamilyTreeSchema.methods.canUserManage = function(userId: string): boolean {
  if (this.ownerId === userId) return true;
  
  const collaborator = this.collaborators.find(c => c.userId === userId && c.acceptedAt);
  return collaborator?.role === 'admin';
};

// Method to add collaborator
FamilyTreeSchema.methods.addCollaborator = function(userId: string, role: string = 'viewer') {
  const existingCollaborator = this.collaborators.find(c => c.userId === userId);
  
  if (existingCollaborator) {
    existingCollaborator.role = role;
    existingCollaborator.invitedAt = new Date();
    existingCollaborator.acceptedAt = undefined;
  } else {
    this.collaborators.push({
      userId,
      role,
      invitedAt: new Date(),
    });
  }
  
  return this.save();
};

// Method to accept collaboration invitation
FamilyTreeSchema.methods.acceptCollaboration = function(userId: string) {
  const collaborator = this.collaborators.find(c => c.userId === userId);
  
  if (collaborator && !collaborator.acceptedAt) {
    collaborator.acceptedAt = new Date();
    return this.save();
  }
  
  throw new Error('Collaboration invitation not found or already accepted');
};

// Method to remove collaborator
FamilyTreeSchema.methods.removeCollaborator = function(userId: string) {
  this.collaborators = this.collaborators.filter(c => c.userId !== userId);
  return this.save();
};

// Pre-save middleware to update statistics
FamilyTreeSchema.pre('save', async function(next) {
  if (this.isModified('statistics')) {
    // Recalculate completeness score based on various factors
    const { totalPersons, totalGenerations } = this.statistics;
    
    let score = 0;
    
    // Base score for having persons
    if (totalPersons > 0) score += 20;
    if (totalPersons > 10) score += 10;
    if (totalPersons > 50) score += 10;
    
    // Score for generations depth
    if (totalGenerations > 2) score += 15;
    if (totalGenerations > 4) score += 15;
    if (totalGenerations > 6) score += 10;
    
    // Additional factors can be added here (photos, sources, etc.)
    score += 20; // Placeholder for other completeness factors
    
    this.statistics.completenessScore = Math.min(score, 100);
  }
  
  next();
});

export const FamilyTree = mongoose.model<IFamilyTree>('FamilyTree', FamilyTreeSchema);
