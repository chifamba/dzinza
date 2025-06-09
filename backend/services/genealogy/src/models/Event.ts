import mongoose, { Schema, Document } from 'mongoose';

export interface IEvent extends Document {
  _id: string; // Mongoose default
  userId: string; // Represents the user who created the event.
  familyTreeId?: string; // Associates the event with a specific family tree.
  title: string;
  content: string; // For rich text, e.g., HTML or JSON for Delta
  date?: Date; // The date of the event.
  endDate?: Date; // For events that span a period.
  place?: {
    name: string; // User-friendly place name
    latitude?: number;
    longitude?: number;
    address?: string;
  };
  relatedPersons: string[]; // IDs of persons involved.
  associatedMediaIds: string[]; // IDs of media items linked.
  tags: string[];
  category?: string; // e.g., "Birth", "Marriage", "Death", "Story", "General".
  privacy: 'public' | 'private' | 'family'; // Default: 'private'
  createdAt: Date; // Mongoose default
  updatedAt: Date; // Mongoose default
}

const EventSchema = new Schema<IEvent>({
  userId: { type: String, required: true, index: true },
  familyTreeId: { type: String, index: true },
  title: { type: String, required: true },
  content: { type: String, required: true }, // Consider making this more flexible if using JSON for Delta
  date: { type: Date, index: true },
  endDate: { type: Date },
  place: {
    name: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String },
  },
  relatedPersons: [{ type: String, index: true, default: [] }],
  associatedMediaIds: [{ type: String, index: true, default: [] }],
  tags: [{ type: String, index: true, default: [] }],
  category: { type: String, index: true },
  privacy: {
    type: String,
    enum: ['public', 'private', 'family'],
    default: 'private',
    index: true
  },
}, {
  timestamps: true, // This will add createdAt and updatedAt fields
});

// Compound indexes can be added here if needed, for example:
// EventSchema.index({ userId: 1, familyTreeId: 1 });
// EventSchema.index({ userId: 1, date: -1 });

export const Event = mongoose.model<IEvent>('Event', EventSchema);
