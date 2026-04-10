import { body } from "express-validator";

const createCommentValidator = () => {
  return [
    body("featureId")
      .notEmpty()
      .withMessage("Feature ID is required")
      .isMongoId()
      .withMessage("Invalid Feature ID"),

    body("text")
      .trim()
      .notEmpty()
      .withMessage("Comment text is required"),
  ];
};

const updateCommentValidator = () => {
  return [
    body("text")
      .trim()
      .notEmpty()
      .withMessage("Comment text is required"),
  ];
};

export { createCommentValidator, updateCommentValidator };
