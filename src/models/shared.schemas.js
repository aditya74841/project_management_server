import { Schema } from "mongoose";

// ─── questionSchema ───────────────────────────────────────────────────────────
// Shared by Feature and ProjectDiary
export const questionSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      default: "",
      trim: true,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true, timestamps: true }
);

// ─── referenceLinkSchema ──────────────────────────────────────────────────────
// Used by ProjectDiary for external reference URLs
export const referenceLinkSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
      match: [/^https?:\/\/.+/, "Please enter a valid HTTP/HTTPS URL"],
    },
  },
  { _id: true }
);

// ─── diaryFeatureSchema ───────────────────────────────────────────────────────
// Lightweight planned features inside a diary (not real Feature documents)
export const diaryFeatureSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxLength: 150,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxLength: 1000,
    },
    priority: {
      type: String,
      enum: ["musthave", "nicetohave"],
      default: "musthave",
    },
    status: {
      type: String,
      enum: ["pending", "in-progress", "completed"],
      default: "pending",
    },
    updates: [{ type: String, trim: true }],

    // Once this planned feature becomes a real Feature doc, store the ref here
    spawnedFeatureId: {
      type: Schema.Types.ObjectId,
      ref: "Feature",
      default: null,
    },
  },
  { _id: true, timestamps: true }
);
