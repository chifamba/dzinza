import mongoose, { Document, Schema, Model } from 'mongoose';

export type FlaggedResourceType = 'Event' | 'Comment';
export type FlagReason = 'spam' | 'offensive' | 'hate_speech' | 'misinformation' | 'illegal' | 'other';
export type FlagStatus = 'pending_review' | 'resolved_no_action' | 'resolved_content_hidden' | 'resolved_content_deleted';

export interface IFlaggedContent extends Document {
  resourceId: mongoose.Types.ObjectId; // ID of the Event or Comment
  resourceType: FlaggedResourceType;
  reportedByUserId: string; // User ID from auth service
  reason: FlagReason;
  customReason?: string;
  status: FlagStatus;
  moderatorUserId?: string; // User ID of the admin/moderator who resolved the flag
  moderatorNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FlaggedContentSchema: Schema<IFlaggedContent> = new Schema(
  {
    resourceId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
      // Note: No 'ref' here as it depends on 'resourceType'.
      // Dynamic population can be done in queries if needed.
    },
    resourceType: {
      type: String,
      enum: ['Event', 'Comment'],
      required: true,
      index: true,
    },
    reportedByUserId: {
      type: String, // From auth service
      required: true,
      index: true,
    },
    reason: {
      type: String,
      enum: ['spam', 'offensive', 'hate_speech', 'misinformation', 'illegal', 'other'],
      required: true,
    },
    customReason: {
      type: String,
      optional: true,
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ['pending_review', 'resolved_no_action', 'resolved_content_hidden', 'resolved_content_deleted'],
      default: 'pending_review',
      index: true,
    },
    moderatorUserId: { // User ID of admin/moderator who handled this flag
      type: String,
      optional: true,
      index: true,
    },
    moderatorNotes: {
      type: String,
      optional: true,
      trim: true,
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

// Compound index for querying flags by resource
FlaggedContentSchema.index({ resourceId: 1, resourceType: 1 });
// Compound index for querying flags by status and creation date (for review queues)
FlaggedContentSchema.index({ status: 1, createdAt: 1 });
// Index to quickly find flags by a specific user
FlaggedContentSchema.index({ reportedByUserId: 1 });


const FlaggedContent: Model<IFlaggedContent> = mongoose.model<IFlaggedContent>('FlaggedContent', FlaggedContentSchema);

export { FlaggedContent };
