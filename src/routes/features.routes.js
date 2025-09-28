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
