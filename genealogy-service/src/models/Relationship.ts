import { Schema, model, Document, Types } from 'mongoose';

// Enum for relationship types
export enum RelationshipType {
  ParentChild = 'ParentChild',
  Spousal = 'Spousal',
  Sibling = 'Sibling',
  StepSibling = 'StepSibling',
  HalfSibling = 'HalfSibling',
  AdoptiveSibling = 'AdoptiveSibling', // Could be covered by Sibling + adoption event on Person
  FosterSibling = 'FosterSibling', // Similar to AdoptiveSibling
  GuardianChild = 'GuardianChild', // Explicit guardian relationship
  Other = 'Other',
}

// Enum for specific roles in a ParentChild relationship (from the perspective of the parent)
export enum ParentalRole {
  BiologicalMother = 'BiologicalMother',
  BiologicalFather = 'BiologicalFather',
  AdoptiveMother = 'AdoptiveMother',
  AdoptiveFather = 'AdoptiveFather',
  Guardian = 'Guardian',
  StepMother = 'StepMother',
  StepFather = 'StepFather',
  FosterParent = 'FosterParent',
  SurrogateMother = 'SurrogateMother',
  SpermDonor = 'SpermDonor', // For more detailed genetic lineage
  EggDonor = 'EggDonor',     // For more detailed genetic lineage
  Other = 'Other',
}

// Enum for spousal relationship statuses
export enum SpousalStatus {
  Married = 'Married',
  Divorced = 'Divorced',
  Widowed = 'Widowed',
  Separated = 'Separated',
  Annulled = 'Annulled',
  DomesticPartnership = 'DomesticPartnership',
  CustomaryUnion = 'CustomaryUnion', // Important for African contexts
  LivingTogether = 'LivingTogether',
  Engaged = 'Engaged', // Could be a pre-spousal status
  Other = 'Other',
}

// Interface for events within a relationship (e.g., marriage, divorce)
interface IRelationshipEvent extends Document {
  eventType: string; // e.g., 'Marriage', 'Divorce', 'AdoptionFinalized', 'GuardianshipGranted'
  date?: Date;
  place?: string;
  description?: string;
}
const RelationshipEventSchema = new Schema<IRelationshipEvent>({
  eventType: { type: String, required: true },
  date: { type: Date },
  place: { type: String, trim: true },
  description: { type: String, trim: true },
});


export interface IRelationship extends Document {
  familyTreeId: Types.ObjectId; // Belongs to a specific family tree
  person1Id: Types.ObjectId;     // The primary person in the relationship context (e.g., parent, one spouse, one sibling)
  person2Id: Types.ObjectId;     // The secondary person (e.g., child, other spouse, other sibling)
  type: RelationshipType;

  // Fields specific to ParentChild relationships
  parentalRole?: ParentalRole; // Role of person1Id towards person2Id

  // Fields specific to Spousal relationships
  status?: SpousalStatus;
  startDate?: Date;         // e.g., Marriage date, partnership start date
  endDate?: Date;           // e.g., Divorce date, date of death of a spouse

  // General fields
  notes?: string;
  events: Types.DocumentArray<IRelationshipEvent>; // For marriage, divorce, adoption events etc.

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const RelationshipSchema = new Schema<IRelationship>(
  {
    familyTreeId: { type: Schema.Types.ObjectId, ref: 'FamilyTree', required: true, index: true },
    person1Id: { type: Schema.Types.ObjectId, ref: 'Person', required: true, index: true },
    person2Id: { type: Schema.Types.ObjectId, ref: 'Person', required: true, index: true },
    type: {
      type: String,
      enum: Object.values(RelationshipType),
      required: true,
      index: true,
    },

    // ParentChild specific
    parentalRole: {
      type: String,
      enum: Object.values(ParentalRole),
      required: function (this: IRelationship) {
        return this.type === RelationshipType.ParentChild || this.type === RelationshipType.GuardianChild;
      },
    },

    // Spousal specific
    status: {
      type: String,
      enum: Object.values(SpousalStatus),
      required: function (this: IRelationship) {
        return this.type === RelationshipType.Spousal;
      },
    },
    startDate: { type: Date }, // Relevant for Spousal, could be used for others too
    endDate: { type: Date },   // Relevant for Spousal, could be used for others too

    notes: { type: String },
    events: [RelationshipEventSchema],
  },
  { timestamps: true }
);

// Ensure person1Id and person2Id are not the same
RelationshipSchema.pre<IRelationship>('save', function (next) {
  if (this.person1Id.equals(this.person2Id)) {
    next(new Error('person1Id and person2Id cannot be the same.'));
  } else {
    // Ensure consistent ordering for certain relationship types to simplify querying if needed,
    // e.g., for Sibling or Spousal, store the smaller ObjectId in person1Id.
    // This is optional and depends on query patterns. For now, not enforcing.
    // if ((this.type === RelationshipType.Sibling || this.type === RelationshipType.Spousal) &&
    //     this.person1Id.toHexString() > this.person2Id.toHexString()) {
    //   [this.person1Id, this.person2Id] = [this.person2Id, this.person1Id];
    // }
    next();
  }
});

// Compound index to prevent duplicate relationships of the same type between the same two people
// Note: For spousal relationships, this might need adjustment if multiple 'Married' relationships
// are allowed over time (e.g., remarrying the same person). The status and dates would differentiate.
// Consider if a partial unique index based on type and status is more appropriate for some types.
RelationshipSchema.index({ familyTreeId: 1, person1Id: 1, person2Id: 1, type: 1 }, { unique: true, partialFilterExpression: { type: { $in: [RelationshipType.Sibling, RelationshipType.StepSibling, RelationshipType.HalfSibling, RelationshipType.AdoptiveSibling, RelationshipType.FosterSibling] } } });
// For ParentChild, a child should only have one biological mother/father type relationship with a given parent.
RelationshipSchema.index({ familyTreeId: 1, person2Id: 1, type: 1, parentalRole: 1 }, { unique: true, partialFilterExpression: { type: RelationshipType.ParentChild, parentalRole: { $in: [ParentalRole.BiologicalMother, ParentalRole.BiologicalFather]}} });


// Static methods for common queries (examples)
RelationshipSchema.statics.findParents = async function (personId: Types.ObjectId, familyTreeId: Types.ObjectId) {
  return this.find({
    familyTreeId,
    person2Id: personId, // person2Id is the child
    type: { $in: [RelationshipType.ParentChild, RelationshipType.GuardianChild] }
  }).populate('person1Id', 'firstName lastName profilePhotoUrl gender'); // person1Id is the parent/guardian
};

RelationshipSchema.statics.findChildren = async function (personId: Types.ObjectId, familyTreeId: Types.ObjectId) {
  return this.find({
    familyTreeId,
    person1Id: personId, // person1Id is the parent/guardian
    type: { $in: [RelationshipType.ParentChild, RelationshipType.GuardianChild] }
  }).populate('person2Id', 'firstName lastName profilePhotoUrl gender'); // person2Id is the child
};

RelationshipSchema.statics.findSpouses = async function (personId: Types.ObjectId, familyTreeId: Types.ObjectId) {
  return this.find({
    familyTreeId,
    type: RelationshipType.Spousal,
    $or: [{ person1Id: personId }, { person2Id: personId }],
  }).populate([
    { path: 'person1Id', select: 'firstName lastName profilePhotoUrl gender' },
    { path: 'person2Id', select: 'firstName lastName profilePhotoUrl gender' }
  ]);
};

// For findSpouses, to get the actual spouse object easily:
RelationshipSchema.methods.getOtherSpouse = function (personId: Types.ObjectId) {
  if (this.type !== RelationshipType.Spousal) return null;
  if (this.person1Id.equals(personId)) return this.person2Id;
  if (this.person2Id.equals(personId)) return this.person1Id;
  return null;
};


RelationshipSchema.statics.findSiblings = async function (personId: Types.ObjectId, familyTreeId: Types.ObjectId) {
  // This is a more complex query. Siblings share at least one parent.
  // 1. Find all parents of personId
  const parentsRel = await this.find({ familyTreeId, person2Id: personId, type: RelationshipType.ParentChild }).select('person1Id');
  const parentIds = parentsRel.map(r => r.person1Id);

  if (parentIds.length === 0) return [];

  // 2. Find all children of these parents (excluding personId itself)
  const siblingsRel = await this.find({
    familyTreeId,
    person1Id: { $in: parentIds }, // person1Id is a parent
    person2Id: { $ne: personId },  // person2Id is a child, not the original person
    type: RelationshipType.ParentChild
  }).distinct('person2Id'); // Get distinct sibling IDs

  // 3. (Alternative/Direct Sibling Type) Query for direct sibling relationships
  const directSiblings = await this.find({
    familyTreeId,
    type: { $in: [RelationshipType.Sibling, RelationshipType.StepSibling, RelationshipType.HalfSibling, RelationshipType.AdoptiveSibling, RelationshipType.FosterSibling] },
    $or: [{ person1Id: personId }, { person2Id: personId }]
  });

  const directSiblingIds = directSiblings.map(r => r.person1Id.equals(personId) ? r.person2Id : r.person1Id);

  // Combine and unique
  const allSiblingIds = Array.from(new Set([...siblingsRel.map(id => id.toString()), ...directSiblingIds.map(id => id.toString())]));

  // Populate sibling details
  // This part needs to be careful if Person model is not directly accessible here or to avoid circular dependencies.
  // Typically, you'd return IDs and let the service layer populate.
  // For now, returning IDs. The calling function can populate.
  return allSiblingIds; // Returns array of sibling ObjectIds
};


export const Relationship = model<IRelationship>('Relationship', RelationshipSchema);
