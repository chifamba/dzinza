import mongoose, { Document, Schema } from "mongoose";

export interface INotification extends Document {
  userId: string; // User to notify
  type: string; // e.g. 'merge_suggestion', 'info', etc.
  message: string;
  data?: Record<string, any>; // Optional payload for frontend actions
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  userId: { type: String, required: true, index: true },
  type: { type: String, required: true },
  message: { type: String, required: true },
  data: { type: Schema.Types.Mixed },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<INotification>(
  "Notification",
  NotificationSchema
);
