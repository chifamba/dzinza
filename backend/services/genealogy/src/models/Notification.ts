import mongoose, { Document, Schema, Model } from 'mongoose';

export type NotificationType =
  | 'new_collaborator'
  | 'event_update'
  | 'new_comment'
  | 'invitation_accepted'
  | 'role_changed'
  | 'event_created_in_shared_tree'; // Example generic type

export interface INotification extends Document {
  userId: string; // References User ID from auth service, not a local Mongoose ref unless User model is in this service
  type: NotificationType;
  title: string;
  message?: string;
  link?: string;
  isRead: boolean;
  resourceId?: string; // e.g., FamilyTree ID, Event ID, Comment ID
  resourceType?: string; // e.g., 'FamilyTree', 'Event', 'Comment'
  actorId?: string; // User ID of the person who triggered the notification
  actorName?: string; // Denormalized name for quick display
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema<INotification> = new Schema(
  {
    userId: {
      type: String, // Storing as String, assuming User IDs are managed by an auth service.
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['new_collaborator', 'event_update', 'new_comment', 'invitation_accepted', 'role_changed', 'event_created_in_shared_tree'],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      optional: true,
      trim: true,
    },
    link: {
      // e.g., /family-trees/{resourceId} or /events/{resourceId}
      type: String,
      optional: true,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    resourceId: { // ID of the primary resource related to the notification
      type: String,
      optional: true,
      index: true,
    },
    resourceType: { // Type of the primary resource
      type: String,
      optional: true,
      trim: true,
    },
    actorId: { // User ID of the person who initiated the action causing the notification
      type: String,
      optional: true,
      index: true,
    },
    actorName: { // Denormalized name of the actor for easy display
      type: String,
      optional: true,
      trim: true,
    },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt
);

// Compound index for querying user's notifications, optionally by read status
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, createdAt: -1 }); // For fetching all user notifications sorted

const Notification: Model<INotification> = mongoose.model<INotification>('Notification', NotificationSchema);

export { Notification };
