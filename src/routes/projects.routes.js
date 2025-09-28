

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
    verifyPermission([UserRolesEnum.SUPERADMIN, UserRolesEnum.ADMIN,UserRolesEnum.USER]),
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
    verifyPermission([UserRolesEnum.SUPERADMIN, UserRolesEnum.ADMIN,UserRolesEnum.USER]),
    projectUpdateValidator(),
    validate,
    mongoIdPathVariableValidator("projectId"),
    updateProject
  )
  .delete(
    verifyJWT,
    verifyPermission([UserRolesEnum.SUPERADMIN, UserRolesEnum.ADMIN,UserRolesEnum.USER]),
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














// // routes/project.routes.js
// import { Router } from "express";
// import { UserRolesEnum } from "../constants.js";
// import { verifyJWT, verifyPermission } from "../middlewares/auth.middlewares.js";
// import { validate } from "../validators/validate.js";
// import {
//   projectCreateValidator,
//   projectUpdateValidator,
//   // projectMemberValidator,
//   projectFeatureValidator,
//   // projectMemberRoleValidator,
// } from "../validators/project/project.validators.js";
// import {
//   createProject,
//   getProjectById,
//   updateProject,
//   deleteProject,
//   toggleProjectVisibility,
//   addMemberToProject,
//   removeMemberFromProject,
//   updateMemberRole,
//   assignFeatureToProject,
//   unassignFeatureFromProject,
//   getProjects,
// } from "../controllers/projects.controller.js";
// import { mongoIdPathVariableValidator } from "../validators/common/mongodb.validators.js";

// const router = Router();

// // Project CRUD
// router
//   .route("/")
//   .post(
//     verifyJWT,
//     verifyPermission([UserRolesEnum.SUPERADMIN, UserRolesEnum.ADMIN, UserRolesEnum.USER]),
//     projectCreateValidator(),
//     validate,
//     createProject
//   )
//   .get(verifyJWT, getProjects);

// router
//   .route("/:projectId")
//   .get(
//     verifyJWT,
//     mongoIdPathVariableValidator("projectId"),
//     getProjectById
//   )
//   .patch(
//     verifyJWT,
//     mongoIdPathVariableValidator("projectId"),
//     projectUpdateValidator(),
//     validate,
//     updateProject
//   )
//   .delete(
//     verifyJWT,
//     mongoIdPathVariableValidator("projectId"),
//     deleteProject
//   );

// // Toggle project visibility
// router.patch(
//   "/:projectId/toggle-visibility",
//   verifyJWT,
//   mongoIdPathVariableValidator("projectId"),
//   toggleProjectVisibility
// );

// // Member management
// router.post(
//   "/:projectId/members",
//   verifyJWT,
//   mongoIdPathVariableValidator("projectId"),
//   // projectMemberValidator(),
//   validate,
//   addMemberToProject
// );

// router.patch(
//   "/:projectId/members/role",
//   verifyJWT,
//   mongoIdPathVariableValidator("projectId"),
//   // projectMemberRoleValidator(),
//   validate,
//   updateMemberRole
// );

// router.delete(
//   "/:projectId/members",
//   verifyJWT,
//   mongoIdPathVariableValidator("projectId"),
//   // projectMemberValidator(),
//   validate,
//   removeMemberFromProject
// );

// // Feature management
// router.post(
//   "/:projectId/features",
//   verifyJWT,
//   mongoIdPathVariableValidator("projectId"),
//   projectFeatureValidator(),
//   validate,
//   assignFeatureToProject
// );

// router.delete(
//   "/:projectId/features",
//   verifyJWT,
//   mongoIdPathVariableValidator("projectId"),
//   projectFeatureValidator(),
//   validate,
//   unassignFeatureFromProject
// );

// export default router;




