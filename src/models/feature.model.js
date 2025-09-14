import mongoose, { Schema } from "mongoose";

const featureSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "working", "completed", "blocked"],
      default: "pending",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "low",
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedTo: [
      // 👈 Multiple users can be assigned
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    deadline: {
      type: Date,
      default: null,
    },
    tags: [String],

    comments: [
      // 👈 New comments field
      {
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
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isCompleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index for queries like "all completed features of a project"
featureSchema.index({ projectId: 1, status: 1 });

export const Feature = mongoose.model("Feature", featureSchema);
