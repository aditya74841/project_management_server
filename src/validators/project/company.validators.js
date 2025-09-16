import { body } from "express-validator";
import mongoose from "mongoose";
import { UserRolesEnum } from "../../constants.js";

const AvailableCompanyStatus = ["active", "inactive", "suspended"];

// Define allowed roles for user creation (exclude SUPERADMIN)
const AllowedUserRoles = [UserRolesEnum.ADMIN, UserRolesEnum.USER];

const companyCreateValidator = () => {
  return [
    body("name").trim().notEmpty().withMessage("Company name is required"),

    body("email")
      .trim()
      .notEmpty()
      .withMessage("Company email is required")
      .isEmail()
      .withMessage("Invalid company email"),

    body("domain")
      .optional()
      .trim()
      .isString()
      .withMessage("Domain must be a string"),
  ];
};

const companyUpdateValidator = () => {
  return [
    body("name")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Company name cannot be empty"),

    body("domain")
      .optional()
      .trim()
      .isString()
      .withMessage("Domain must be a string"),

    body("status")
      .optional()
      .isIn(AvailableCompanyStatus)
      .withMessage("Invalid company status"),
  ];
};

// Enhanced ObjectId validation function
const isValidObjectId = (value) => {
  if (!value) return false;
  
  // Check basic ObjectId format
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return false;
  }
  
  // Ensure string representation matches original (prevents edge cases)
  return String(new mongoose.Types.ObjectId(value)) === String(value);
};

const createUserValidator = () => {
  return [
    // Name validation
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Name is requiredddddd")
      .isLength({ min: 2, max: 50 })
      .withMessage("Name must be between 2 and 50 characters")
      .matches(/^[a-zA-Z\s\-\.\']+$/)
      .withMessage("Name can only contain letters, spaces, hyphens, dots, and apostrophes"),

    // Email validation
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Please enter a valid email address")
      .normalizeEmail()
      .isLength({ max: 255 })
      .withMessage("Email must be less than 255 characters"),

    // Password validation
    body("password")
      .notEmpty()
      .withMessage("Password is required")
      .isLength({ min: 8, max: 128 })
      .withMessage("Password must be between 8 and 128 characters")
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage("Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"),

    // Role validation (only ADMIN or USER allowed)
    body("role")
      .notEmpty()
      .withMessage("Role is required")
      .isIn(AllowedUserRoles)
      .withMessage("Role must be either ADMIN or USER"),

    // CompanyId validation with strict MongoDB ObjectId check
    body("companyId")
      .notEmpty()
      .withMessage("Company ID is required")
      .custom((value) => {
        if (!isValidObjectId(value)) {
          throw new Error("Invalid Company ID format. Must be a valid MongoDB ObjectId");
        }
        return true;
      })
      .withMessage("Company ID must be a valid MongoDB ObjectId"),
  ];
};

export { 
  companyCreateValidator, 
  companyUpdateValidator, 
  createUserValidator 
};
