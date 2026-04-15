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
    updateQuestionValidator,
    addUserFlowValidator,
    updateUserFlowValidator,
    addFeatureValidator,
    updateFeatureDetailsValidator,
    updateFeaturePriorityValidator,
    updateFeatureStatusValidator,
    addTagValidator,
    addLinkValidator,
    updateLinkValidator,
    addTechStackValidator,
    addIdeaValidator,
    updateIdeaValidator,
    addProjectUpdateValidator,
    updateProjectUpdateValidator,
    updateProjectDiaryValidator
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
    updateQuestion,
    addUserFlow,
    removeUserFlow,
    updateUserFlow,
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
    updateReferenceLink,
    addTechStack,
    removeTechStack,
    updateProjectDiary,
    addIdea,
    removeIdea,
    updateIdea,
    addProjectUpdate,
    removeProjectUpdate,
    updateProjectUpdate,
    promoteFeatureToRegistry
} from "../controllers/projectDiary.controller.js";

const router = Router();

// Apply verifyJWT to all routes
router.use(verifyJWT);

// --- Core Routes ---

router.route("/getProjectDiary")
    .get(
        getAllDiaryValidator(),
        validate,
        getAllProjectDiaries
    );

router.get(
    "/projectDiary/:projectId",
    mongoIdPathVariableValidator("projectId"),
    validate,
    getProjectDiaryByProjectId
);

router
    .route("/:projectId")
    .post(
        createProjectDiaryValidator(),
        validate,
        createProjectDiary
    )


router
    .route("/:diaryId")
    .get(
        mongoIdPathVariableValidator("diaryId"),
        validate,
        getProjectDiaryById
    )
    .patch(
        mongoIdPathVariableValidator("diaryId"),
        updateProjectDiaryValidator(),
        validate,
        updateProjectDiary
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

router.patch(
    "/:diaryId/questions/:questionId",
    mongoIdPathVariableValidator("diaryId"),
    mongoIdPathVariableValidator("questionId"),
    updateQuestionValidator(),
    validate,
    updateQuestion
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

router.patch(
    "/:diaryId/user-flows/:flowId",
    mongoIdPathVariableValidator("diaryId"),
    mongoIdPathVariableValidator("flowId"),
    updateUserFlowValidator(),
    validate,
    updateUserFlow
);

// --- Ideas ---
router.post(
    "/:diaryId/ideas",
    mongoIdPathVariableValidator("diaryId"),
    addIdeaValidator(),
    validate,
    addIdea
);

router.delete(
    "/:diaryId/ideas/:ideaId",
    mongoIdPathVariableValidator("diaryId"),
    mongoIdPathVariableValidator("ideaId"),
    validate,
    removeIdea
);

router.patch(
    "/:diaryId/ideas/:ideaId",
    mongoIdPathVariableValidator("diaryId"),
    mongoIdPathVariableValidator("ideaId"),
    updateIdeaValidator(),
    validate,
    updateIdea
);

// --- Project Updates ---
router.post(
    "/:diaryId/project-updates",
    mongoIdPathVariableValidator("diaryId"),
    addProjectUpdateValidator(),
    validate,
    addProjectUpdate
);

router.delete(
    "/:diaryId/project-updates/:updateId",
    mongoIdPathVariableValidator("diaryId"),
    mongoIdPathVariableValidator("updateId"),
    validate,
    removeProjectUpdate
);

router.patch(
    "/:diaryId/project-updates/:updateId",
    mongoIdPathVariableValidator("diaryId"),
    mongoIdPathVariableValidator("updateId"),
    updateProjectUpdateValidator(),
    validate,
    updateProjectUpdate
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

router.route("/:diaryId/features/:featureId/promote").post(verifyJWT, promoteFeatureToRegistry);

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

router.patch(
    "/:diaryId/links/:linkId",
    mongoIdPathVariableValidator("diaryId"),
    mongoIdPathVariableValidator("linkId"),
    updateLinkValidator(),
    validate,
    updateReferenceLink
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
