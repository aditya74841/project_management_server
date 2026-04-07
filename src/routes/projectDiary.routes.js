import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { validate } from "../validators/validate.js";
import { mongoIdPathVariableValidator } from "../validators/common/mongodb.validators.js";
import {
    createProjectDiaryValidator,
    getAllDiaryValidator,
    updateStatusValidator,
    updatePriorityValidator,
    addQuestionValidator,
    addUserFlowValidator,
    addFeatureValidator,
    updateFeatureDetailsValidator,
    updateFeaturePriorityValidator,
    updateFeatureStatusValidator,
    addTagValidator,
    addLinkValidator,
    addTechStackValidator
} from "../validators/project/projectDiary.validators.js";
import {
    createProjectDiary,
    getAllProjectDiaries,
    getProjectDiaryById,
    getProjectDiaryByProjectId,
    deleteProjectDiary,
    updateDiaryStatus,
    updateDiaryPriority,
    addQuestion,
    removeQuestion,
    addUserFlow,
    removeUserFlow,
    addFeature,
    removeFeature,
    updateFeatureDetails,
    updateFeaturePriority,
    updateFeatureStatus,
    toggleFeatureCompletion,
    addTag,
    removeTag,
    addReferenceLink,
    removeReferenceLink,
    addTechStack,
    removeTechStack
} from "../controllers/projectDiary.controller.js";

const router = Router();

// Apply verifyJWT to all routes
router.use(verifyJWT);

// --- Core Routes ---
router.get(
    "/project/:projectId",
    mongoIdPathVariableValidator("projectId"),
    validate,
    getProjectDiaryByProjectId
);

router
    .route("/")
    .post(
        createProjectDiaryValidator(),
        validate,
        createProjectDiary
    )
    .get(
        getAllDiaryValidator(),
        validate,
        getAllProjectDiaries
    );

router
    .route("/:diaryId")
    .get(
        mongoIdPathVariableValidator("diaryId"),
        validate,
        getProjectDiaryById
    )
    .delete(
        mongoIdPathVariableValidator("diaryId"),
        validate,
        deleteProjectDiary
    );

// --- Status & Priority ---
router.patch(
    "/:diaryId/status",
    mongoIdPathVariableValidator("diaryId"),
    updateStatusValidator(),
    validate,
    updateDiaryStatus
);

router.patch(
    "/:diaryId/priority",
    mongoIdPathVariableValidator("diaryId"),
    updatePriorityValidator(),
    validate,
    updateDiaryPriority
);

// --- Questions ---
router.post(
    "/:diaryId/questions",
    mongoIdPathVariableValidator("diaryId"),
    addQuestionValidator(),
    validate,
    addQuestion
);

router.delete(
    "/:diaryId/questions/:questionId",
    mongoIdPathVariableValidator("diaryId"),
    mongoIdPathVariableValidator("questionId"),
    validate,
    removeQuestion
);

// --- User Flows ---
router.post(
    "/:diaryId/user-flows",
    mongoIdPathVariableValidator("diaryId"),
    addUserFlowValidator(),
    validate,
    addUserFlow
);

router.delete(
    "/:diaryId/user-flows/:flowId",
    mongoIdPathVariableValidator("diaryId"),
    mongoIdPathVariableValidator("flowId"),
    validate,
    removeUserFlow
);

// --- Features ---
router.post(
    "/:diaryId/features",
    mongoIdPathVariableValidator("diaryId"),
    addFeatureValidator(),
    validate,
    addFeature
);

router.delete(
    "/:diaryId/features/:featureId",
    mongoIdPathVariableValidator("diaryId"),
    mongoIdPathVariableValidator("featureId"),
    validate,
    removeFeature
);

router.patch(
    "/:diaryId/features/:featureId/details",
    mongoIdPathVariableValidator("diaryId"),
    mongoIdPathVariableValidator("featureId"),
    updateFeatureDetailsValidator(),
    validate,
    updateFeatureDetails
);

router.patch(
    "/:diaryId/features/:featureId/priority",
    mongoIdPathVariableValidator("diaryId"),
    mongoIdPathVariableValidator("featureId"),
    updateFeaturePriorityValidator(),
    validate,
    updateFeaturePriority
);

router.patch(
    "/:diaryId/features/:featureId/status",
    mongoIdPathVariableValidator("diaryId"),
    mongoIdPathVariableValidator("featureId"),
    updateFeatureStatusValidator(),
    validate,
    updateFeatureStatus
);

router.patch(
    "/:diaryId/features/:featureId/toggle",
    mongoIdPathVariableValidator("diaryId"),
    mongoIdPathVariableValidator("featureId"),
    validate,
    toggleFeatureCompletion
);

// --- Tags ---
router.post(
    "/:diaryId/tags",
    mongoIdPathVariableValidator("diaryId"),
    addTagValidator(),
    validate,
    addTag
);

router.delete(
    "/:diaryId/tags/:tag",
    mongoIdPathVariableValidator("diaryId"),
    // Tag is just a string, not a mongoId, so no mongo validator for :tag
    validate,
    removeTag
);

// --- Reference Links ---
router.post(
    "/:diaryId/links",
    mongoIdPathVariableValidator("diaryId"),
    addLinkValidator(),
    validate,
    addReferenceLink
);

router.delete(
    "/:diaryId/links/:linkId",
    mongoIdPathVariableValidator("diaryId"),
    mongoIdPathVariableValidator("linkId"),
    validate,
    removeReferenceLink
);

// --- Tech Stack ---
router.post(
    "/:diaryId/tech-stack",
    mongoIdPathVariableValidator("diaryId"),
    addTechStackValidator(),
    validate,
    addTechStack
);

router.delete(
    "/:diaryId/tech-stack/:tech",
    mongoIdPathVariableValidator("diaryId"),
    // Tech is string
    validate,
    removeTechStack
);

export default router;
