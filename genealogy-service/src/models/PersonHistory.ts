import { Schema, model, Document, Types } from "mongoose";

export interface IPersonHistory extends Document {
  personId: Types.ObjectId;
  version: number;
  data: any; // Snapshot of the person document
  changedBy: Types.ObjectId;
  changeType: "create" | "update" | "merge" | "delete" | "revert";
  createdAt: Date;
}

const PersonHistorySchema = new Schema<IPersonHistory>({
  personId: { type: Schema.Types.ObjectId, ref: "Person", required: true },
  version: { type: Number, required: true },
  data: { type: Schema.Types.Mixed, required: true },
  changedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  changeType: {
    type: String,
    enum: ["create", "update", "merge", "delete", "revert"],
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

export const PersonHistory = model<IPersonHistory>(
  "PersonHistory",
  PersonHistorySchema
);
