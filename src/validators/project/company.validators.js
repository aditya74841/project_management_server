import { body } from "express-validator";

const AvailableCompanyStatus = ["active", "inactive", "suspended"];

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

export { companyCreateValidator, companyUpdateValidator };
