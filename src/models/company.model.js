import mongoose, { Schema } from "mongoose";

const companySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true }, // superAdmin who created
    users: [{ type: Schema.Types.ObjectId, ref: "User" }], // all company members
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    domain: { type: String, trim: true }, // e.g. for "company.com" emails
  },
  { timestamps: true }
);

export const Company = mongoose.model("Company", companySchema);
