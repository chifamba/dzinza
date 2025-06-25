import { Schema, model, Document, Types } from "mongoose";

export interface IMergeSuggestion extends Document {
  newPersonId: Types.ObjectId;
  existingPersonId: Types.ObjectId;
  confidence: number;
  status: "pending" | "accepted" | "declined";
  createdBy?: Types.ObjectId; // Made optional
  notifiedUsers: Types.ObjectId[];
  previewTree?: any; // JSON snapshot of the new person's subtree
  createdAt: Date;
  updatedAt: Date;
}

const MergeSuggestionSchema = new Schema<IMergeSuggestion>(
  {
    newPersonId: { type: Schema.Types.ObjectId, ref: "Person", required: true },
    existingPersonId: {
      type: Schema.Types.ObjectId,
      ref: "Person",
      required: true,
    },
    confidence: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: false }, // Allow null for now
    notifiedUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    previewTree: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const MergeSuggestion = model<IMergeSuggestion>(
  "MergeSuggestion",
  MergeSuggestionSchema
);
