import { Schema, model, Document, Types } from 'mongoose';

interface IIdentifier extends Document {
  type: 'NationalID' | 'Passport' | 'DriverLicense' | 'BirthCertificate' | 'Email' | 'Phone' | 'Other';
  value: string;
  verificationStatus?: 'Verified' | 'Unverified' | 'Pending';
  notes?: string;
}

const IdentifierSchema = new Schema<IIdentifier>({
  type: {
    type: String,
    enum: ['NationalID', 'Passport', 'DriverLicense', 'BirthCertificate', 'Email', 'Phone', 'Other'],
    required: true,
  },
  value: { type: String, required: true },
  verificationStatus: {
    type: String,
    enum: ['Verified', 'Unverified', 'Pending'],
    default: 'Unverified',
  },
  notes: { type: String },
});

interface ILegalParent extends Document {
  parentId: Types.ObjectId;
  relationshipType: 'Adoptive' | 'Guardian' | 'Foster' | 'Step-parent' | 'Other';
}

const LegalParentSchema = new Schema<ILegalParent>({
  parentId: { type: Schema.Types.ObjectId, ref: 'Person', required: true },
  relationshipType: {
    type: String,
    enum: ['Adoptive', 'Guardian', 'Foster', 'Step-parent', 'Other'],
    required: true,
  },
});

// Interface for denormalized spouse information
interface ISpouseLink {
  spouseId: Types.ObjectId;
  relationshipType: string; // e.g., 'Married', 'Divorced', 'CustomaryUnion'
  startDate?: Date;
  endDate?: Date;
}
const SpouseLinkSchema = new Schema<ISpouseLink>({
  spouseId: { type: Schema.Types.ObjectId, ref: 'Person', required: true },
  relationshipType: { type: String, required: true },
  startDate: { type: Date },
  endDate: { type: Date },
});

// Interface for denormalized sibling information
interface ISiblingLink {
  siblingId: Types.ObjectId;
  relationshipType: string; // e.g., 'Biological', 'Half', 'Step', 'Adoptive'
}
const SiblingLinkSchema = new Schema<ISiblingLink>({
  siblingId: { type: Schema.Types.ObjectId, ref: 'Person', required: true },
  relationshipType: { type: String, required: true },
});


export interface IPerson extends Document {
  uniqueId: string; // For internal system use, could be UUID
  familyTreeId: Types.ObjectId; // Reference to the FamilyTree this person belongs to

  firstName?: string;
  middleName?: string;
  lastName?: string;
  nickName?: string;
  gender?: 'Male' | 'Female' | 'Non-binary' | 'Other' | 'Unknown';

  dateOfBirth?: Date;
  placeOfBirth?: string;
  isBirthDateEstimated?: boolean;

  dateOfDeath?: Date;
  placeOfDeath?: string;
  isDeathDateEstimated?: boolean;
  causeOfDeath?: string;

  isLiving: boolean; // Calculated or set; true if dateOfDeath is not set

  identifiers: Types.DocumentArray<IIdentifier>;

  biologicalMother?: Types.ObjectId;
  biologicalFather?: Types.ObjectId;
  legalParents: Types.DocumentArray<ILegalParent>;

  // Denormalized fields for easier querying - managed by application logic / hooks
  spouses: Types.DocumentArray<ISpouseLink>;
  siblings: Types.DocumentArray<ISiblingLink>;

  notes?: string;
  profilePhotoUrl?: string;

  // Cultural and traditional information
  clan?: string; // e.g., for African contexts
  tribe?: string;
  traditionalTitles?: string[];

  privacySettings: {
    showProfile: 'Public' | 'FamilyTreeOnly' | 'Private';
    showBirthDate: 'Public' | 'FamilyTreeOnly' | 'Private';
    showDeathDate: 'Public' | 'FamilyTreeOnly' | 'Private';
    // Add more specific privacy settings as needed
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const PersonSchema = new Schema<IPerson>(
  {
    uniqueId: { type: String, required: true, unique: true, default: () => new Types.ObjectId().toHexString() }, // Using MongoDB ObjectId as default uniqueId for simplicity
    familyTreeId: { type: Schema.Types.ObjectId, ref: 'FamilyTree', required: true, index: true },

    firstName: { type: String, trim: true },
    middleName: { type: String, trim: true },
    lastName: { type: String, trim: true, index: true },
    nickName: { type: String, trim: true },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Non-binary', 'Other', 'Unknown'],
      default: 'Unknown',
    },

    dateOfBirth: { type: Date },
    placeOfBirth: { type: String, trim: true },
    isBirthDateEstimated: { type: Boolean, default: false },

    dateOfDeath: { type: Date },
    placeOfDeath: { type: String, trim: true },
    isDeathDateEstimated: { type: Boolean, default: false },
    causeOfDeath: { type: String, trim: true },

    isLiving: { type: Boolean, default: true }, // Should be dynamically determined or explicitly set

    identifiers: [IdentifierSchema],

    biologicalMother: { type: Schema.Types.ObjectId, ref: 'Person', sparse: true },
    biologicalFather: { type: Schema.Types.ObjectId, ref: 'Person', sparse: true },
    legalParents: [LegalParentSchema],

    spouses: [SpouseLinkSchema], // Denormalized
    siblings: [SiblingLinkSchema], // Denormalized

    notes: { type: String },
    profilePhotoUrl: { type: String },

    clan: { type: String, trim: true },
    tribe: { type: String, trim: true },
    traditionalTitles: [{ type: String, trim: true }],

    privacySettings: {
      showProfile: { type: String, enum: ['Public', 'FamilyTreeOnly', 'Private'], default: 'FamilyTreeOnly' },
      showBirthDate: { type: String, enum: ['Public', 'FamilyTreeOnly', 'Private'], default: 'FamilyTreeOnly' },
      showDeathDate: { type: String, enum: ['Public', 'FamilyTreeOnly', 'Private'], default: 'FamilyTreeOnly' },
    },
  },
  { timestamps: true }
);

// Indexing common search fields
PersonSchema.index({ firstName: 'text', lastName: 'text', nickName: 'text' });
PersonSchema.index({ dateOfBirth: 1 });
PersonSchema.index({ dateOfDeath: 1 });
PersonSchema.index({ clan: 1 });
PersonSchema.index({ tribe: 1 });

// Pre-save hook to determine isLiving status
PersonSchema.pre<IPerson>('save', function (next) {
  if (this.isModified('dateOfDeath')) {
    this.isLiving = !this.dateOfDeath;
  }
  // Ensure names are not just empty strings if provided
  if (this.firstName !== undefined && this.firstName.trim() === '') this.firstName = undefined;
  if (this.lastName !== undefined && this.lastName.trim() === '') this.lastName = undefined;
  if (!this.firstName && !this.lastName && !this.nickName) {
      // If no names are provided, consider setting a default or handling as an error
      // For now, we allow it, but this might need validation depending on requirements
  }
  next();
});

// Virtual for full name
PersonSchema.virtual('fullName').get(function (this: IPerson) {
  const parts: string[] = [];
  if (this.firstName) parts.push(this.firstName);
  if (this.middleName) parts.push(this.middleName);
  if (this.lastName) parts.push(this.lastName);
  return parts.join(' ');
});

PersonSchema.set('toObject', { virtuals: true });
PersonSchema.set('toJSON', { virtuals: true });

export const Person = model<IPerson>('Person', PersonSchema);
