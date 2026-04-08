import { body, param, query } from "express-validator";

export const createProjectDiaryValidator = () => {
    return [
        body("title").notEmpty().withMessage("Title is required").trim(),
        body("status")
            .optional()
            .isIn(["idea", "scoping", "in-progress", "completed", "archived"])
            .withMessage("Invalid status"),
        body("priority")
            .optional()
            .isIn(["low", "medium", "high"])
            .withMessage("Invalid priority"),
    ];
};

export const updateStatusValidator = () => {
    return [
        body("status")
            .notEmpty()
            .withMessage("Status is required")

            // 🔧 Normalize input → lowercase
            .customSanitizer((value) => {
                return typeof value === "string" ? value.toLowerCase() : value;
            })

            // ✅ Validate against allowed values
            .isIn(["idea", "scoping", "in-progress", "completed", "archived"])
            .withMessage("Invalid status"),
    ];
};

export const updatePriorityValidator = () => {
    return [
        body("priority")
            .isString()
            .withMessage("Priority must be a string")
            .bail()
            .notEmpty()
            .withMessage("Priority is required")
            .customSanitizer((value) => value.toLowerCase())
            .isIn(["low", "medium", "high"])
            .withMessage("Invalid priority"),
    ];
};

export const addQuestionValidator = () => {
    return [
        body("name").notEmpty().withMessage("Question name is required").trim(),
        body("answer").optional().trim(),
    ];
};

export const addUserFlowValidator = () => {
    return [
        body("flow").notEmpty().withMessage("Flow text is required").trim(),
    ];
};

export const addFeatureValidator = () => {
    return [
        body("name").notEmpty().withMessage("Feature name is required").trim(),
        body("description").optional().trim(),
        body("priority")
            .optional()
            .isIn(["musthave", "nicetohave"])
            .withMessage("Invalid feature priority"),
        body("status")
            .optional()
            .isIn(["pending", "in-progress", "completed"])
            .withMessage("Invalid feature status"),
    ];
};

export const updateFeatureDetailsValidator = () => {
    return [
        body("name").optional().trim(),
        body("description").optional().trim(),
    ];
};

export const updateFeaturePriorityValidator = () => {
    return [
        body("priority")
            .notEmpty()
            .withMessage("Priority is required")
            .isIn(["musthave", "nicetohave"])
            .withMessage("Invalid feature priority"),
    ];
};

export const updateFeatureStatusValidator = () => {
    return [
        body("status")
            .notEmpty()
            .withMessage("Status is required")
            .isIn(["pending", "in-progress", "completed"])
            .withMessage("Invalid feature status"),
    ];
};

export const addTagValidator = () => {
    return [
        body("tag").notEmpty().withMessage("Tag is required").trim(),
    ];
};

export const addLinkValidator = () => {
    return [
        body("name").notEmpty().withMessage("Link name is required").trim(),
        body("url").notEmpty().withMessage("URL is required").isURL().withMessage("Invalid URL"),
    ];
};

export const addTechStackValidator = () => {
    return [
        body("tech").notEmpty().withMessage("Tech name is required").trim(),
    ];
};

export const addIdeaValidator = () => {
    return [
        body("idea").notEmpty().withMessage("Idea text is required").trim(),
    ];
};

export const updateIdeaValidator = () => {
    return [
        body("idea").notEmpty().withMessage("Idea text is required").trim(),
    ];
};

export const addProjectUpdateValidator = () => {
    return [
        body("update").notEmpty().withMessage("Update text is required").trim(),
    ];
};

export const updateProjectUpdateValidator = () => {
    return [
        body("update").notEmpty().withMessage("Update text is required").trim(),
    ];
};

export const getAllDiaryValidator = () => {
    return [
        query("page").optional().isInt({ min: 1 }).withMessage("Page must be a number >= 1"),
        query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be a number between 1 and 100"),
        query("status").optional().isIn(["idea", "scoping", "in-progress", "completed", "archived"]),
        query("priority").optional().isIn(["low", "medium", "high"]),
        query("projectId")
            .optional()
            .isMongoId()
            .withMessage("projectId must be a valid MongoDB ObjectId"),
    ];
};
