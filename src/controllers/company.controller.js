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

  if (!email) {
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
  const { name = "", email = "", password = "", role } = req.body;

  /* ----------------------------------------------------
     1.  Pull companyId from authenticated user
  ---------------------------------------------------- */
  const companyId = req.user?.companyId; // <— TRUSTED SOURCE

  /* ----------------------------------------------------
     2.  Field-level validation
  ---------------------------------------------------- */
  if (!name.trim()) throw new ApiError(400, "Name is required");
  if (!email.trim()) throw new ApiError(400, "Email is required");
  if (!password.trim()) throw new ApiError(400, "Password is required");
  if (!role) throw new ApiError(400, "Role is required");
  if (!companyId) throw new ApiError(403, "Company context missing");

  // Only USER or ADMIN can be created by this route
  if (!ALLOWED_ROLES.includes(role))
    throw new ApiError(400, "Invalid role. Use ADMIN or USER only");

  /* ----------------------------------------------------
     3.  Ensure company exists & is active
  ---------------------------------------------------- */
  const company = await Company.findById(companyId);
  if (!company) throw new ApiError(404, "Company not found");
  if (company.status === "suspended")
    throw new ApiError(403, "Cannot create users for suspended companies");

  /* ----------------------------------------------------
     4.  Uniqueness checks
  ---------------------------------------------------- */
  const lowerEmail = email.toLowerCase().trim();
  if (await User.findOne({ email: lowerEmail }))
    throw new ApiError(409, "User with this email already exists");

  const baseUsername = lowerEmail.split("@")[0];
  const usernameTaken = await User.findOne({ username: baseUsername });
  const finalUsername = usernameTaken
    ? `${baseUsername}_${Date.now()}`
    : baseUsername;

  /* ----------------------------------------------------
     5.  Create user
  ---------------------------------------------------- */
  const user = await User.create({
    name: name.trim(),
    email: lowerEmail,
    password, // hashed in pre-save middleware
    username: finalUsername,
    role,
    companyId: new mongoose.Types.ObjectId(companyId),
    isEmailVerified: false,
  });

  if (!user) throw new ApiError(500, "Failed to create user");

  /* ----------------------------------------------------
     6.  Push to company.users array (if not already)
  ---------------------------------------------------- */
  if (!company.users.includes(user._id)) {
    company.users.push(user._id);
    await company.save();
  }

  /* ----------------------------------------------------
     7.  Response
  ---------------------------------------------------- */
  const safeUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationExpiry"
  );

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        user: safeUser,
        company: {
          id: company._id,
          name: company.name,
          totalUsers: company.users.length,
        },
      },
      "User created successfully"
    )
  );
});

const changeUserRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { newRole } = req.body;
  // console.log("THE user Id",userId)

  // Input validation
  if (!userId) {
    throw new ApiError(400, "User ID is required", []);
  }

  if (!newRole) {
    throw new ApiError(400, "New role is required", []);
  }

  // MongoDB ObjectId validation for userId
  if (!isValidObjectId(userId)) {
    throw new ApiError(
      400,
      "Invalid User ID format. Must be a valid MongoDB ObjectId",
      []
    );
  }

  // Role validation - Only ADMIN or USER allowed
  if (!ALLOWED_ROLES.includes(newRole)) {
    throw new ApiError(
      400,
      "Invalid role. Role must be ADMIN or USER only",
      []
    );
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
    .select(
      "-password -refreshToken -emailVerificationToken -emailVerificationExpiry"
    )
    .populate("companyId", "name email");

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user: updatedUser,
        previousRole:
          user.role === newRole
            ? "Unknown"
            : newRole === UserRolesEnum.ADMIN
              ? UserRolesEnum.USER
              : UserRolesEnum.ADMIN,
        newRole: newRole,
      },
      `User role successfully changed to ${newRole}`
    )
  );
});

const getUsers = asyncHandler(async (req, res) => {
  const currentUser = req.user;
  const { companyId: requestedCompanyId } = req.query; // Get companyId from query params

  // Input validation - ensure user exists and has required fields
  if (!currentUser || !currentUser._id) {
    throw new ApiError(401, "Invalid user session", []);
  }

  // Role validation - Allow ADMIN and SUPERADMIN to access company users
  const allowedRoles = [UserRolesEnum.ADMIN, UserRolesEnum.SUPERADMIN];
  if (!allowedRoles.includes(currentUser.role)) {
    throw new ApiError(403, "Access denied. Admin privileges required", []);
  }

  // Determine which companyId to use
  let targetCompanyId;

  if (requestedCompanyId) {
    // If companyId is provided, only SUPERADMIN can use it
    if (currentUser.role !== UserRolesEnum.SUPERADMIN) {
      throw new ApiError(
        403,
        "Access denied. Only SUPERADMIN can view other companies' users",
        []
      );
    }

    // Validate requested companyId format
    if (!isValidObjectId(requestedCompanyId)) {
      throw new ApiError(400, "Invalid company ID format", []);
    }

    targetCompanyId = requestedCompanyId;
  } else {
    // Use current user's company
    if (!currentUser.companyId) {
      throw new ApiError(400, "User has no associated company", []);
    }

    // Validate user's companyId format
    if (!isValidObjectId(currentUser.companyId)) {
      throw new ApiError(400, "Invalid user company ID format", []);
    }

    targetCompanyId = currentUser.companyId;
  }

  // Find company with users
  const company = await Company.findById(targetCompanyId)
    .populate({
      path: "owner",
      select: "name email role username isEmailVerified createdAt",
    })
    .populate({
      path: "users",
      select: "name email role username isEmailVerified createdAt updatedAt",
      options: { sort: { createdAt: -1 } }, // Sort by newest first
    });

  if (!company) {
    throw new ApiError(404, "Company not found", []);
  }

  // Additional security check for non-SUPERADMIN users
  if (currentUser.role !== UserRolesEnum.SUPERADMIN) {
    // Ensure user belongs to the company they're trying to access
    const userBelongsToCompany =
      company.users.some(
        (user) => String(user._id) === String(currentUser._id)
      ) || String(company.owner?._id) === String(currentUser._id);

    if (!userBelongsToCompany) {
      throw new ApiError(
        403,
        "Access denied. You can only view users from your own company",
        []
      );
    }
  }

  // Filter sensitive data and add additional info
  const sanitizedUsers = company.users.map((user) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    username: user.username,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    isCurrentUser: String(user._id) === String(currentUser._id),
  }));

  // Prepare response data
  const responseData = {
    company: {
      id: company._id,
      name: company.name,
      email: company.email,
      status: company.status,
      domain: company.domain,
      totalUsers: company.users.length,
    },
    owner: company.owner
      ? {
          _id: company.owner._id,
          name: company.owner.name,
          email: company.owner.email,
          role: company.owner.role,
          username: company.owner.username,
          isEmailVerified: company.owner.isEmailVerified,
          createdAt: company.owner.createdAt,
        }
      : null,
    users: sanitizedUsers,
    stats: {
      totalUsers: sanitizedUsers.length,
      adminCount: sanitizedUsers.filter((u) => u.role === UserRolesEnum.ADMIN)
        .length,
      userCount: sanitizedUsers.filter((u) => u.role === UserRolesEnum.USER)
        .length,
      verifiedUsers: sanitizedUsers.filter((u) => u.isEmailVerified).length,
      unverifiedUsers: sanitizedUsers.filter((u) => !u.isEmailVerified).length,
    },
    // Add context info
    context: {
      isViewingOwnCompany:
        String(targetCompanyId) === String(currentUser.companyId),
      requestedBy: {
        role: currentUser.role,
        name: currentUser.name,
        email: currentUser.email,
      },
    },
  };

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        responseData,
        `Retrieved ${sanitizedUsers.length} users from ${company.name}${requestedCompanyId ? " (via SUPERADMIN access)" : ""}`
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
  changeUserRole,
  getUsers,
};
