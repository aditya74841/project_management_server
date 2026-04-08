


import { Project } from "../models/projects.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


// Create Project
// Get Project
// Get Project By Id
// Update Project
// Delete Project
// Modify the  Status
// Toggle visibility



export const createProject = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    deadline,
    members = [],
    status = "draft",
  } = req.body;

  // Validate required fields
  if (!name || name.trim().length === 0) {
    throw new ApiError(400, "Project name is required");
  }

  // Validate deadline is in the future if provided
  if (deadline) {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of today

    if (isNaN(deadlineDate.getTime())) {
      throw new ApiError(400, "Invalid deadline date format");
    }

    if (deadlineDate < today) {
      throw new ApiError(400, "Deadline must be today or a future date");
    }
  }

  // Check if project with same name exists for this user
  const existingProject = await Project.findOne({
    name: name.trim(),
    createdBy: req.user._id
  });

  if (existingProject) {
    throw new ApiError(409, "You already have a project with this name");
  }

  // Validate member IDs if provided
  const validatedMembers = [];
  if (members.length > 0) {
    const memberUsers = await User.find({
      _id: { $in: members }
    }).select("_id name email");

    if (memberUsers.length !== members.length) {
      throw new ApiError(400, "One or more member IDs are invalid");
    }

    validatedMembers.push(...memberUsers.map(user => ({
      userId: user._id,
      role: "member",
      addedBy: req.user._id
    })));
  }

  // Creator is automatically owner
  // validatedMembers.unshift({
  //   userId: req.user._id,
  //   role: "owner",
  //   addedBy: req.user._id
  // });

  const project = await Project.create({
    name: name.trim(),
    description: description?.trim() || "",
    createdBy: req.user._id,
    members: validatedMembers,
    deadline: deadline || null,
    status,
  });

  const createdProject = await Project.findById(project._id)
    .populate("createdBy", "name email")
    .populate("members.userId", "name email role");

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
  const { status, page = 1, limit = 10, search } = req.query;

  // Build filter for user's projects (projects they created or are members of)
  const filter = {
    $or: [
      { createdBy: req.user._id }, // Projects user created
      { "members.userId": req.user._id } // Projects user is a member of
    ]
  };

  // Add status filter if provided
  if (status && ["draft", "active", "archived", "completed"].includes(status)) {
    filter.status = status;
  }

  // Add search filter if provided
  if (search && search.trim()) {
    filter.$and = filter.$and || [];
    filter.$and.push({
      $or: [
        { name: { $regex: search.trim(), $options: "i" } },
        { description: { $regex: search.trim(), $options: "i" } }
      ]
    });
  }

  try {
    // Query using compound index for optimal performance
    const projects = await Project.find(filter)
      .sort({ createdAt: -1 }) // Latest first
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate("createdBy", "name email")
      .populate("members.userId", "name email role")
      .select("-__v") // Exclude version field
      .lean(); // Better performance for read-only data

    // Get total count for pagination
    const total = await Project.countDocuments(filter);

    // If no projects found, return empty array (not an error)
    const response = {
      projects: projects || [],
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalProjects: total,
        projectsPerPage: parseInt(limit),
        hasNextPage: parseInt(page) < Math.ceil(total / parseInt(limit)),
        hasPrevPage: parseInt(page) > 1
      },
      filters: {
        status: status || "all",
        search: search || ""
      }
    };

    return res.status(200).json(
      new ApiResponse(
        200,
        response,
        `Found ${total} project${total === 1 ? '' : 's'}`
      )
    );

  } catch (error) {
    throw new ApiError(500, "Failed to fetch projects");
  }
});


export const getProjectById = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const project = await Project.findById(projectId)
    .populate("createdBy", "name email")
    .populate("members", "name email role")
    .populate("features", "title status priority")
  // .populate("companyId", "name email");

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

  if (typeof name === "string" && name.trim()) {
    project.name = name.trim();
  }

  if (typeof description === "string") {
    project.description = description.trim();
  }

  if (deadline === null || deadline === "") {
    project.deadline = null;
  } else if (deadline !== undefined) {
    project.deadline = deadline;
  }

  if (typeof status === "string" && status.trim()) {
    project.status = status;
  }

  await project.save();

  project = await Project.findById(projectId)
    .populate("createdBy", "name email")
    .populate("members.userId", "name email");

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

  // Only creator can delete (or superAdmin)
  // if (
  //   String(project.createdBy) !== String(req.user._id) &&
  //   req.user.role !== "SUPERADMIN"
  // ) {
  //   throw new ApiError(403, "You are not authorized to delete this project");
  // }

  // This will automatically trigger the pre-delete middleware
  await project.deleteOne();

  return res.status(200).json(
    new ApiResponse(
      200,
      { deletedProject: projectId },
      "Project and all associated features deleted successfully"
    )
  );
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
export const changeProjectStatus = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const {
    status = "draft",
  } = req.body;
  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(404, "Project not found");

  project.status = status;
  await project.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { status: project.status },
        "Project status changed"
      )
    );
});

export const addMemberToProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { userId } = req.body;

  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(404, "Project not found");

  if (project.members.some(m => String(m.userId) === String(userId))) {
    throw new ApiError(400, "User already a member of the project");
  }

  project.members.push({ userId });
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
    (member) => String(member.userId) !== String(userId)
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
