import { ProjectDiary } from "../models/projectDiary.model.js";
import { Project } from "../models/projects.model.js";
import { Feature } from "../models/feature.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// --- Project Diary Core ---
import mongoose from "mongoose";

export const getProjectDiaryByProjectId = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    //  createdBy: req.user._id
    let projectDiary = await ProjectDiary.findOne({ projectId, });

    if (!projectDiary) {
        const Project = mongoose.model("Project");
        const project = await Project.findById(projectId);
        if (!project) throw new ApiError(404, "Project not found");

        projectDiary = await ProjectDiary.create({
            title: project.name,
            description: "Diary for " + project.name,
            projectId: project._id,
            createdBy: req.user._id,
        });
    }

    return res.status(200).json(
        new ApiResponse(200, { projectDiary }, "Project Diary fetched successfully")
    );
});


// Create Project Diary
// Get Project Diary
// Get All Project Diaries
// Update Project Diaries
// Delete Project Diaries


export const createProjectDiary = asyncHandler(async (req, res) => {

    const { projectId } = req.params;

    const project = await Project.findById(projectId)

    if (!project) {
        throw new ApiError(404, "Project  not found");
    }
    const {
        title,
        description,
        status,
        priority,
    } = req.body;

    if (!title) {
        throw new ApiError(400, "Title is required");
    }

    const projectDiary = await ProjectDiary.create({
        title,
        description,
        status,
        priority,
        projectId: projectId || null,
        createdBy: req.user._id,
    });

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                { projectDiary },
                "Project Diary created successfully"
            )
        );
});

export const getAllProjectDiaries = asyncHandler(async (req, res) => {

    const {
        status,
        priority,
        projectId,
        sortBy = "createdAt",
        order = "desc",
        page = 1,
        limit = 10
    } = req.query;



    // Scope all results to the logged-in user, using new indexed fields
    // const query = { createdBy: req.user._id };
    const query = {}
    // if (status) query.status = status;
    // if (priority) query.priority = priority;
    if (projectId) query.projectId = projectId;

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    let projectDiaries = await ProjectDiary.find(query)
        .sort({ [sortBy]: order === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(limitNumber);

    let total = await ProjectDiary.countDocuments(query);

    // --- Auto-Initialization Logic (Zen Prism Edition) ---
    // If filtering by projectId and no entries exist yet, bootstrap a Genesis Entry
    if (projectDiaries.length === 0 && projectId && pageNumber === 1) {
        const project = await Project.findById(projectId);
        if (project) {
            const defaultDiary = await ProjectDiary.create({
                projectId,
                title: `${project.name} - Genesis Entry`,
                description: `Strategic footprint started for ${project.name}. Use this space to map technical decisions and product logic.`,
                status: "idea",
                priority: "medium",
                createdBy: req.user?._id // If auth is available
            });
            projectDiaries = [defaultDiary];
            total = 1;
        }
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    projectDiaries,
                    pagination: {
                        total,
                        page: pageNumber,
                        limit: limitNumber,
                        pages: Math.ceil(total / limitNumber)
                    }
                },
                "Project Diaries fetched successfully"
            )
        );
});

export const getProjectDiaryById = asyncHandler(async (req, res) => {
    const { diaryId } = req.params;
    const projectDiary = await ProjectDiary.findById(diaryId);
    if (!projectDiary) throw new ApiError(404, "Project Diary not found");

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { projectDiary },
                "Project Diary fetched successfully"
            )
        );
});

export const updateProjectDiary = asyncHandler(async (req, res) => {
    const { diaryId } = req.params;
    const { title, description, status, priority } = req.body;
    let projectDiary = await ProjectDiary.findById(diaryId);
    if (!projectDiary) {
        throw new ApiError(404, "Project Diary not found");
    }

    if (typeof title === "string" && title.trim()) {
        projectDiary.title = title.trim();
    }

    if (typeof description === "string") {
        projectDiary.description = description.trim();
    }

    if (status) {
        projectDiary.status = status.toLowerCase();
    }

    if (priority) {
        projectDiary.priority = priority.toLowerCase();
    }


    await projectDiary.save();

    projectDiary = await ProjectDiary.findById(diaryId)
        .populate("createdBy", "name email")
    // .populate("members.userId", "name email");

    return res
        .status(200)
        .json(new ApiResponse(200, { projectDiary }, "Project Diary updated successfully"));
});


export const deleteProjectDiary = asyncHandler(async (req, res) => {
    const { diaryId } = req.params;
    const projectDiary = await ProjectDiary.findByIdAndDelete(diaryId);
    if (!projectDiary) throw new ApiError(404, "Project Diary not found");

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Project Diary deleted successfully"));
});

// --- Status & Priority ---

export const updateDiaryStatus = asyncHandler(async (req, res) => {
    const { diaryId } = req.params;
    const { status } = req.body;

    if (!status) throw new ApiError(400, "Status is required");
    let modifiedStatus = status?.toLowerCase();    // Validate status in route validation or rely on mongoose enum throw (cleaner to catch here if needed)

    const projectDiary = await ProjectDiary.findByIdAndUpdate(
        diaryId,
        { status: modifiedStatus },
        { new: true, runValidators: true }
    );
    if (!projectDiary) throw new ApiError(404, "Project Diary not found");

    return res.status(200).json(new ApiResponse(200, { projectDiary }, "Status updated successfully"));
});

export const updateDiaryPriority = asyncHandler(async (req, res) => {
    const { diaryId } = req.params;
    const { priority } = req.body;

    if (!priority) throw new ApiError(400, "Priority is required");
    let modifiedPriority = priority?.toLowerCase();    // Validate status in route validation or rely on mongoose enum throw (cleaner to catch here if needed)

    const projectDiary = await ProjectDiary.findByIdAndUpdate(
        diaryId,
        { priority: modifiedPriority },
        { new: true, runValidators: true }
    );
    if (!projectDiary) throw new ApiError(404, "Project Diary not found");

    return res.status(200).json(new ApiResponse(200, { projectDiary }, "Priority updated successfully"));
});

// --- Questions ---

export const addQuestion = asyncHandler(async (req, res) => {
    const { diaryId } = req.params;
    const { name, answer, isCompleted } = req.body;

    if (!name) throw new ApiError(400, "Question name is required");

    const projectDiary = await ProjectDiary.findByIdAndUpdate(
        diaryId,
        { $push: { questions: { name, answer, isCompleted: !!isCompleted } } },
        { new: true, runValidators: true }
    );
    if (!projectDiary) throw new ApiError(404, "Project Diary not found");

    return res.status(200).json(new ApiResponse(200, { projectDiary }, "Question added successfully"));
});

export const removeQuestion = asyncHandler(async (req, res) => {
    const { diaryId, questionId } = req.params;

    const projectDiary = await ProjectDiary.findByIdAndUpdate(
        diaryId,
        { $pull: { questions: { _id: questionId } } },
        { new: true }
    );
    if (!projectDiary) throw new ApiError(404, "Project Diary not found");

    return res.status(200).json(new ApiResponse(200, { projectDiary }, "Question removed successfully"));
});

export const updateQuestion = asyncHandler(async (req, res) => {
    const { diaryId, questionId } = req.params;
    const { name, answer, isCompleted } = req.body;

    const updateFields = {};
    if (name !== undefined) updateFields["questions.$.name"] = name;
    if (answer !== undefined) updateFields["questions.$.answer"] = answer;
    if (isCompleted !== undefined) updateFields["questions.$.isCompleted"] = isCompleted;

    const projectDiary = await ProjectDiary.findOneAndUpdate(
        { _id: diaryId, "questions._id": questionId },
        { $set: updateFields },
        { new: true, runValidators: true }
    );
    if (!projectDiary) throw new ApiError(404, "Project Diary or Question not found");

    return res.status(200).json(new ApiResponse(200, { projectDiary }, "Question updated successfully"));
});

// --- User Flow ---

export const addUserFlow = asyncHandler(async (req, res) => {
    const { diaryId } = req.params;
    const { flow } = req.body;

    if (!flow) throw new ApiError(400, "Flow text is required");

    const projectDiary = await ProjectDiary.findByIdAndUpdate(
        diaryId,
        { $push: { userFlow: { flow } } },
        { new: true, runValidators: true }
    );
    if (!projectDiary) throw new ApiError(404, "Project Diary not found");

    return res.status(200).json(new ApiResponse(200, { projectDiary }, "User flow added successfully"));
});

export const removeUserFlow = asyncHandler(async (req, res) => {
    const { diaryId, flowId } = req.params;

    const projectDiary = await ProjectDiary.findByIdAndUpdate(
        diaryId,
        { $pull: { userFlow: { _id: flowId } } },
        { new: true }
    );
    if (!projectDiary) throw new ApiError(404, "Project Diary not found");

    return res.status(200).json(new ApiResponse(200, { projectDiary }, "User flow removed successfully"));
});

export const updateUserFlow = asyncHandler(async (req, res) => {
    const { diaryId, flowId } = req.params;
    const { flow } = req.body;

    if (!flow) throw new ApiError(400, "Flow text is required");

    const projectDiary = await ProjectDiary.findOneAndUpdate(
        { _id: diaryId, "userFlow._id": flowId },
        { $set: { "userFlow.$.flow": flow } },
        { new: true, runValidators: true }
    );
    if (!projectDiary) throw new ApiError(404, "Project Diary or User Flow not found");

    return res.status(200).json(new ApiResponse(200, { projectDiary }, "User flow updated successfully"));
});

// --- Ideas ---

export const addIdea = asyncHandler(async (req, res) => {
    const { diaryId } = req.params;
    const { idea } = req.body;

    if (!idea) throw new ApiError(400, "Idea text is required");

    const projectDiary = await ProjectDiary.findByIdAndUpdate(
        diaryId,
        { $push: { ideas: { idea } } },
        { new: true, runValidators: true }
    );
    if (!projectDiary) throw new ApiError(404, "Project Diary not found");

    return res.status(200).json(new ApiResponse(200, { projectDiary }, "Idea added successfully"));
});

export const removeIdea = asyncHandler(async (req, res) => {
    const { diaryId, ideaId } = req.params;

    const projectDiary = await ProjectDiary.findByIdAndUpdate(
        diaryId,
        { $pull: { ideas: { _id: ideaId } } },
        { new: true }
    );
    if (!projectDiary) throw new ApiError(404, "Project Diary not found");

    return res.status(200).json(new ApiResponse(200, { projectDiary }, "Idea removed successfully"));
});

export const updateIdea = asyncHandler(async (req, res) => {
    const { diaryId, ideaId } = req.params;
    const { idea } = req.body;

    if (!idea) throw new ApiError(400, "Idea text is required");

    const projectDiary = await ProjectDiary.findOneAndUpdate(
        { _id: diaryId, "ideas._id": ideaId },
        { $set: { "ideas.$.idea": idea } },
        { new: true, runValidators: true }
    );
    if (!projectDiary) throw new ApiError(404, "Project Diary or Idea not found");

    return res.status(200).json(new ApiResponse(200, { projectDiary }, "Idea updated successfully"));
});

// --- Project Updates ---

export const addProjectUpdate = asyncHandler(async (req, res) => {
    const { diaryId } = req.params;
    const { update } = req.body;

    if (!update) throw new ApiError(400, "Update text is required");

    const projectDiary = await ProjectDiary.findByIdAndUpdate(
        diaryId,
        { $push: { projectUpdate: { update } } },
        { new: true, runValidators: true }
    );
    if (!projectDiary) throw new ApiError(404, "Project Diary not found");

    return res.status(200).json(new ApiResponse(200, { projectDiary }, "Project update added successfully"));
});

export const removeProjectUpdate = asyncHandler(async (req, res) => {
    const { diaryId, updateId } = req.params;

    const projectDiary = await ProjectDiary.findByIdAndUpdate(
        diaryId,
        { $pull: { projectUpdate: { _id: updateId } } },
        { new: true }
    );
    if (!projectDiary) throw new ApiError(404, "Project Diary not found");

    return res.status(200).json(new ApiResponse(200, { projectDiary }, "Project update removed successfully"));
});

export const updateProjectUpdate = asyncHandler(async (req, res) => {
    const { diaryId, updateId } = req.params;
    const { update } = req.body;

    if (!update) throw new ApiError(400, "Update text is required");

    const projectDiary = await ProjectDiary.findOneAndUpdate(
        { _id: diaryId, "projectUpdate._id": updateId },
        { $set: { "projectUpdate.$.update": update } },
        { new: true, runValidators: true }
    );
    if (!projectDiary) throw new ApiError(404, "Project Diary or Update not found");

    return res.status(200).json(new ApiResponse(200, { projectDiary }, "Project update updated successfully"));
});

// --- Features ---

export const addFeature = asyncHandler(async (req, res) => {
    const { diaryId } = req.params;
    const { name, description, priority, status } = req.body;

    if (!name) throw new ApiError(400, "Feature name is required");

    // isCompleted removed — status is the single source of truth
    const feature = { name, description, priority, status };

    const projectDiary = await ProjectDiary.findByIdAndUpdate(
        diaryId,
        { $push: { features: feature } },
        { new: true, runValidators: true }
    );
    if (!projectDiary) throw new ApiError(404, "Project Diary not found");

    return res.status(200).json(new ApiResponse(200, { projectDiary }, "Feature added successfully"));
});

export const removeFeature = asyncHandler(async (req, res) => {
    const { diaryId, featureId } = req.params;

    const projectDiary = await ProjectDiary.findByIdAndUpdate(
        diaryId,
        { $pull: { features: { _id: featureId } } },
        { new: true }
    );
    if (!projectDiary) throw new ApiError(404, "Project Diary not found");

    return res.status(200).json(new ApiResponse(200, { projectDiary }, "Feature removed successfully"));
});

export const updateFeatureDetails = asyncHandler(async (req, res) => {
    const { diaryId, featureId } = req.params;
    const { name, description } = req.body;

    const updateObj = {};
    if (name !== undefined) updateObj["features.$.name"] = name;
    if (description !== undefined) updateObj["features.$.description"] = description;

    if (Object.keys(updateObj).length === 0) {
        throw new ApiError(400, "At least one field (name or description) is required for update");
    }

    const projectDiary = await ProjectDiary.findOneAndUpdate(
        { _id: diaryId, "features._id": featureId },
        { $set: updateObj },
        { new: true, runValidators: true }
    );
    if (!projectDiary) throw new ApiError(404, "Project Diary or Feature not found");

    return res.status(200).json(new ApiResponse(200, { projectDiary }, "Feature details updated successfully"));
});

export const updateFeaturePriority = asyncHandler(async (req, res) => {
    const { diaryId, featureId } = req.params;
    const { priority } = req.body;

    if (!priority) throw new ApiError(400, "Priority is required");

    const projectDiary = await ProjectDiary.findOneAndUpdate(
        { _id: diaryId, "features._id": featureId },
        { $set: { "features.$.priority": priority } },
        { new: true, runValidators: true }
    );
    if (!projectDiary) throw new ApiError(404, "Project Diary or Feature not found");

    return res.status(200).json(new ApiResponse(200, { projectDiary }, "Feature priority updated successfully"));
});

export const updateFeatureStatus = asyncHandler(async (req, res) => {
    const { diaryId, featureId } = req.params;
    const { status } = req.body;

    if (!status) throw new ApiError(400, "Status is required");

    return res.status(200).json(new ApiResponse(200, { projectDiary }, "Feature status updated successfully"));
});

export const promoteFeatureToRegistry = asyncHandler(async (req, res) => {
    const { diaryId, featureId } = req.params;

    const diary = await ProjectDiary.findById(diaryId);
    if (!diary) throw new ApiError(404, "Project Diary not found");

    const featureIndex = diary.features.findIndex(f => f._id.toString() === featureId);
    if (featureIndex === -1) throw new ApiError(404, "Feature not found in diary");

    const diaryFeature = diary.features[featureIndex];

    if (diaryFeature.spawnedFeatureId) {
        throw new ApiError(400, "This feature has already been promoted to the registry");
    }

    // Map priority
    const priorityMap = {
        "musthave": "high",
        "nicetohave": "low"
    };

    // Create the actual feature
    const newFeature = await Feature.create({
        title: diaryFeature.name,
        description: diaryFeature.description,
        projectId: diary.projectId,
        diaryId: diary._id,
        priority: priorityMap[diaryFeature.priority] || "medium",
        status: "pending",
        createdBy: req.user?._id
    });

    // Update the diary feature and the diary's spawned list
    diary.features[featureIndex].spawnedFeatureId = newFeature._id;
    diary.spawnedFeatures.push(newFeature._id);

    await diary.save();

    return res.status(201).json(new ApiResponse(201, {
        projectDiary: diary,
        newFeature
    }, "Feature successfully promoted to Registry"));
});

export const toggleFeatureCompletion = asyncHandler(async (req, res) => {
    const { diaryId, featureId } = req.params;

    // Find the diary first to read current status, then toggle
    const diary = await ProjectDiary.findOne({ _id: diaryId, "features._id": featureId });
    if (!diary) throw new ApiError(404, "Project Diary or Feature not found");

    const feature = diary.features.id(featureId);
    // Toggle between completed <-> pending (isCompleted field removed)
    feature.status = feature.status === "completed" ? "pending" : "completed";

    await diary.save();

    return res.status(200).json(new ApiResponse(200, { projectDiary: diary }, "Feature completion toggled successfully"));
});


// --- Tags ---

export const addTag = asyncHandler(async (req, res) => {
    const { diaryId } = req.params;
    const { tag } = req.body;

    if (!tag) throw new ApiError(400, "Tag is required");

    const projectDiary = await ProjectDiary.findByIdAndUpdate(
        diaryId,
        { $addToSet: { tags: tag } }, // addToSet prevents duplicates
        { new: true, runValidators: true }
    );
    if (!projectDiary) throw new ApiError(404, "Project Diary not found");

    return res.status(200).json(new ApiResponse(200, { projectDiary }, "Tag added successfully"));
});

export const removeTag = asyncHandler(async (req, res) => {
    const { diaryId, tag } = req.params;

    const projectDiary = await ProjectDiary.findByIdAndUpdate(
        diaryId,
        { $pull: { tags: tag } },
        { new: true }
    );
    if (!projectDiary) throw new ApiError(404, "Project Diary not found");

    return res.status(200).json(new ApiResponse(200, { projectDiary }, "Tag removed successfully"));
});

// --- Reference Links ---

export const addReferenceLink = asyncHandler(async (req, res) => {
    const { diaryId } = req.params;
    const { name, url } = req.body;

    if (!name || !url) throw new ApiError(400, "Name and URL are required");

    const projectDiary = await ProjectDiary.findByIdAndUpdate(
        diaryId,
        { $push: { referenceLinks: { name, url } } },
        { new: true, runValidators: true }
    );
    if (!projectDiary) throw new ApiError(404, "Project Diary not found");

    return res.status(200).json(new ApiResponse(200, { projectDiary }, "Reference link added successfully"));
});

export const removeReferenceLink = asyncHandler(async (req, res) => {
    const { diaryId, linkId } = req.params;

    const projectDiary = await ProjectDiary.findByIdAndUpdate(
        diaryId,
        { $pull: { referenceLinks: { _id: linkId } } },
        { new: true }
    );
    if (!projectDiary) throw new ApiError(404, "Project Diary not found");

    return res.status(200).json(new ApiResponse(200, { projectDiary }, "Reference link removed successfully"));
});

export const updateReferenceLink = asyncHandler(async (req, res) => {
    const { diaryId, linkId } = req.params;
    const { name, url } = req.body;

    const updateFields = {};
    if (name !== undefined) updateFields["referenceLinks.$.name"] = name;
    if (url !== undefined) updateFields["referenceLinks.$.url"] = url;

    const projectDiary = await ProjectDiary.findOneAndUpdate(
        { _id: diaryId, "referenceLinks._id": linkId },
        { $set: updateFields },
        { new: true, runValidators: true }
    );
    if (!projectDiary) throw new ApiError(404, "Project Diary or Reference Link not found");

    return res.status(200).json(new ApiResponse(200, { projectDiary }, "Reference link updated successfully"));
});

// --- Tech Stack ---

export const addTechStack = asyncHandler(async (req, res) => {
    const { diaryId } = req.params;
    const { tech } = req.body;

    if (!tech) throw new ApiError(400, "Tech name is required");

    const projectDiary = await ProjectDiary.findByIdAndUpdate(
        diaryId,
        { $addToSet: { techStack: tech } },
        { new: true, runValidators: true }
    );
    if (!projectDiary) throw new ApiError(404, "Project Diary not found");

    return res.status(200).json(new ApiResponse(200, { projectDiary }, "Tech stack added successfully"));
});

export const removeTechStack = asyncHandler(async (req, res) => {
    const { diaryId, tech } = req.params;

    const projectDiary = await ProjectDiary.findByIdAndUpdate(
        diaryId,
        { $pull: { techStack: tech } },
        { new: true }
    );
    if (!projectDiary) throw new ApiError(404, "Project Diary not found");

    return res.status(200).json(new ApiResponse(200, { projectDiary }, "Tech stack removed successfully"));
});
