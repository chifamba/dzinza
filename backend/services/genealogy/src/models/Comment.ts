import mongoose, { Document, Schema, Model } from 'mongoose';

export type CommentResourceType = 'Event' | 'Story'; // Initially 'Event', 'Story' can be for future use

export interface IComment extends Document {
  resourceId: mongoose.Types.ObjectId; // ID of the Event/Story being commented on
  resourceType: CommentResourceType;
  userId: string; // User ID from auth service
  userName: string; // Denormalized from req.user at creation
  userProfileImageUrl?: string; // Denormalized from req.user at creation
  content: string;
  parentId?: mongoose.Types.ObjectId; // For threaded replies
  edited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema: Schema<IComment> = new Schema(
  {
    resourceId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
      // No 'ref' here as resourceType determines the collection to reference dynamically if needed.
      // Or, if you always know it's one of a few, you could use dynamic refs,
      // but for querying, resourceId + resourceType is usually sufficient.
    },
    resourceType: {
      type: String,
      enum: ['Event', 'Story'], // Add other types as needed
      required: true,
      index: true,
    },
    userId: {
      type: String, // From auth service
      required: true,
      index: true,
    },
    userName: {
      type: String,
      required: true, // Denormalized from req.user
    },
    userProfileImageUrl: {
      type: String,
      optional: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 2000,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Comment', // Self-reference for threading
      optional: true,
      index: true,
    },
    edited: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Compound index for fetching comments for a resource, sorted by creation time
CommentSchema.index({ resourceId: 1, resourceType: 1, createdAt: 1 });
// Index for fetching replies to a parent comment
CommentSchema.index({ parentId: 1, createdAt: 1 });

const Comment: Model<IComment> = mongoose.model<IComment>('Comment', CommentSchema);

export { Comment };
