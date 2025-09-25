import { Router } from "express";
import { UserRolesEnum } from "../constants.js";
import {
  verifyJWT,
  verifyPermission,
} from "../middlewares/auth.middlewares.js";
import { validate } from "../validators/validate.js";
import {
  companyCreateValidator,
  companyUpdateValidator,
  createUserValidator,
} from "../validators/project/company.validators.js";
import {
  changeUserRole,
  createCompany,
  createUser,
  createUserBySuperAdmin,
  deleteCompany,
  getAllCompanies,
  getCompanyById,
  getUsers,
  getUsersForDropdown,
  updateCompany,
} from "../controllers/company.controller.js";
import { mongoIdPathVariableValidator } from "../validators/common/mongodb.validators.js";

const router = Router();

// ✅ CORRECT ORDER: validator → validate → controller
router
  .route("/")
  .post(
    verifyJWT,
    verifyPermission([UserRolesEnum.SUPERADMIN]),
    companyCreateValidator(), // 1. Run validation rules
    validate, // 2. Check validation results
    createCompany // 3. Run controller if valid
  )
  .get(
    verifyJWT,
    verifyPermission([UserRolesEnum.SUPERADMIN]),
    getAllCompanies
  );

router
  .route("/get-users")
  .get(
    verifyJWT,
    verifyPermission([UserRolesEnum.ADMIN, UserRolesEnum.SUPERADMIN]),
    getUsers
  );


  router
  .route("/create-user-superadmin")
  .post(
    verifyJWT,
    verifyPermission([UserRolesEnum.SUPERADMIN]),
    // companyCreateValidator(), 
    // validate, 
    createUserBySuperAdmin
  )


router
  .route("/get-dropdown-users")
  .get(
    verifyJWT,
    verifyPermission([UserRolesEnum.ADMIN, UserRolesEnum.SUPERADMIN]),
    getUsersForDropdown
  );

router
  .route("/:companyId")
  .get(
    verifyJWT,
    mongoIdPathVariableValidator("companyId"),
    validate, // Add validate middleware
    getCompanyById
  )
  .patch(
    verifyJWT,
    verifyPermission([UserRolesEnum.SUPERADMIN]),
    mongoIdPathVariableValidator("companyId"),
    companyUpdateValidator(), // 1. Validation rules
    validate, // 2. Check results
    updateCompany // 3. Controller
  )
  .delete(
    verifyJWT,
    verifyPermission([UserRolesEnum.SUPERADMIN]),
    mongoIdPathVariableValidator("companyId"),
    validate, // Add validate middleware
    deleteCompany
  );

router.route("/create-user").post(
  verifyJWT,
  verifyPermission([UserRolesEnum.ADMIN]), // Add permission check
  createUserValidator(), // 1. Validation rules
  validate, // 2. Check validation results
  createUser // 3. Controller
);

router.patch(
  "/:userId/change-role",
  verifyJWT,
  verifyPermission([UserRolesEnum.ADMIN]),
  mongoIdPathVariableValidator("userId"),
  validate,
  changeUserRole
);

export default router;

//
