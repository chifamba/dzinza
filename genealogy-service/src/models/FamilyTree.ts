import { Schema, model, Document, Types } from 'mongoose';
import { IPerson } from './Person'; // Assuming Person model is in the same directory

// Interface for Collaborator
interface ICollaborator extends Document {
  userId: string; // Reference to a User ID from an auth service
  role: 'viewer' | 'editor' | 'admin';
  addedAt: Date;
  acceptedAt?: Date; // When the collaborator accepts the invitation
}

const CollaboratorSchema = new Schema<ICollaborator>({
  userId: { type: String, required: true },
  role: {
    type: String,
    enum: ['viewer', 'editor', 'admin'],
    default: 'viewer',
  },
  addedAt: { type: Date, default: Date.now },
  acceptedAt: { type: Date },
});

// Interface for FamilyTree Settings
interface IFamilyTreeSettings {
  allowCollaboration: boolean;
  showLivingPersons: boolean; // To non-collaborators or based on privacy
  defaultPersonPrivacy: 'family' | 'private' | 'public'; // Default privacy for new persons added
  theme: string; // e.g., 'modern', 'classic'
  // Add other tree-specific settings as needed
}

const FamilyTreeSettingsSchema = new Schema<IFamilyTreeSettings>({
  allowCollaboration: { type: Boolean, default: true },
  showLivingPersons: { type: Boolean, default: true }, // Consider privacy implications
  defaultPersonPrivacy: { type: String, enum: ['family', 'private', 'public'], default: 'family' },
  theme: { type: String, default: 'modern' },
});

// Interface for FamilyTree Statistics
interface IFamilyTreeStatistics {
  totalPersons: number;
  totalGenerations: number;
  completenessScore: number; // A calculated score based on data richness
  // Add other relevant statistics
}

const FamilyTreeStatisticsSchema = new Schema<IFamilyTreeStatistics>({
  totalPersons: { type: Number, default: 0 },
  totalGenerations: { type: Number, default: 0 },
  completenessScore: { type: Number, default: 0 },
});


export interface IFamilyTree extends Document {
  name: string;
  description?: string;
  ownerId: string; // Reference to a User ID from an auth service (creator of the tree)
  rootPersonId?: Types.ObjectId; // The primary individual from whom the tree often originates or is centered

  // members: Types.Array<Types.ObjectId>; // Explicit list of all persons in the tree.
  // Note: For very large trees, managing a direct 'members' array can be inefficient.
  // Querying Persons by their 'familyTreeId' is often more scalable.
  // This field can be used for smaller trees or specific use cases if needed.

  collaborators: Types.DocumentArray<ICollaborator>;
  privacy: 'public' | 'family' | 'private'; // family = visible to owner and collaborators

  settings: IFamilyTreeSettings;
  statistics: IFamilyTreeStatistics; // Could be periodically updated

  // GEDCOM import/export related fields
  lastGedcomImport?: Date;
  lastGedcomExport?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Methods (example from provided context)
  canUserView: (userId?: string) => boolean;
  canUserEdit: (userId?: string) => boolean;
  canUserManage: (userId?: string) => boolean;
  addCollaborator: (userId: string, role: 'viewer' | 'editor' | 'admin') => Promise<void>;
}

const FamilyTreeSchema = new Schema<IFamilyTree>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500 },
    ownerId: { type: String, required: true, index: true }, // Assuming this is a string ID from another service
    rootPersonId: { type: Schema.Types.ObjectId, ref: 'Person', sparse: true },

    // members: [{ type: Schema.Types.ObjectId, ref: 'Person' }], // See note in interface

    collaborators: [CollaboratorSchema],
    privacy: {
      type: String,
      enum: ['public', 'family', 'private'],
      default: 'private',
    },
    settings: FamilyTreeSettingsSchema,
    statistics: FamilyTreeStatisticsSchema,

    lastGedcomImport: { type: Date },
    lastGedcomExport: { type: Date },
  },
  { timestamps: true }
);

// Indexing
FamilyTreeSchema.index({ name: 1 });

// Methods for access control (simplified examples based on context from familyTree.ts)
FamilyTreeSchema.methods.canUserView = function (this: IFamilyTree, userId?: string): boolean {
  if (this.privacy === 'public') {
    return true;
  }
  if (!userId) return false; // Must be logged in for non-public trees
  if (this.ownerId === userId) {
    return true;
  }
  return this.collaborators.some(c => c.userId === userId && c.acceptedAt);
};

FamilyTreeSchema.methods.canUserEdit = function (this: IFamilyTree, userId?: string): boolean {
  if (!userId) return false;
  if (this.ownerId === userId) {
    return true;
  }
  return this.collaborators.some(c => c.userId === userId && (c.role === 'editor' || c.role === 'admin') && c.acceptedAt);
};

FamilyTreeSchema.methods.canUserManage = function (this: IFamilyTree, userId?: string): boolean {
  if (!userId) return false;
  if (this.ownerId === userId) {
    return true; // Owner can manage
  }
  // Admins can also manage (e.g., other collaborators, but not the owner's status)
  return this.collaborators.some(c => c.userId === userId && c.role === 'admin' && c.acceptedAt);
};

FamilyTreeSchema.methods.addCollaborator = async function (this: IFamilyTree, collaboratorUserId: string, role: 'viewer' | 'editor' | 'admin' = 'viewer'): Promise<void> {
  if (this.ownerId === collaboratorUserId) {
    throw new Error('Owner cannot be added as a collaborator.');
  }
  const existingCollaborator = this.collaborators.find(c => c.userId === collaboratorUserId);
  if (existingCollaborator) {
    // If exists, update role, or throw error, or just do nothing - depends on desired behavior
    // For now, let's update if different, or inform if same.
    if (existingCollaborator.role !== role) {
        existingCollaborator.role = role;
        // Reset acceptedAt if role changes? Or assume they accept the new role.
    } else {
        // Optional: throw new Error('User is already a collaborator with this role.');
        return; // No change needed
    }
  } else {
    this.collaborators.push({ userId: collaboratorUserId, role, addedAt: new Date() } as ICollaborator);
  }
  await this.save();
  // TODO: Send notification/invitation to collaboratorUserId
};


export const FamilyTree = model<IFamilyTree>('FamilyTree', FamilyTreeSchema);
