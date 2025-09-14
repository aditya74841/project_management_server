import mongoose, { Schema } from "mongoose";

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
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
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
    features: [
      {
        type: Schema.Types.ObjectId,
        ref: "Feature",
      },
    ],

    isShown: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Ensure unique project names per company
projectSchema.index({ name: 1, companyId: 1 }, { unique: true });

export const Project = mongoose.model("Project", projectSchema);
