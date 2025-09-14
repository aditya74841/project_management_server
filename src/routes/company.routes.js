import { Router } from "express";
import passport from "passport";

import { UserRolesEnum } from "../constants.js";
import {
  verifyJWT,
  verifyPermission,
} from "../middlewares/auth.middlewares.js";
import { validate } from "../validators/validate.js";
import {
  companyCreateValidator,
  companyUpdateValidator,
} from "../validators/project/company.validators.js";
import {
  createCompany,
  deleteCompany,
  getAllCompanies,
  getCompanyById,
  updateCompany,
} from "../controllers/company.controller.js";
import { mongoIdPathVariableValidator } from "../validators/common/mongodb.validators.js";

const router = Router();

// Secured routes
router
  .route("/")
  .post(
    verifyJWT,
    validate,
    verifyPermission([UserRolesEnum.SUPERADMIN]),
    companyCreateValidator(),
    createCompany
  )
  .get(
    verifyJWT,
    verifyPermission([UserRolesEnum.SUPERADMIN]),
    getAllCompanies
  );

router
  .route("/:companyId")
  .get(verifyJWT, mongoIdPathVariableValidator("companyId"), getCompanyById)
  .patch(
    verifyJWT,
    companyUpdateValidator(),
    validate,
    mongoIdPathVariableValidator("companyId"),
    verifyPermission([UserRolesEnum.SUPERADMIN]),
    updateCompany
  )
  .delete(
    verifyJWT,
    mongoIdPathVariableValidator("companyId"),
    verifyPermission([UserRolesEnum.SUPERADMIN]),
    deleteCompany
  );



export default router;
