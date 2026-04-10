import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { validate } from "../validators/validate.js";

import {
  createFeature,
  getFeatureById,
  updateFeature,
  deleteFeature,
  assignUsersToFeature,
  removeUserFromFeature,
  getFeaturesByProjectId,
  getProjectsName,
  changePriority,
  changeStatus,
  changeDeadline,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  toggleQuestionCompletion,
  addTagsToFeature,
  removeTagsFromFeature,
  addWorkflow,
  updateWorkflow,
  deleteWorkflow,
} from "../controllers/feature.controller.js";
import {
  assignUsersValidator,
  featureCreateValidator,
  featureUpdateValidator,
  removeUserValidator,
  changePriorityValidator,
  changeStatusValidator,
  changeDeadlineValidator,
  createQuestionValidator,
  updateQuestionValidator,
  tagsValidator,
  workflowValidator,
} from "../validators/project/features.validators.js";

const router = Router();

// ── Feature CRUD ──────────────────────────────────────────────────────────────

router
  .route("/")
  .post(verifyJWT, featureCreateValidator(), validate, createFeature);

router
  .route("/get-project-name")
  .get(verifyJWT, getProjectsName);

router
  .route("/:featureId")
  .get(verifyJWT, getFeatureById)
  .patch(verifyJWT, featureUpdateValidator(), validate, updateFeature)
  .delete(verifyJWT, deleteFeature);

// ── Features by Project ───────────────────────────────────────────────────────

router.get("/project/:projectId", verifyJWT, getFeaturesByProjectId);

// ── User Assignment ───────────────────────────────────────────────────────────

router.post(
  "/:featureId/assign-users",
  verifyJWT,
  assignUsersValidator(),
  validate,
  assignUsersToFeature
);

router.post(
  "/:featureId/remove-user",
  verifyJWT,
  removeUserValidator(),
  validate,
  removeUserFromFeature
);

// ── Priority / Status / Deadline ──────────────────────────────────────────────

router.patch(
  "/:featureId/change-priority",
  verifyJWT,
  changePriorityValidator(),
  validate,
  changePriority
);

router.patch(
  "/:featureId/change-status",
  verifyJWT,
  changeStatusValidator(),
  validate,
  changeStatus
);

router.patch(
  "/:featureId/change-deadline",
  verifyJWT,
  changeDeadlineValidator(),
  validate,
  changeDeadline
);

// ── Questions ─────────────────────────────────────────────────────────────────

router.post(
  "/:featureId/questions",
  verifyJWT,
  createQuestionValidator(),
  validate,
  createQuestion
);

router.patch(
  "/:featureId/questions/:questionId",
  verifyJWT,
  updateQuestionValidator(),
  validate,
  updateQuestion
);

router.delete(
  "/:featureId/questions/:questionId",
  verifyJWT,
  deleteQuestion
);

router.patch(
  "/:featureId/questions/:questionId/toggle-completion",
  verifyJWT,
  toggleQuestionCompletion
);

// ── Tags ──────────────────────────────────────────────────────────────────────

router.post(
  "/:featureId/add-tags",
  verifyJWT,
  tagsValidator(),
  validate,
  addTagsToFeature
);

router.post(
  "/:featureId/remove-tags",
  verifyJWT,
  tagsValidator(),
  validate,
  removeTagsFromFeature
);

// ── Workflow ──────────────────────────────────────────────────────────────────

router.post(
  "/:featureId/workflow",
  verifyJWT,
  workflowValidator(),
  validate,
  addWorkflow
);

router.patch(
  "/:featureId/workflow/:workflowId",
  verifyJWT,
  workflowValidator(),
  validate,
  updateWorkflow
);

router.delete(
  "/:featureId/workflow/:workflowId",
  verifyJWT,
  deleteWorkflow
);

export default router;
