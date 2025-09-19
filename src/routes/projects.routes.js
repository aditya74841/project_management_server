import { Router } from "express";
import { UserRolesEnum } from "../constants.js";
import {
  verifyJWT,
  verifyPermission,
} from "../middlewares/auth.middlewares.js";
import { validate } from "../validators/validate.js";
import {
  projectCreateValidator,
  projectUpdateValidator,
  projectMemberValidator,
  projectFeatureValidator,
} from "../validators/project/project.validators.js";
import {
  createProject,
  getProjectById,
  updateProject,
  deleteProject,
  toggleProjectVisibility,
  addMemberToProject,
  removeMemberFromProject,
  assignFeatureToProject,
  unassignFeatureFromProject,
  getProject,
} from "../controllers/projects.controller.js";
import { mongoIdPathVariableValidator } from "../validators/common/mongodb.validators.js";
import { get } from "mongoose";

const router = Router();

// Project CRUD
router
  .route("/")
  .post(
    verifyJWT,
    verifyPermission([UserRolesEnum.SUPERADMIN, UserRolesEnum.ADMIN]),
    projectCreateValidator(),
    validate,
    createProject
  )
  .get(verifyJWT, getProject);

router
  .route("/:projectId")
  .get(verifyJWT, mongoIdPathVariableValidator("projectId"), getProjectById)
  .patch(
    verifyJWT,
    verifyPermission([UserRolesEnum.SUPERADMIN, UserRolesEnum.ADMIN]),
    projectUpdateValidator(),
    validate,
    mongoIdPathVariableValidator("projectId"),
    updateProject
  )
  .delete(
    verifyJWT,
    verifyPermission([UserRolesEnum.SUPERADMIN, UserRolesEnum.ADMIN]),
    mongoIdPathVariableValidator("projectId"),
    deleteProject
  );

// Toggle project visibility
router.patch(
  "/:projectId/toggle-visibility",
  verifyJWT,
  mongoIdPathVariableValidator("projectId"),
  toggleProjectVisibility
);

// Members management
router.post(
  "/:projectId/members",
  verifyJWT,
  projectMemberValidator(),
  validate,
  mongoIdPathVariableValidator("projectId"),
  addMemberToProject
);

router.delete(
  "/:projectId/members",
  verifyJWT,
  projectMemberValidator(),
  validate,
  mongoIdPathVariableValidator("projectId"),
  removeMemberFromProject
);

// Features management
router.post(
  "/:projectId/features",
  verifyJWT,
  projectFeatureValidator(),
  validate,
  mongoIdPathVariableValidator("projectId"),
  assignFeatureToProject
);

router.delete(
  "/:projectId/features",
  verifyJWT,
  projectFeatureValidator(),
  validate,
  mongoIdPathVariableValidator("projectId"),
  unassignFeatureFromProject
);

export default router;
