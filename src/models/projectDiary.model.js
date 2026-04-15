import mongoose, { Schema } from "mongoose";
import {
  questionSchema,
  referenceLinkSchema,
  diaryFeatureSchema,
} from "./shared.schemas.js";

// ─── Main Schema ──────────────────────────────────────────────────────────────

const projectDiarySchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxLength: 150,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxLength: 2000,
    },

    // ── Ownership ─────────────────────────────────────────────────────────────
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ── Status & Workflow ────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ["idea", "scoping", "in-progress", "completed", "archived"],
      default: "idea",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    // ── Content ──────────────────────────────────────────────────────────────
    questions: [questionSchema],

    userFlow: [
      {
        flow: {
          type: String,
          trim: true,
        },
      },
    ],
    ideas: [
      {
        idea: {
          type: String,
          trim: true,
        },
      },
    ],
    projectUpdate: [
      {
        update: {
          type: String,
          trim: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    features: [diaryFeatureSchema],

    // ── Links to real Feature docs ────────────────────────────────────────────
    // Populated when a diaryFeature graduates into a real Feature
    spawnedFeatures: [{ type: Schema.Types.ObjectId, ref: "Feature" }],

    // ── Metadata ──────────────────────────────────────────────────────────────
    tags: [{ type: String, trim: true }],
    referenceLinks: [referenceLinkSchema],
    techStack: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Fetch all diaries for a project filtered by status
projectDiarySchema.index({ projectId: 1, status: 1 });

// List newest diary first
projectDiarySchema.index({ projectId: 1, createdAt: -1 });

export const ProjectDiary = mongoose.model("ProjectDiary", projectDiarySchema);
