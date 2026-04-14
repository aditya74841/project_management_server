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
  projectTagValidator,
  addTechStackCategoryValidator,
  updateTechStackCategoryValidator,
  removeTechStackCategoryValidator,
  addTechItemValidator,
  updateTechItemValidator,
  removeTechItemValidator,
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
  addTagToProject,
  removeTagFromProject,
  addTechStackCategory,
  updateTechStackCategory,
  removeTechStackCategory,
  addTechItem,
  updateTechItem,
  removeTechItem,
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
    validate,
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

// ── Tags ──────────────────────────────────────────────────────────────────────

router.post(
  "/:projectId/tags",
  verifyJWT,
  verifyPermission([UserRolesEnum.SUPERADMIN, UserRolesEnum.ADMIN, UserRolesEnum.USER]),
  mongoIdPathVariableValidator("projectId"),
  projectTagValidator(),
  validate,
  addTagToProject
);

router.delete(
  "/:projectId/tags",
  verifyJWT,
  verifyPermission([UserRolesEnum.SUPERADMIN, UserRolesEnum.ADMIN, UserRolesEnum.USER]),
  mongoIdPathVariableValidator("projectId"),
  projectTagValidator(),
  validate,
  removeTagFromProject
);

// ── Tech Stack Category Management ──────────────────────────────────────────

router.post(
  "/:projectId/tech-stack-category",
  verifyJWT,
  verifyPermission([UserRolesEnum.SUPERADMIN, UserRolesEnum.ADMIN, UserRolesEnum.USER]),
  mongoIdPathVariableValidator("projectId"),
  addTechStackCategoryValidator(),
  validate,
  addTechStackCategory
);

router.patch(
  "/:projectId/tech-stack-category",
  verifyJWT,
  verifyPermission([UserRolesEnum.SUPERADMIN, UserRolesEnum.ADMIN, UserRolesEnum.USER]),
  mongoIdPathVariableValidator("projectId"),
  updateTechStackCategoryValidator(),
  validate,
  updateTechStackCategory
);

router.delete(
  "/:projectId/tech-stack-category",
  verifyJWT,
  verifyPermission([UserRolesEnum.SUPERADMIN, UserRolesEnum.ADMIN, UserRolesEnum.USER]),
  mongoIdPathVariableValidator("projectId"),
  removeTechStackCategoryValidator(),
  validate,
  removeTechStackCategory
);

// ── Tech Item Management ──────────────────────────────────────────────────────

router.post(
  "/:projectId/tech-item",
  verifyJWT,
  verifyPermission([UserRolesEnum.SUPERADMIN, UserRolesEnum.ADMIN, UserRolesEnum.USER]),
  mongoIdPathVariableValidator("projectId"),
  addTechItemValidator(),
  validate,
  addTechItem
);

router.patch(
  "/:projectId/tech-item",
  verifyJWT,
  verifyPermission([UserRolesEnum.SUPERADMIN, UserRolesEnum.ADMIN, UserRolesEnum.USER]),
  mongoIdPathVariableValidator("projectId"),
  updateTechItemValidator(),
  validate,
  updateTechItem
);

router.delete(
  "/:projectId/tech-item",
  verifyJWT,
  verifyPermission([UserRolesEnum.SUPERADMIN, UserRolesEnum.ADMIN, UserRolesEnum.USER]),
  mongoIdPathVariableValidator("projectId"),
  removeTechItemValidator(),
  validate,
  removeTechItem
);

export default router;
