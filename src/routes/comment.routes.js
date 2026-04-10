import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { validate } from "../validators/validate.js";
import {
  createCommentValidator,
  updateCommentValidator,
} from "../validators/project/comment.validators.js";
import { mongoIdPathVariableValidator } from "../validators/common/mongodb.validators.js";
import {
  createComment,
  getCommentsByFeature,
  updateComment,
  deleteComment,
} from "../controllers/comment.controller.js";

const router = Router();

// Apply verifyJWT to all routes
router.use(verifyJWT);

// Create a comment
router.post(
  "/",
  createCommentValidator(),
  validate,
  createComment
);

// Get all comments for a feature (paginated)
router.get(
  "/feature/:featureId",
  mongoIdPathVariableValidator("featureId"),
  validate,
  getCommentsByFeature
);

// Update a comment (author only)
router.patch(
  "/:commentId",
  mongoIdPathVariableValidator("commentId"),
  updateCommentValidator(),
  validate,
  updateComment
);

// Delete a comment (author or admin)
router.delete(
  "/:commentId",
  mongoIdPathVariableValidator("commentId"),
  validate,
  deleteComment
);

export default router;
