import mongoose, { Schema } from "mongoose";
import { referenceLinkSchema } from "./shared.schemas.js";

const projectSchema = new Schema(
  {
    name: {
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
      enum: ["draft", "active", "archived", "completed"],
      default: "active",
      index: true,
    },
    deadline: {
      type: Date,
      default: null,
    },
    tags: [{ type: String, trim: true }],
    techStack: [
      {
        name: { type: String, required: true }, // e.g., "Frontend", "Backend"
        tech: [
          {
            name: { type: String, required: true, trim: true }, // e.g., "Next.js"
            description: { type: String, trim: true, default: "" }, // e.g., "Used for SSR and unified routing"
          },
        ],
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    links: [referenceLinkSchema],

    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      default: null,
    },

    // ── SaaS fields — uncomment when ready ───────────────────────────────────
    // workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", default: null },
    // tenantId:    { type: Schema.Types.ObjectId, ref: "Tenant",    default: null },
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Unique project name per user
projectSchema.index({ name: 1, createdBy: 1 }, { unique: true });

// Fast lookup: all projects for a user filtered by status
projectSchema.index({ createdBy: 1, status: 1 });

// ─── Cascade Delete ───────────────────────────────────────────────────────────
// When a project is deleted, remove all associated Features, ProjectDiaries,
// and Comments linked to those features

projectSchema.pre("deleteOne", { document: true, query: false }, async function (next) {
  try {
    const Feature = mongoose.model("Feature");
    const ProjectDiary = mongoose.model("ProjectDiary");
    const Comment = mongoose.model("Comment");

    // Get all feature IDs for this project to cascade-delete their comments
    const features = await Feature.find({ projectId: this._id }).select("_id");
    const featureIds = features.map((f) => f._id);

    if (featureIds.length > 0) {
      await Comment.deleteMany({ featureId: { $in: featureIds } });
    }

    await Feature.deleteMany({ projectId: this._id });
    await ProjectDiary.deleteMany({ projectId: this._id });

    next();
  } catch (err) {
    next(err);
  }
});

// Also handle findOneAndDelete and findByIdAndDelete
projectSchema.pre(["findOneAndDelete", "deleteMany"], async function (next) {
  try {
    const Feature = mongoose.model("Feature");
    const ProjectDiary = mongoose.model("ProjectDiary");
    const Comment = mongoose.model("Comment");

    const projectsToDelete = await this.model.find(this.getQuery()).select("_id");
    const projectIds = projectsToDelete.map((p) => p._id);

    if (projectIds.length > 0) {
      // Get all feature IDs across these projects
      const features = await Feature.find({ projectId: { $in: projectIds } }).select("_id");
      const featureIds = features.map((f) => f._id);

      if (featureIds.length > 0) {
        await Comment.deleteMany({ featureId: { $in: featureIds } });
      }

      await Feature.deleteMany({ projectId: { $in: projectIds } });
      await ProjectDiary.deleteMany({ projectId: { $in: projectIds } });
    }

    next();
  } catch (err) {
    next(err);
  }
});

export const Project = mongoose.model("Project", projectSchema);
