import mongoose, { Document, Schema, Model } from 'mongoose';

export type ActivityLogActionType =
  | 'CREATE_FAMILY_TREE' | 'UPDATE_FAMILY_TREE_SETTINGS' | 'DELETE_FAMILY_TREE'
  | 'ADD_COLLABORATOR' | 'REMOVE_COLLABORATOR' | 'UPDATE_COLLABORATOR_ROLE'
  | 'ACCEPT_INVITATION' | 'DECLINE_INVITATION' | 'REVOKE_INVITATION' | 'CREATE_INVITATION'
  | 'CREATE_PERSON' | 'UPDATE_PERSON_DETAILS' | 'DELETE_PERSON'
  | 'CREATE_RELATIONSHIP' | 'UPDATE_RELATIONSHIP' | 'DELETE_RELATIONSHIP'
  | 'CREATE_EVENT' | 'UPDATE_EVENT' | 'DELETE_EVENT'
  // Future types can be added here
  | 'USER_LOGIN' | 'USER_LOGOUT' // Example generic types
  | 'UPLOAD_MEDIA' | 'DELETE_MEDIA'
  | 'COMMENT_ADDED';


export interface IActivityLog extends Document {
  userId: string; // User who performed the action.
  userName?: string; // Denormalized name of the user.
  actionType: ActivityLogActionType;
  familyTreeId?: mongoose.Types.ObjectId; // Optional, but indexed if present
  targetResourceId?: string; // ID of the affected resource (e.g., PersonID, EventID, FamilyTreeID itself)
  targetResourceType?: string; // e.g., 'Person', 'Event', 'FamilyTree', 'Collaborator'
  targetResourceName?: string; // Denormalized name of the target resource (e.g., Person's name, Event title)
  changesPreview?: string; // Brief summary of changes, e.g., "Updated name from 'Old' to 'New'".
  details?: string; // Human-readable summary of the action.
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date; // Though typically activity logs are immutable, timestamps include it.
}

const ActivityLogSchema: Schema<IActivityLog> = new Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    userName: { // Denormalized, can be populated at creation time
      type: String,
      optional: true,
    },
    actionType: {
      type: String,
      required: true,
      index: true,
      enum: [
        'CREATE_FAMILY_TREE', 'UPDATE_FAMILY_TREE_SETTINGS', 'DELETE_FAMILY_TREE',
        'ADD_COLLABORATOR', 'REMOVE_COLLABORATOR', 'UPDATE_COLLABORATOR_ROLE',
        'ACCEPT_INVITATION', 'DECLINE_INVITATION', 'REVOKE_INVITATION', 'CREATE_INVITATION',
        'CREATE_PERSON', 'UPDATE_PERSON_DETAILS', 'DELETE_PERSON',
        'CREATE_RELATIONSHIP', 'UPDATE_RELATIONSHIP', 'DELETE_RELATIONSHIP',
        'CREATE_EVENT', 'UPDATE_EVENT', 'DELETE_EVENT',
        'USER_LOGIN', 'USER_LOGOUT', 'UPLOAD_MEDIA', 'DELETE_MEDIA', 'COMMENT_ADDED'
      ],
    },
    familyTreeId: {
      type: Schema.Types.ObjectId,
      ref: 'FamilyTree',
      optional: true,
      index: true,
    },
    targetResourceId: { // e.g., Person ID, Event ID, or even FamilyTree ID if action is on the tree itself
      type: String,
      optional: true,
      index: true,
    },
    targetResourceType: { // e.g., 'Person', 'Event', 'FamilyTree'
      type: String,
      optional: true,
    },
    targetResourceName: { // e.g., Person's name "John Doe", Event's title "Family Reunion"
        type: String,
        optional: true,
        trim: true,
    },
    changesPreview: { // e.g., "Updated privacy from Public to Private"
      type: String,
      optional: true,
      trim: true,
    },
    details: { // e.g., "User John Doe updated family tree settings."
      type: String,
      optional: true,
      trim: true,
    },
    ipAddress: {
      type: String,
      optional: true,
    },
    userAgent: {
      type: String,
      optional: true,
    },
  },
  { timestamps: true }
);

// Compound index for querying by familyTreeId and actionType, sorted by date
ActivityLogSchema.index({ familyTreeId: 1, actionType: 1, createdAt: -1 });
// Index for user-specific activity
ActivityLogSchema.index({ userId: 1, createdAt: -1 });

const ActivityLog: Model<IActivityLog> = mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);

export { ActivityLog };
