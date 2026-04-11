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
} from "../validators/project/project.validators.js";
import {
  createProject,
  getProjectById,
  updateProject,
  deleteProject,
  addMemberToProject,
  removeMemberFromProject,
  getProject,
  changeProjectStatus,
} from "../controllers/projects.controller.js";
import { mongoIdPathVariableValidator } from "../validators/common/mongodb.validators.js";

const router = Router();

// ── Project CRUD ──────────────────────────────────────────────────────────────

router
  .route("/")
  .post(
    verifyJWT,
    verifyPermission([UserRolesEnum.SUPERADMIN, UserRolesEnum.ADMIN, UserRolesEnum.USER]),
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
    verifyPermission([UserRolesEnum.SUPERADMIN, UserRolesEnum.ADMIN, UserRolesEnum.USER]),
    mongoIdPathVariableValidator("projectId"),
    projectUpdateValidator(),
    // validate,
    updateProject
  )
  .delete(
    verifyJWT,
    verifyPermission([UserRolesEnum.SUPERADMIN, UserRolesEnum.ADMIN, UserRolesEnum.USER]),
    mongoIdPathVariableValidator("projectId"),
    deleteProject
  );

// ── Status ────────────────────────────────────────────────────────────────────

router.patch(
  "/:projectId/change-status",
  verifyJWT,
  mongoIdPathVariableValidator("projectId"),
  changeProjectStatus
);

// ── Members ───────────────────────────────────────────────────────────────────

router.post(
  "/:projectId/members",
  verifyJWT,
  mongoIdPathVariableValidator("projectId"),
  projectMemberValidator(),
  validate,
  addMemberToProject
);

router.delete(
  "/:projectId/members",
  verifyJWT,
  mongoIdPathVariableValidator("projectId"),
  projectMemberValidator(),
  validate,
  removeMemberFromProject
);

export default router;
