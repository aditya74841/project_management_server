import mongoose, { Schema } from "mongoose";

const commentSchema = new Schema(
  {
    featureId: {
      type: Schema.Types.ObjectId,
      ref: "Feature",
      required: true,
      index: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// List comments on a feature, newest first
commentSchema.index({ featureId: 1, createdAt: -1 });

export const Comment = mongoose.model("Comment", commentSchema);
