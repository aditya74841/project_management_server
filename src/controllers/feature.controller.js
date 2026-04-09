import { Feature } from "../models/feature.model.js";
import { Project } from "../models/projects.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createFeature = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    priority,
    projectId,
    deadline,
    benefits,

    tags = [],
  } = req.body;

  // Check project exists
  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(404, "Project not found");

  const feature = await Feature.create({
    title,
    description,
    priority,
    projectId,
    benefits,
    createdBy: req.user._id,
    deadline: deadline || null,
    tags,
  });

  project.features.push(feature._id);
  await project.save();

  const createdFeature = await Feature.findById(feature._id)
    .populate("createdBy", "name email")
    .populate("assignedTo", "name email")
    .populate("projectId", "name");

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { feature: createdFeature },
        "Feature created successfully"
      )
    );
});

export const getFeaturesByProjectId = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const {
    status,
    priority,
    isCompleted,
    sortBy = "createdAt",
    order = "desc",
  } = req.query;

  const query = { projectId };

  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (isCompleted !== undefined) query.isCompleted = isCompleted === "true";

  const features = await Feature.find(query)
    .populate("createdBy", "name email")
    .populate("assignedTo", "name email")
    .populate("projectId", "name")
    .sort({ [sortBy]: order === "asc" ? 1 : -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, { features }, "Features fetched successfully"));
});

export const getFeatureById = asyncHandler(async (req, res) => {
  const { featureId } = req.params;

  const feature = await Feature.findById(featureId)
    .populate("createdBy", "name email")
    .populate("assignedTo", "name email")
    .populate("projectId", "name");

  if (!feature) throw new ApiError(404, "Feature not found");

  return res
    .status(200)
    .json(new ApiResponse(200, { feature }, "Feature fetched successfully"));
});

export const updateFeature = asyncHandler(async (req, res) => {
  const { featureId } = req.params;
  const { title, description, benefits, deadline, } = req.body;

  let feature = await Feature.findById(featureId);
  if (!feature) throw new ApiError(404, "Feature not found");

  feature.title = title || feature.title;
  feature.description = description || feature.description;
  feature.deadline = deadline || feature.deadline;
  feature.benefits = benefits || feature.benefits;
  if (req.body.priority) feature.priority = req.body.priority;
  if (req.body.status) {
    feature.status = req.body.status;
    feature.isCompleted = req.body.status === "completed";
  }

  await feature.save();

  feature = await Feature.findById(featureId)
    .populate("createdBy", "name email")
    .populate("assignedTo", "name email");

  return res
    .status(200)
    .json(new ApiResponse(200, { feature }, "Feature updated successfully"));
});

export const deleteFeature = asyncHandler(async (req, res) => {
  const { featureId } = req.params;

  const feature = await Feature.findById(featureId);
  if (!feature) throw new ApiError(404, "Feature not found");

  await feature.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Feature deleted successfully"));
});
// TODO: NEED TO COMPLETE LATER
export const assignUsersToFeature = asyncHandler(async (req, res) => {
  const { featureId } = req.params;
  const { userIds } = req.body; // array of users

  const feature = await Feature.findById(featureId);
  if (!feature) throw new ApiError(404, "Feature not found");

  feature.assignedTo = [...new Set([...feature.assignedTo, ...userIds])]; // avoid duplicates
  await feature.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { assignedTo: feature.assignedTo },
        "Users assigned successfully"
      )
    );
});
// TODO: NEED TO COMPLETE LATER

export const removeUserFromFeature = asyncHandler(async (req, res) => {
  const { featureId } = req.params;
  const { userId } = req.body;

  const feature = await Feature.findById(featureId);
  if (!feature) throw new ApiError(404, "Feature not found");

  feature.assignedTo = feature.assignedTo.filter(
    (id) => String(id) !== String(userId)
  );
  await feature.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { assignedTo: feature.assignedTo },
        "User removed successfully"
      )
    );
});

export const addCommentToFeature = asyncHandler(async (req, res) => {
  const { featureId } = req.params;
  const { text } = req.body;

  const feature = await Feature.findById(featureId);
  if (!feature) throw new ApiError(404, "Feature not found");

  const newComment = {
    text,
    createdBy: req.user._id,
  };

  feature.comments.push(newComment);
  await feature.save();

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { comments: feature.comments },
        "Comment added successfully"
      )
    );
});

export const removeCommentFromFeature = asyncHandler(async (req, res) => {
  const { featureId, commentId } = req.params;

  const feature = await Feature.findById(featureId);
  if (!feature) throw new ApiError(404, "Feature not found");

  feature.comments = feature.comments.filter(
    (c) => String(c._id) !== String(commentId)
  );
  await feature.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { comments: feature.comments },
        "Comment removed successfully"
      )
    );
});

export const toggleFeatureCompletion = asyncHandler(async (req, res) => {
  const { featureId } = req.params;

  const feature = await Feature.findById(featureId);
  if (!feature) throw new ApiError(404, "Feature not found");

  feature.isCompleted = !feature.isCompleted;
  feature.status = feature.isCompleted ? "completed" : "pending";

  await feature.save();

  return res
    .status(200)
    .json(new ApiResponse(200, { feature }, "Feature completion toggled"));
});

// ── Priority ───────────────────────────────────────────────────────
export const changePriority = asyncHandler(async (req, res) => {
  const { featureId } = req.params;
  const { priority } = req.body;

  const feature = await Feature.findById(featureId);
  if (!feature) throw new ApiError(404, "Feature not found");

  feature.priority = priority;
  await feature.save();

  return res
    .status(200)
    .json(new ApiResponse(200, { feature }, "Priority updated successfully"));
});

// ── Status ─────────────────────────────────────────────────────────
export const changeStatus = asyncHandler(async (req, res) => {
  const { featureId } = req.params;
  const { status } = req.body;

  const feature = await Feature.findById(featureId);
  if (!feature) throw new ApiError(404, "Feature not found");

  feature.status = status;

  // Auto-sync isCompleted flag
  feature.isCompleted = status === "completed";

  await feature.save();

  return res
    .status(200)
    .json(new ApiResponse(200, { feature }, "Status updated successfully"));
});

// ── Deadline ───────────────────────────────────────────────────────
export const changeDeadline = asyncHandler(async (req, res) => {
  const { featureId } = req.params;
  const { deadline } = req.body;

  const feature = await Feature.findById(featureId);
  if (!feature) throw new ApiError(404, "Feature not found");

  feature.deadline = deadline || null;
  await feature.save();

  return res
    .status(200)
    .json(new ApiResponse(200, { feature }, "Deadline updated successfully"));
});

// ── Update Comment ─────────────────────────────────────────────────
export const updateCommentToFeature = asyncHandler(async (req, res) => {
  const { featureId, commentId } = req.params;
  const { text } = req.body;

  const feature = await Feature.findById(featureId);
  if (!feature) throw new ApiError(404, "Feature not found");

  const comment = feature.comments.id(commentId);
  if (!comment) throw new ApiError(404, "Comment not found");

  comment.text = text;
  await feature.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { comments: feature.comments },
        "Comment updated successfully"
      )
    );
});

// ── Questions CRUD ─────────────────────────────────────────────────
export const createQuestion = asyncHandler(async (req, res) => {
  const { featureId } = req.params;
  const { name, answer } = req.body;

  const feature = await Feature.findById(featureId);
  if (!feature) throw new ApiError(404, "Feature not found");

  feature.questions.push({ name, answer: answer || "" });
  await feature.save();

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { questions: feature.questions },
        "Question created successfully"
      )
    );
});

export const updateQuestion = asyncHandler(async (req, res) => {
  const { featureId, questionId } = req.params;
  const { name, answer } = req.body;

  const feature = await Feature.findById(featureId);
  if (!feature) throw new ApiError(404, "Feature not found");

  const question = feature.questions.id(questionId);
  if (!question) throw new ApiError(404, "Question not found");

  if (name !== undefined) question.name = name;
  if (answer !== undefined) question.answer = answer;

  await feature.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { questions: feature.questions },
        "Question updated successfully"
      )
    );
});

export const deleteQuestion = asyncHandler(async (req, res) => {
  const { featureId, questionId } = req.params;

  const feature = await Feature.findById(featureId);
  if (!feature) throw new ApiError(404, "Feature not found");

  const question = feature.questions.id(questionId);
  if (!question) throw new ApiError(404, "Question not found");

  question.deleteOne();
  await feature.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { questions: feature.questions },
        "Question deleted successfully"
      )
    );
});

export const toggleQuestionCompletion = asyncHandler(async (req, res) => {
  const { featureId, questionId } = req.params;

  const feature = await Feature.findById(featureId);
  if (!feature) throw new ApiError(404, "Feature not found");

  const question = feature.questions.id(questionId);
  if (!question) throw new ApiError(404, "Question not found");

  question.isCompleted = !question.isCompleted;
  await feature.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { questions: feature.questions },
        "Question completion toggled"
      )
    );
});

// ── Tags ───────────────────────────────────────────────────────────
export const addTagsToFeature = asyncHandler(async (req, res) => {
  const { featureId } = req.params;
  const { tag } = req.body;

  if (!tag) throw new ApiError(400, "Tag is required");

  const feature = await Feature.findById(featureId);
  if (!feature) throw new ApiError(404, "Feature not found");

  // Avoid duplicates
  if (!feature.tags.includes(tag)) {
    feature.tags.push(tag);
  }
  await feature.save();

  return res
    .status(200)
    .json(
      new ApiResponse(200, { tags: feature.tags }, "Tag added successfully")
    );
});

export const removeTagsFromFeature = asyncHandler(async (req, res) => {
  const { featureId } = req.params;
  const { tag } = req.body;

  if (!tag) throw new ApiError(400, "Tag is required");

  const feature = await Feature.findById(featureId);
  if (!feature) throw new ApiError(404, "Feature not found");

  feature.tags = feature.tags.filter((t) => t !== tag);
  await feature.save();

  return res
    .status(200)
    .json(
      new ApiResponse(200, { tags: feature.tags }, "Tag removed successfully")
    );
});

// ── Workflow ───────────────────────────────────────────────────────
export const addWorkflow = asyncHandler(async (req, res) => {
  const { featureId } = req.params;
  const { flow } = req.body;

  if (!flow) throw new ApiError(400, "Flow text is required");

  const feature = await Feature.findById(featureId);
  if (!feature) throw new ApiError(404, "Feature not found");

  feature.workFlow.push({ flow });
  await feature.save();

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { workFlow: feature.workFlow },
        "Workflow step added successfully"
      )
    );
});

export const updateWorkflow = asyncHandler(async (req, res) => {
  const { featureId, workflowId } = req.params;
  const { flow } = req.body;

  if (!flow) throw new ApiError(400, "Flow text is required");

  const feature = await Feature.findById(featureId);
  if (!feature) throw new ApiError(404, "Feature not found");

  const step = feature.workFlow.id(workflowId);
  if (!step) throw new ApiError(404, "Workflow step not found");

  step.flow = flow;
  await feature.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { workFlow: feature.workFlow },
        "Workflow step updated successfully"
      )
    );
});

export const deleteWorkflow = asyncHandler(async (req, res) => {
  const { featureId, workflowId } = req.params;

  const feature = await Feature.findById(featureId);
  if (!feature) throw new ApiError(404, "Feature not found");

  const step = feature.workFlow.id(workflowId);
  if (!step) throw new ApiError(404, "Workflow step not found");

  step.deleteOne();
  await feature.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { workFlow: feature.workFlow },
        "Workflow step deleted successfully"
      )
    );
});

// ── Misc ───────────────────────────────────────────────────────────
export const getProjectsName = asyncHandler(async (req, res) => {
  // if (!req.user.companyId) {
  //   throw new ApiError(409, "You are not allowed to get projects");
  // }

  const projects = await Project.find({ createdBy: req.user._id }).select(
    "name _id"
  );

  if (!projects) {
    throw new ApiError(500, "Something went wrong while fetching the data");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, projects || [], "Projects fetched successfully")
    );
});
