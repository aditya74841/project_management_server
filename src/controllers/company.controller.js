import { UserRolesEnum } from "../constants.js";
import { Company } from "../models/company.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";

const isValidObjectId = (id) => {
  if (!id) return false;
  
  // Check if it's a valid ObjectId format
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return false;
  }
  
  // Additional check: ensure string representation matches original
  // This prevents cases like "123456789012" being considered valid
  return String(new mongoose.Types.ObjectId(id)) === String(id);
};


const createCompany = asyncHandler(async (req, res) => {
  const { name, email, domain = null } = req.body;


  if(!email)
  {

  }


  // Check if company already exists
  const existedCompany = await Company.findOne({ email });
  if (existedCompany) {
    throw new ApiError(409, "Company with this email already exists", []);
  }

  const company = await Company.create({
    name,
    email,
    domain: domain || null,
    owner: req.user._id, // 👈 assuming user is authenticated (superAdmin)
    users: [req.user._id], // 👈 owner is also the first member
  });

  const createdCompany = await Company.findById(company._id)
    .populate("owner", "name email role")
    .populate("users", "name email role");

  if (!createdCompany) {
    throw new ApiError(500, "Something went wrong while creating the company");
  }

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { company: createdCompany },
        "Company created successfully"
      )
    );
});

const getCompanyById = asyncHandler(async (req, res) => {
  const { companyId } = req.params;

  const company = await Company.findById(companyId)
    .populate("owner", "name email role")
    .populate("users", "name email role");

  if (!company) {
    throw new ApiError(404, "Company not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { company }, "Company fetched successfully"));
});

const getAllCompanies = asyncHandler(async (req, res) => {
  const companies = await Company.find()
    .populate("owner", "name email role")
    .populate("users", "name email role");

  return res
    .status(200)
    .json(
      new ApiResponse(200, { companies }, "Companies fetched successfully")
    );
});

const updateCompany = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { name, domain, status, email } = req.body;

  let company = await Company.findById(companyId);
  if (!company) {
    throw new ApiError(404, "Company not found");
  }

  // Only owner or superAdmin can update
  if (
    String(company.owner) !== String(req.user._id) &&
    req.user.role !== "superAdmin"
  ) {
    throw new ApiError(403, "You are not authorized to update this company");
  }

  company.name = name || company.name;
  company.domain = domain || company.domain;
  company.status = status || company.status;
  company.email = email || company.email;

  await company.save();

  company = await Company.findById(companyId)
    .populate("owner", "name email role")
    .populate("users", "name email role");

  return res
    .status(200)
    .json(new ApiResponse(200, { company }, "Company updated successfully"));
});

const deleteCompany = asyncHandler(async (req, res) => {
  const { companyId } = req.params;

  const company = await Company.findById(companyId);
  if (!company) {
    throw new ApiError(404, "Company not found");
  }

  // Only owner or superAdmin can delete
  if (
    String(company.owner) !== String(req.user._id) &&
    req.user.role !== "superAdmin"
  ) {
    throw new ApiError(403, "You are not authorized to delete this company");
  }

  await company.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Company deleted successfully"));
});

const ALLOWED_ROLES = [UserRolesEnum.ADMIN, UserRolesEnum.USER];

const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, companyId } = req.body;

  // Input validation
  if (!name?.trim()) {
    throw new ApiError(400, "Name is required", []);
  }

  if (!email?.trim()) {
    throw new ApiError(400, "Email is required", []);
  }

  if (!password?.trim()) {
    throw new ApiError(400, "Password is required", []);
  }

  if (!role) {
    throw new ApiError(400, "Role is required", []);
  }

  if (!companyId) {
    throw new ApiError(400, "Company ID is required", []);
  }

  // MongoDB ObjectId validation for companyId
  if (!isValidObjectId(companyId)) {
    throw new ApiError(400, "Invalid Company ID format. Must be a valid MongoDB ObjectId", []);
  }

  // Role validation - Only ADMIN or USER allowed
  if (!ALLOWED_ROLES.includes(role)) {
    throw new ApiError(400, "Invalid role. Role must be ADMIN or USER only", []);
  }

  // Check if user already exists
  const existedUser = await User.findOne({ email: email.toLowerCase().trim() });
  if (existedUser) {
    throw new ApiError(409, "User with this email already exists", []);
  }

  // Validate company existence
  const company = await Company.findById(companyId);
  if (!company) {
    throw new ApiError(404, "Company not found or invalid", []);
  }

  // Check if company is active (optional business logic)
  if (company.status === 'suspended') {
    throw new ApiError(403, "Cannot create users for suspended companies", []);
  }

  // Create username from email
  const username = email.split('@')[0].toLowerCase();

  // Check if username already exists (optional uniqueness check)
  const existingUsername = await User.findOne({ username });
  let finalUsername = username;
  if (existingUsername) {
    finalUsername = `${username}_${Date.now()}`;
  }

  // Create user with validated data
  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password, // Will be hashed by the model's pre-save middleware
    username: finalUsername,
    isEmailVerified: false,
    role, // Already validated above
    companyId: new mongoose.Types.ObjectId(companyId), // Convert to ObjectId
  });

  if (!user) {
    throw new ApiError(500, "Something went wrong while creating the user", []);
  }

  // Add user to company's users array
  if (!company.users.includes(user._id)) {
    company.users.push(user._id);
    await company.save();
  }

  // Get created user without sensitive fields
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationExpiry"
  );

  return res.status(201).json(
    new ApiResponse(
      201, 
      { 
        user: createdUser,
        company: {
          id: company._id,
          name: company.name,
          totalUsers: company.users.length
        }
      }, 
      "User created successfully"
    )
  );
});


const changeUserRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { newRole } = req.body;
console.log("THE user Id",userId)

  // Input validation
  if (!userId) {
    throw new ApiError(400, "User ID is required", []);
  }

  if (!newRole) {
    throw new ApiError(400, "New role is required", []);
  }

  // MongoDB ObjectId validation for userId
  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid User ID format. Must be a valid MongoDB ObjectId", []);
  }

  // Role validation - Only ADMIN or USER allowed
  if (!ALLOWED_ROLES.includes(newRole)) {
    throw new ApiError(400, "Invalid role. Role must be ADMIN or USER only", []);
  }

  // Find user by ID
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found", []);
  }

  // Check if the new role is the same as current role
  if (user.role === newRole) {
    throw new ApiError(400, `User already has ${newRole} role`, []);
  }

  // Prevent changing SUPERADMIN role (additional security)
  if (user.role === UserRolesEnum.SUPERADMIN) {
    throw new ApiError(403, "Cannot change SUPERADMIN role", []);
  }

  // Update user role
  user.role = newRole;
  await user.save();

  // Get updated user without sensitive fields
  const updatedUser = await User.findById(userId)
    .select("-password -refreshToken -emailVerificationToken -emailVerificationExpiry")
    .populate("companyId", "name email");

  return res.status(200).json(
    new ApiResponse(
      200, 
      { 
        user: updatedUser,
        previousRole: user.role === newRole ? "Unknown" : (newRole === UserRolesEnum.ADMIN ? UserRolesEnum.USER : UserRolesEnum.ADMIN),
        newRole: newRole
      }, 
      `User role successfully changed to ${newRole}`
    )
  );
});



export {
  createCompany,
  getCompanyById,
  getAllCompanies,
  updateCompany,
  deleteCompany,
  createUser,
  changeUserRole
};
