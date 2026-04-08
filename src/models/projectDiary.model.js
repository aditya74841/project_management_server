import mongoose, { Schema } from "mongoose";

// ─── Sub-Schemas ──────────────────────────────────────────────────────────────

const questionSchema = new Schema(
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
    },
    { _id: true, timestamps: true }
);

const diaryFeatureSchema = new Schema(
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
        update: [{ type: String, trim: true }],
        status: {
            type: String,
            enum: ["pending", "in-progress", "completed"],
            default: "pending",
        },
    },
    { _id: true, timestamps: true }
);

const referenceLinkSchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        url: {
            type: String,
            required: true,
            trim: true,
            match: [/^https?:\/\/.+/, "Please enter a valid HTTP/HTTPS URL"],
        },
    },
    { _id: true }
);

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

        // ── Ownership & Context ──────────────────────────────────────────────────
        projectId: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            default: null,
            index: true, // quickly fetch all diaries for a project
        },
        companyId: {
            type: Schema.Types.ObjectId,
            ref: "Company",
            default: null,
            index: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
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
                    required: true,
                    trim: true,
                },
            },
        ],
        ideas: [
            {
                idea: {
                    type: String,
                    // required: true,
                    trim: true,
                },
            },
        ],
        projectUpdate: [
            {
                update: {
                    type: String,
                    // required: true,
                    trim: true,
                },
            },
        ],

        features: [diaryFeatureSchema],

        // ── Metadata ─────────────────────────────────────────────────────────────
        tags: [{ type: String, trim: true }],
        referenceLinks: [referenceLinkSchema],
        techStack: [{ type: String, trim: true }],
    },
    { timestamps: true }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// Fetch all diaries for a project filtered by status eficiently
projectDiarySchema.index({ projectId: 1, status: 1 });

// Fetch all diaries for a company filtered by status eficiently
projectDiarySchema.index({ companyId: 1, status: 1 });

export const ProjectDiary = mongoose.model("ProjectDiary", projectDiarySchema);
