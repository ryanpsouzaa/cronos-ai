import mongoose from "mongoose";

export type ResourceStatus = "pending" | "processing" | "done" | "error";

export interface IResource {
  userId: mongoose.Types.ObjectId;
  originalName: string;
  mimeType: string;
  size: number;
  minioKey: string;
  status: ResourceStatus;
  errorMessage?: string;
  vectorCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const resourceSchema = new mongoose.Schema<IResource>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
    originalName: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    minioKey: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "processing", "done", "error"],
      default: "pending",
    },
    errorMessage: { type: String },
    vectorCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

resourceSchema.index({ userId: 1, status: 1 });

export const Resource = mongoose.model<IResource>("Resource", resourceSchema);
