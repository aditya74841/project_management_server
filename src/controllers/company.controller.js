import { Company } from "../models/company.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createCompany = asyncHandler(async (req, res) => {
  const { name, email, domain = null } = req.body;

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
  const { name, domain, status } = req.body;

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

export {
  createCompany,
  getCompanyById,
  getAllCompanies,
  updateCompany,
  deleteCompany,
};
