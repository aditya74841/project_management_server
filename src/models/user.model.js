import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import crypto from "crypto";

import jwt from "jsonwebtoken";
import {
  AvailableSocialLogins,
  AvailableUserRoles,
  USER_TEMPORARY_TOKEN_EXPIRY,
  UserLoginType,
  UserRolesEnum,
} from "../constants.js";

const userSchema = new Schema({
  name: {
    type: String,
    default: "",
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  username: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
  },
  phoneNumber: {
    type: String,
    // unique: true,
    // minlength: 10,
    // maxlength: 10,
    // match: [/^\d{10}$/, "Please fill a valid phone number (10 digits)"],
    default: "",
  },
  password: {
    type: String,
    required: [true, "Password is required"],
  },
  companyId: {
    type: Schema.Types.ObjectId,
    ref: "Company",
    default: null,
  },
  role: {
    type: String,
    enum: AvailableUserRoles,
    default: UserRolesEnum.USER,
    required: true,
  },
  loginType: {
    type: String,
    enum: AvailableSocialLogins,
    default: UserLoginType.EMAIL_PASSWORD,
  },

  avatar: {
    type: {
      url: String,
      localPath: String,
    },
    default: {
      url: `https://via.placeholder.com/200x200.png`,
      localPath: "",
    },
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  refreshToken: {
    type: String,
  },
  forgotPasswordToken: {
    type: String,
  },
  forgotPasswordExpiry: {
    type: Date,
  },
  emailVerificationToken: {
    type: String,
  },
  emailVerificationExpiry: {
    type: Date,
  },
  // Future: personal workspace/tenant for seamless upgrade to SaaS
  // personalWorkspaceId: {
  //   type: Schema.Types.ObjectId,
  //   ref: "Workspace",
  //   default: null,
  // }, // optional
  // Future: memberships in shared workspaces with roles
  // workspaceMemberships: [
  //   {
  //     workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace" },
  //     role: { type: String, trim: true }, // e.g., OWNER, ADMIN, EDITOR, VIEWER
  //   },
  // ],
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      role: this.role,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "7d" }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "10d" }
  );
};

userSchema.methods.generateTemporaryToken = function () {
  // This token should be client facing
  // for example: for email verification unHashedToken should go into the user's mail
  const unHashedToken = crypto.randomBytes(20).toString("hex");

  // This should stay in the DB to compare at the time of verification
  const hashedToken = crypto
    .createHash("sha256")
    .update(unHashedToken)
    .digest("hex");
  // This is the expiry time for the token (20 minutes)
  const tokenExpiry = Date.now() + USER_TEMPORARY_TOKEN_EXPIRY;

  return { unHashedToken, hashedToken, tokenExpiry };
};

export const User = mongoose.model("User", userSchema);




// // models/user.model.js
// import mongoose, { Schema } from "mongoose";
// import bcrypt from "bcrypt";
// import crypto from "crypto";
// import jwt from "jsonwebtoken";
// import {
//   AvailableSocialLogins,
//   AvailableUserRoles,
//   USER_TEMPORARY_TOKEN_EXPIRY,
//   UserLoginType,
//   UserRolesEnum,
// } from "../constants.js";

// const userSchema = new Schema({
//   name: { type: String, default: "" },
//   email: { type: String, required: true, unique: true, lowercase: true, trim: true },
//   username: { type: String, unique: true, lowercase: true, trim: true },
//   phoneNumber: { type: String, default: "" },
//   password: { type: String, required: [true, "Password is required"] },
//   companyId: { type: Schema.Types.ObjectId, ref: "Company", default: null },
//   role: { type: String, enum: AvailableUserRoles, default: UserRolesEnum.USER, required: true },
//   loginType: { type: String, enum: AvailableSocialLogins, default: UserLoginType.EMAIL_PASSWORD },
//   avatar: {
//     type: { url: String, localPath: String },
//     default: { url: "", localPath: "" },
//   },
//   isEmailVerified: { type: Boolean, default: false },
//   // Store only a hash of the refresh token
//   refreshTokenHash: { type: String },
//   forgotPasswordToken: { type: String },
//   forgotPasswordExpiry: { type: Date },
//   emailVerificationToken: { type: String },
//   emailVerificationExpiry: { type: Date },
// }, { timestamps: true });

// userSchema.pre("save", async function (next) {
//   if (!this.isModified("password")) return next();
//   this.password = await bcrypt.hash(this.password, 10);
//   next();
// });

// // Defensive: if any code uses findOneAndUpdate on password, hash it here.
// // Prefer changing passwords via doc.save() so pre('save') always runs.
// userSchema.pre("findOneAndUpdate", async function (next) {
//   const update = this.getUpdate() || {};
//   const password = update.password || update.$set?.password;
//   if (!password) return next();
//   const hashed = await bcrypt.hash(password, 10);
//   if (update.$set?.password) {
//     update.$set.password = hashed;
//   } else {
//     update.password = hashed;
//   }
//   this.setUpdate(update);
//   next();
// });

// userSchema.methods.isPasswordCorrect = async function (password) {
//   return await bcrypt.compare(password, this.password);
// };

// userSchema.methods.generateAccessToken = function () {
//   return jwt.sign(
//     { _id: this._id, email: this.email, username: this.username, role: this.role },
//     process.env.ACCESS_TOKEN_SECRET,
//     { expiresIn: "7d" }
//   );
// };

// userSchema.methods.generateRefreshToken = function () {
//   return jwt.sign({ _id: this._id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "10d" });
// };

// userSchema.methods.generateTemporaryToken = function () {
//   const unHashedToken = crypto.randomBytes(20).toString("hex");
//   const hashedToken = crypto.createHash("sha256").update(unHashedToken).digest("hex");
//   const tokenExpiry = Date.now() + USER_TEMPORARY_TOKEN_EXPIRY;
//   return { unHashedToken, hashedToken, tokenExpiry };
// };

// export const User = mongoose.model("User", userSchema);
