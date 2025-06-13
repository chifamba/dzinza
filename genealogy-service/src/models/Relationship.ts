import mongoose, { Schema, Document } from 'mongoose';

/**
 * @swagger
 * components:
 *   schemas:
 *     Relationship:
 *       type: object
 *       required:
 *         - person1Id
 *         - person2Id
 *         - type
 *         - familyTreeId
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated unique identifier
 *         person1Id:
 *           type: string
 *           description: ID of the first person in the relationship
 *         person2Id:
 *           type: string
 *           description: ID of the second person in the relationship
 *         type:
 *           type: string
 *           enum: [spouse, parent-child, sibling, half-sibling, step-sibling, adoptive-parent-child, godparent-godchild, other]
 *           description: Type of relationship
 *         familyTreeId:
 *           type: string
 *           description: ID of the family tree this relationship belongs to
 *         startDate:
 *           type: object
 *           properties:
 *             date:
 *               type: string
 *               format: date
 *             approximate:
 *               type: boolean
 *         endDate:
 *           type: object
 *           properties:
 *             date:
 *               type: string
 *               format: date
 *             approximate:
 *               type: boolean
 *         status:
 *           type: string
 *           enum: [active, ended, unknown]
 *           description: Current status of the relationship
 *         notes:
 *           type: string
 *           description: Additional notes about the relationship
 *         sources:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               url:
 *                 type: string
 *               description:
 *                 type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

export interface IRelationship extends Document {
  person1Id: mongoose.Types.ObjectId;
  person2Id: mongoose.Types.ObjectId;
  type: 'spouse' | 'parent-child' | 'sibling' | 'half-sibling' | 'step-sibling' | 'adoptive-parent-child' | 'godparent-godchild' | 'other';
  familyTreeId: mongoose.Types.ObjectId;
  startDate?: {
    date?: Date;
    approximate?: boolean;
  };
  endDate?: {
    date?: Date;
    approximate?: boolean;
  };
  status: 'active' | 'ended' | 'unknown';
  notes?: string;
  sources: Array<{
    title: string;
    url?: string;
    description?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const RelationshipSchema: Schema = new Schema({
  person1Id: {
    type: Schema.Types.ObjectId,
    ref: 'Person',
    required: true,
    index: true,
  },
  person2Id: {
    type: Schema.Types.ObjectId,
    ref: 'Person',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: [
      'spouse',
      'parent-child',
      'sibling',
      'half-sibling',
      'step-sibling',
      'adoptive-parent-child',
      'godparent-godchild',
      'other'
    ],
    required: true,
  },
  familyTreeId: {
    type: Schema.Types.ObjectId,
    ref: 'FamilyTree',
    required: true,
    index: true,
  },
  startDate: {
    date: Date,
    approximate: {
      type: Boolean,
      default: false,
    },
  },
  endDate: {
    date: Date,
    approximate: {
      type: Boolean,
      default: false,
    },
  },
  status: {
    type: String,
    enum: ['active', 'ended', 'unknown'],
    default: 'active',
  },
  notes: {
    type: String,
    maxlength: 1000,
  },
  sources: [{
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    url: {
      type: String,
      validate: {
        validator: function(v: string) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'Source URL must be a valid URL',
      },
    },
    description: {
      type: String,
      maxlength: 500,
    },
  }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Compound indexes for performance
RelationshipSchema.index({ person1Id: 1, person2Id: 1 }, { unique: true });
RelationshipSchema.index({ familyTreeId: 1, type: 1 });
RelationshipSchema.index({ person1Id: 1, type: 1 });
RelationshipSchema.index({ person2Id: 1, type: 1 });

// Virtual for relationship direction (parent/child relationships)
RelationshipSchema.virtual('direction').get(function(this: IRelationship) {
  if (this.type === 'parent-child' || this.type === 'adoptive-parent-child') {
    return {
      parent: this.person1Id,
      child: this.person2Id,
    };
  }
  return null;
});

// Method to get the inverse relationship type
RelationshipSchema.methods.getInverseType = function(): string {
  switch (this.type) {
    case 'parent-child':
      return 'child-parent';
    case 'adoptive-parent-child':
      return 'adoptive-child-parent';
    case 'godparent-godchild':
      return 'godchild-godparent';
    case 'spouse':
    case 'sibling':
    case 'half-sibling':
    case 'step-sibling':
      return this.type; // Symmetric relationships
    default:
      return 'other';
  }
};

// Method to check if relationship is symmetric
RelationshipSchema.methods.isSymmetric = function(): boolean {
  return ['spouse', 'sibling', 'half-sibling', 'step-sibling'].includes(this.type);
};

// Method to get other person in relationship
RelationshipSchema.methods.getOtherPerson = function(personId: string): mongoose.Types.ObjectId | null {
  if (this.person1Id.toString() === personId) {
    return this.person2Id;
  } else if (this.person2Id.toString() === personId) {
    return this.person1Id;
  }
  return null;
};

// Pre-save validation
RelationshipSchema.pre('save', function(next) {
  // Prevent self-relationships
  if (this.person1Id.equals(this.person2Id)) {
    return next(new Error('A person cannot have a relationship with themselves'));
  }
  
  // Validate date logic
  if (this.startDate?.date && this.endDate?.date && this.startDate.date > this.endDate.date) {
    return next(new Error('Start date cannot be after end date'));
  }
  
  // Set status based on end date
  if (this.endDate?.date && this.status === 'active') {
    this.status = 'ended';
  }
  
  next();
});

// Static method to find relationships for a person
RelationshipSchema.statics.findForPerson = function(personId: mongoose.Types.ObjectId, familyTreeId?: mongoose.Types.ObjectId) {
  const query: any = {
    $or: [
      { person1Id: personId },
      { person2Id: personId }
    ]
  };
  
  if (familyTreeId) {
    query.familyTreeId = familyTreeId;
  }
  
  return this.find(query);
};

// Static method to find children of a person
RelationshipSchema.statics.findChildren = function(parentId: mongoose.Types.ObjectId, familyTreeId?: mongoose.Types.ObjectId) {
  const query: any = {
    person1Id: parentId,
    type: { $in: ['parent-child', 'adoptive-parent-child'] }
  };
  
  if (familyTreeId) {
    query.familyTreeId = familyTreeId;
  }
  
  return this.find(query);
};

// Static method to find parents of a person
RelationshipSchema.statics.findParents = function(childId: mongoose.Types.ObjectId, familyTreeId?: mongoose.Types.ObjectId) {
  const query: any = {
    person2Id: childId,
    type: { $in: ['parent-child', 'adoptive-parent-child'] }
  };
  
  if (familyTreeId) {
    query.familyTreeId = familyTreeId;
  }
  
  return this.find(query);
};

// Static method to find siblings of a person
RelationshipSchema.statics.findSiblings = function(personId: mongoose.Types.ObjectId, familyTreeId?: mongoose.Types.ObjectId) {
  const query: any = {
    $or: [
      { person1Id: personId },
      { person2Id: personId }
    ],
    type: { $in: ['sibling', 'half-sibling', 'step-sibling'] }
  };
  
  if (familyTreeId) {
    query.familyTreeId = familyTreeId;
  }
  
  return this.find(query);
};

// Static method to find spouses of a person
RelationshipSchema.statics.findSpouses = function(personId: mongoose.Types.ObjectId, familyTreeId?: mongoose.Types.ObjectId) {
  const query: any = {
    $or: [
      { person1Id: personId },
      { person2Id: personId }
    ],
    type: 'spouse'
  };
  
  if (familyTreeId) {
    query.familyTreeId = familyTreeId;
  }
  
  return this.find(query);
};

export const Relationship = mongoose.model<IRelationship>('Relationship', RelationshipSchema);
