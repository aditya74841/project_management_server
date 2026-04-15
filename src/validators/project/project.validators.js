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
      .optional()
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

    body("members.*")
      .optional()
      .isMongoId()
      .withMessage("Each member must be a valid user ID"),

    body("status")
      .optional()
      .isIn(AvailableProjectStatus)
      .withMessage("Invalid project status"),
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

const projectTagValidator = () => {
  return [
    body("tag")
      .trim()
      .notEmpty()
      .withMessage("Tag name is required")
      .isString()
      .withMessage("Tag must be a string"),
  ];
};

// ── Tech Stack Category Validators ──────────────────────────────────────────

const addTechStackCategoryValidator = () => [
  body("categoryName")
    .trim()
    .notEmpty()
    .withMessage("Category name is required")
    .isString(),
];

const updateTechStackCategoryValidator = () => [
  body("categoryName")
    .trim()
    .notEmpty()
    .withMessage("Current category name is required")
    .isString(),
  body("newCategoryName")
    .trim()
    .notEmpty()
    .withMessage("New category name is required")
    .isString(),
];

const removeTechStackCategoryValidator = () => [
  body("categoryName")
    .trim()
    .notEmpty()
    .withMessage("Category name is required to remove")
    .isString(),
];

// ── Tech Item Validators ──────────────────────────────────────────────────────

const addTechItemValidator = () => [
  body("categoryName")
    .trim()
    .notEmpty()
    .withMessage("Category name is required")
    .isString(),
  body("techName")
    .trim()
    .notEmpty()
    .withMessage("Tech name is required")
    .isString(),
  body("description")
    .optional()
    .trim()
    .isString()
    .withMessage("Description must be a string"),
];

const updateTechItemValidator = () => [
  body("categoryName")
    .trim()
    .notEmpty()
    .withMessage("Category name is required")
    .isString(),
  body("techName")
    .trim()
    .notEmpty()
    .withMessage("Current tech name is required")
    .isString(),
  body("newTechName")
    .optional()
    .trim()
    .isString()
    .withMessage("New tech name must be a string"),
  body("newDescription")
    .optional()
    .trim()
    .isString()
    .withMessage("New description must be a string"),
];

const removeTechItemValidator = () => [
  body("categoryName")
    .trim()
    .notEmpty()
    .withMessage("Category name is required")
    .isString(),
  body("techName")
    .trim()
    .notEmpty()
    .withMessage("Tech name is required to remove")
    .isString(),
];

// ── Link Validators ───────────────────────────────────────────────────────────

const addLinkValidator = () => [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Link name is required")
    .isString(),
  body("url")
    .trim()
    .notEmpty()
    .withMessage("Link URL is required")
    .isURL()
    .withMessage("Please enter a valid URL"),
];

const updateLinkValidator = () => [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Link name cannot be empty")
    .isString(),
  body("url")
    .optional()
    .trim()
    .isURL()
    .withMessage("Please enter a valid URL"),
];

export {
  projectCreateValidator,
  projectUpdateValidator,
  projectMemberValidator,
  projectTagValidator,
  addTechStackCategoryValidator,
  updateTechStackCategoryValidator,
  removeTechStackCategoryValidator,
  addTechItemValidator,
  updateTechItemValidator,
  removeTechItemValidator,
  addLinkValidator,
  updateLinkValidator,
};
