import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IInvitation extends Document {
  familyTreeId: mongoose.Types.ObjectId;
  inviterUserId: string;
  inviteeEmail: string;
  inviteeUserId?: string;
  permissionLevel: 'viewer' | 'editor';
  status: 'pending' | 'accepted' | 'declined' | 'revoked';
  token: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InvitationSchema: Schema<IInvitation> = new Schema(
  {
    familyTreeId: {
      type: Schema.Types.ObjectId,
      ref: 'FamilyTree',
      required: true,
      index: true,
    },
    inviterUserId: {
      type: String,
      required: true,
      index: true,
    },
    inviteeEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    inviteeUserId: {
      // This will be filled when the invitee, if already a user, accepts the invitation,
      // or if we can identify them as an existing user upfront.
      type: String,
      optional: true,
      index: true,
    },
    permissionLevel: {
      type: String,
      enum: ['viewer', 'editor'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'revoked'],
      default: 'pending',
      index: true,
    },
    token: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
      // Example: default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      // This default should ideally be set during creation logic, not in schema default for more control.
    },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt
);

// Compound index to quickly find pending invitations for a tree and email
InvitationSchema.index({ familyTreeId: 1, inviteeEmail: 1, status: 1 });

// TTL index for automatic cleanup of expired 'pending' or 'revoked' invitations (optional but good practice)
// This creates an index that MongoDB can use to automatically delete documents after a certain time.
// Only apply this if you are sure about the auto-deletion behavior for your use case.
// For 'pending' invites, this can be useful.
InvitationSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, partialFilterExpression: { status: { $in: ['pending', 'revoked'] } } }
);


const Invitation: Model<IInvitation> = mongoose.model<IInvitation>('Invitation', InvitationSchema);

export { Invitation };
