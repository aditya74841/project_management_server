import { Feature } from "../models/feature.model.js";
import { Project } from "../models/projects.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// ── CRUD ───────────────────────────────────────────────────────────────────────

export const createFeature = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    priority,
    projectId,
    diaryId,
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
    diaryId: diaryId || null,
    benefits: Array.isArray(benefits) ? benefits.map(b => ({ text: b })) : [],
    createdBy: req.user._id,
    deadline: deadline || null,
    tags,
  });

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
    sortBy = "createdAt",
    order = "desc",
  } = req.query;

  const query = { projectId };

  if (status) query.status = status;
  if (priority) query.priority = priority;

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
  const { title, description, deadline } = req.body;

  let feature = await Feature.findById(featureId);
  if (!feature) throw new ApiError(404, "Feature not found");

  if (title !== undefined) feature.title = title;
  if (description !== undefined) feature.description = description;
  if (deadline !== undefined) feature.deadline = deadline || null;
  if (req.body.priority) feature.priority = req.body.priority;
  if (req.body.status) feature.status = req.body.status;

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

  // This triggers the pre-deleteOne hook which cascade-deletes comments
  await feature.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Feature deleted successfully"));
});

// ── User Assignment ────────────────────────────────────────────────────────────

export const assignUsersToFeature = asyncHandler(async (req, res) => {
  const { featureId } = req.params;
  const { userIds } = req.body;

  const feature = await Feature.findById(featureId);
  if (!feature) throw new ApiError(404, "Feature not found");

  feature.assignedTo = [...new Set([...feature.assignedTo.map(String), ...userIds])];
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

// ── Priority ───────────────────────────────────────────────────────────────────

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

// ── Status ─────────────────────────────────────────────────────────────────────

export const changeStatus = asyncHandler(async (req, res) => {
  const { featureId } = req.params;
  const { status } = req.body;

  const feature = await Feature.findById(featureId);
  if (!feature) throw new ApiError(404, "Feature not found");

  feature.status = status;
  await feature.save();

  return res
    .status(200)
    .json(new ApiResponse(200, { feature }, "Status updated successfully"));
});

// ── Deadline ───────────────────────────────────────────────────────────────────

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

// ── Questions CRUD ─────────────────────────────────────────────────────────────

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

// ── Tags ───────────────────────────────────────────────────────────────────────

export const addTagsToFeature = asyncHandler(async (req, res) => {
  const { featureId } = req.params;
  const { tag } = req.body;

  if (!tag) throw new ApiError(400, "Tag is required");

  const feature = await Feature.findById(featureId);
  if (!feature) throw new ApiError(404, "Feature not found");

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

// ── Workflow ───────────────────────────────────────────────────────────────────

export const addWorkflow = asyncHandler(async (req, res) => {
  const { featureId } = req.params;
  const { flow } = req.body;

  if (!flow) throw new ApiError(400, "Flow text is required");

  const feature = await Feature.findById(featureId);
  if (!feature) throw new ApiError(404, "Feature not found");

  feature.workflow.push({ flow });
  await feature.save();

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { workflow: feature.workflow },
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

  const step = feature.workflow.id(workflowId);
  if (!step) throw new ApiError(404, "Workflow step not found");

  step.flow = flow;
  await feature.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { workflow: feature.workflow },
        "Workflow step updated successfully"
      )
    );
});

export const deleteWorkflow = asyncHandler(async (req, res) => {
  const { featureId, workflowId } = req.params;

  const feature = await Feature.findById(featureId);
  if (!feature) throw new ApiError(404, "Feature not found");

  const step = feature.workflow.id(workflowId);
  if (!step) throw new ApiError(404, "Workflow step not found");

  step.deleteOne();
  await feature.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { workflow: feature.workflow },
        "Workflow step deleted successfully"
      )
    );
});

// ── Benefits ──────────────────────────────────────────────────────────────────

export const addBenefit = asyncHandler(async (req, res) => {
  const { featureId } = req.params;
  const { text } = req.body;

  const feature = await Feature.findById(featureId);
  if (!feature) throw new ApiError(404, "Feature not found");

  feature.benefits.push({ text });
  await feature.save();

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { benefits: feature.benefits },
        "Benefit added successfully"
      )
    );
});

export const updateBenefit = asyncHandler(async (req, res) => {
  const { featureId, benefitId } = req.params;
  const { text } = req.body;

  const feature = await Feature.findById(featureId);
  if (!feature) throw new ApiError(404, "Feature not found");

  const benefit = feature.benefits.id(benefitId);
  if (!benefit) throw new ApiError(404, "Benefit not found");

  benefit.text = text;
  await feature.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { benefits: feature.benefits },
        "Benefit updated successfully"
      )
    );
});

export const deleteBenefit = asyncHandler(async (req, res) => {
  const { featureId, benefitId } = req.params;

  const feature = await Feature.findById(featureId);
  if (!feature) throw new ApiError(404, "Feature not found");

  const benefit = feature.benefits.id(benefitId);
  if (!benefit) throw new ApiError(404, "Benefit not found");

  benefit.deleteOne(); // Use Mongoose sub-document deleteOne
  await feature.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { benefits: feature.benefits },
        "Benefit deleted successfully"
      )
    );
});

// ── Misc ───────────────────────────────────────────────────────────────────────

export const getProjectsName = asyncHandler(async (req, res) => {
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
