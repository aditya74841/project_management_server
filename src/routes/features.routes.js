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
  addCommentToFeature,
  removeCommentFromFeature,
  toggleFeatureCompletion,
  getFeaturesByProjectId,
  getProjectsName,
} from "../controllers/feature.controller.js";
import { addCommentValidator, assignUsersValidator, featureCreateValidator, featureUpdateValidator, removeUserValidator } from "../validators/project/features.validators.js";

const router = Router();

router
  .route("/")
  .post(verifyJWT, featureCreateValidator(), validate, createFeature);


  router
  .route("/get-project-name")
  .get(verifyJWT,  getProjectsName);

router
  .route("/:featureId")
  .get(verifyJWT, getFeatureById)
  .patch(verifyJWT, featureUpdateValidator(), validate, updateFeature)
  .delete(verifyJWT, deleteFeature);

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

router.post(
  "/:featureId/add-comment",
  verifyJWT,
  addCommentValidator(),
  validate,
  addCommentToFeature
);

router.delete(
  "/:featureId/comments/:commentId",
  verifyJWT,
  removeCommentFromFeature
);

router.patch("/:featureId/toggle-completion", verifyJWT, toggleFeatureCompletion);

router.get("/project/:projectId", verifyJWT, getFeaturesByProjectId);

export default router;
