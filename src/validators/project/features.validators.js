import { body, param } from "express-validator";

const AvailableFeatureStatus = ["pending", "working", "completed", "blocked"];
const AvailableFeaturePriority = ["low", "medium", "high", "urgent"];

const featureCreateValidator = () => {
  return [
    body("title").trim().notEmpty().withMessage("Feature title is required"),

    body("description").optional().trim(),

    body("priority")
      .optional()
      .isIn(AvailableFeaturePriority)
      .withMessage("Invalid priority value"),

    body("status")
      .optional()
      .isIn(AvailableFeatureStatus)
      .withMessage("Invalid status value"),

    body("projectId")
      .notEmpty()
      .withMessage("Project ID is required")
      .isMongoId()
      .withMessage("Invalid Project ID"),

    body("deadline")
      .optional()
      .isISO8601()
      .toDate()
      .withMessage("Deadline must be a valid date"),

    body("tags")
      .optional()
      .isArray()
      .withMessage("Tags must be an array of strings"),
  ];
};

const featureUpdateValidator = () => {
  return [
    body("title").optional().trim().notEmpty().withMessage("Title cannot be empty"),

    body("description").optional().trim(),

    body("priority")
      .optional()
      .isIn(AvailableFeaturePriority)
      .withMessage("Invalid priority value"),

    body("status")
      .optional()
      .isIn(AvailableFeatureStatus)
      .withMessage("Invalid status value"),

    body("deadline")
      .optional()
      .isISO8601()
      .toDate()
      .withMessage("Deadline must be a valid date"),

    body("tags")
      .optional()
      .isArray()
      .withMessage("Tags must be an array of strings"),
  ];
};

const assignUsersValidator = () => {
  return [
    body("userIds")
      .isArray({ min: 1 })
      .withMessage("userIds must be an array with at least one userId"),
    body("userIds.*")
      .isMongoId()
      .withMessage("Each userId must be a valid Mongo ID"),
  ];
};

const removeUserValidator = () => {
  return [
    body("userId").notEmpty().isMongoId().withMessage("Valid userId is required"),
  ];
};

const addCommentValidator = () => {
  return [
    body("text").trim().notEmpty().withMessage("Comment text is required"),
  ];
};

export {
  featureCreateValidator,
  featureUpdateValidator,
  assignUsersValidator,
  removeUserValidator,
  addCommentValidator,
};
