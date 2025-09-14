import { body } from "express-validator";

const AvailableProjectStatus = ["draft", "active", "archived", "completed"];

const projectCreateValidator = () => {
  return [
    body("name").trim().notEmpty().withMessage("Project name is required"),

    body("description")
      .optional()
      .trim()
      .isString()
      .withMessage("Description must be a string"),

    body("companyId")
      .notEmpty()
      .withMessage("Company ID is required")
      .isMongoId()
      .withMessage("Invalid company ID"),

    body("deadline")
      .optional()
      .isISO8601()
      .withMessage("Deadline must be a valid date"),

    body("members")
      .optional()
      .isArray()
      .withMessage("Members must be an array of user IDs"),
  ];
};

const projectUpdateValidator = () => {
  return [
    body("name")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Project name cannot be empty"),

    body("description")
      .optional()
      .trim()
      .isString()
      .withMessage("Description must be a string"),

    body("deadline")
      .optional()
      .isISO8601()
      .withMessage("Deadline must be a valid date"),

    body("status")
      .optional()
      .isIn(AvailableProjectStatus)
      .withMessage("Invalid project status"),
  ];
};

const projectMemberValidator = () => {
  return [
    body("userId")
      .notEmpty()
      .withMessage("User ID is required")
      .isMongoId()
      .withMessage("Invalid User ID"),
  ];
};

const projectFeatureValidator = () => {
  return [
    body("featureId")
      .notEmpty()
      .withMessage("Feature ID is required")
      .isMongoId()
      .withMessage("Invalid Feature ID"),
  ];
};

export {
  projectCreateValidator,
  projectUpdateValidator,
  projectMemberValidator,
  projectFeatureValidator,
};
