import { Project } from "../models/projects.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createProject = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    companyId = null,
    deadline,
    members = [],
  } = req.body;

  if (!req.user.companyId) {
    throw new ApiError(409, "You are not allowed to create projects");
  }
  let updatedCompanyId = "";
  if (!companyId) {
    updatedCompanyId = req.user.companyId;
  }

  const existingProject = await Project.findOne({ name, updatedCompanyId });
  if (existingProject) {
    throw new ApiError(
      409,
      "A project with this name already exists in the company"
    );
  }

  const project = await Project.create({
    name,
    description,
    companyId: updatedCompanyId,
    createdBy: req.user._id,
    members: [req.user._id, ...members], // creator is also a member
    deadline: deadline || null,
  });

  const createdProject = await Project.findById(project._id)
    .populate("createdBy", "name email")
    .populate("members", "name email role")
    .populate("companyId", "name email");

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { project: createdProject },
        "Project created successfully"
      )
    );
});

export const getProject = asyncHandler(async (req, res) => {
  if (!req.user.companyId) {
    throw new ApiError(409, "You are not allowed to get projects");
  }

  const projects = await Project.find({ companyId: req.user.companyId });
  if (!projects) {
    throw new ApiError(500, "Something wnet wrong while fetching the data");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, projects || [], "Project fetched successfully"));
});

export const getProjectById = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const project = await Project.findById(projectId)
    .populate("createdBy", "name email")
    .populate("members", "name email role")
    .populate("features", "title status priority")
    .populate("companyId", "name email");

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { project }, "Project fetched successfully"));
});

export const updateProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { name, description, deadline, status } = req.body;

  let project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  project.name = name || project.name;
  project.description = description || project.description;
  project.deadline = deadline || project.deadline;
  project.status = status || project.status;

  await project.save();

  project = await Project.findById(projectId)
    .populate("createdBy", "name email")
    .populate("members", "name email role");

  return res
    .status(200)
    .json(new ApiResponse(200, { project }, "Project updated successfully"));
});

export const deleteProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  // Only creator can delete (or superAdmin if you want)
  if (
    String(project.createdBy) !== String(req.user._id) &&
    req.user.role !== "superAdmin"
  ) {
    throw new ApiError(403, "You are not authorized to delete this project");
  }

  await project.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Project deleted successfully"));
});

export const toggleProjectVisibility = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(404, "Project not found");

  project.isShown = !project.isShown;
  await project.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isShown: project.isShown },
        "Project visibility toggled"
      )
    );
});

export const addMemberToProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { userId } = req.body;

  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(404, "Project not found");

  if (project.members.includes(userId)) {
    throw new ApiError(400, "User already a member of the project");
  }

  project.members.push(userId);
  await project.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { members: project.members },
        "Member added successfully"
      )
    );
});

export const removeMemberFromProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { userId } = req.body;

  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(404, "Project not found");

  project.members = project.members.filter(
    (memberId) => String(memberId) !== String(userId)
  );

  await project.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { members: project.members },
        "Member removed successfully"
      )
    );
});

export const assignFeatureToProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { featureId } = req.body;

  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(404, "Project not found");

  if (project.features.includes(featureId)) {
    throw new ApiError(400, "Feature already assigned to this project");
  }

  project.features.push(featureId);
  await project.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { features: project.features },
        "Feature assigned successfully"
      )
    );
});

export const unassignFeatureFromProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { featureId } = req.body;

  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(404, "Project not found");

  project.features = project.features.filter(
    (fId) => String(fId) !== String(featureId)
  );

  await project.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { features: project.features },
        "Feature unassigned successfully"
      )
    );
});
