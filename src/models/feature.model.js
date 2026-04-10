import mongoose, { Schema } from "mongoose";
import { questionSchema } from "./shared.schemas.js";

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
    benefits: {
      type: String,
      default: "",
      trim: true,
    },

    // ── Ownership ─────────────────────────────────────────────────────────────
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    diaryId: {
      type: Schema.Types.ObjectId,
      ref: "ProjectDiary",
      default: null, // null = created directly, not from a diary
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedTo: [{ type: Schema.Types.ObjectId, ref: "User" }],

    // ── Status ────────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ["pending", "working", "completed", "blocked"],
      default: "pending",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "low",
    },

    // ── Planning content ──────────────────────────────────────────────────────
    questions: [questionSchema],
    workflow: [{ flow: { type: String, trim: true } }],
    deadline: { type: Date, default: null },
    tags: [{ type: String, trim: true }],

    // ── SaaS fields — uncomment when ready ───────────────────────────────────
    // workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", default: null },
    // tenantId:    { type: Schema.Types.ObjectId, ref: "Tenant",    default: null },
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

featureSchema.index({ projectId: 1, status: 1 });
featureSchema.index({ projectId: 1, priority: 1 });
featureSchema.index({ diaryId: 1 }); // all features spawned from a diary

// ─── Cascade Delete ───────────────────────────────────────────────────────────
// When a feature is deleted, remove all its comments
featureSchema.pre("deleteOne", { document: true, query: false }, async function (next) {
  try {
    await mongoose.model("Comment").deleteMany({ featureId: this._id });
    next();
  } catch (err) {
    next(err);
  }
});

export const Feature = mongoose.model("Feature", featureSchema);
