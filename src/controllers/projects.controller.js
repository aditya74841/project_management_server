import { Project } from "../models/projects.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// ── CRUD ───────────────────────────────────────────────────────────────────────

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
    today.setHours(0, 0, 0, 0);

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
    createdBy: req.user._id,
  });

  if (existingProject) {
    throw new ApiError(409, "You already have a project with this name");
  }

  // Validate member IDs if provided
  if (members.length > 0) {
    const memberUsers = await User.find({
      _id: { $in: members },
    }).select("_id");

    if (memberUsers.length !== members.length) {
      throw new ApiError(400, "One or more member IDs are invalid");
    }
  }

  const project = await Project.create({
    name: name.trim(),
    description: description?.trim() || "",
    createdBy: req.user._id,
    members,
    deadline: deadline || null,
    status,
  });

  const createdProject = await Project.findById(project._id)
    .populate("createdBy", "name email")
    .populate("members", "name email");

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
      { createdBy: req.user._id },
      { members: req.user._id },
    ],
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
        { description: { $regex: search.trim(), $options: "i" } },
      ],
    });
  }

  try {
    const projects = await Project.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate("createdBy", "name email")
      .populate("members", "name email")
      .select("-__v")
      .lean();
    const total = await Project.countDocuments(filter);

    const response = {
      projects: (projects || []).filter(p => p && p._id),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalProjects: total,
        projectsPerPage: parseInt(limit),
        hasNextPage: parseInt(page) < Math.ceil(total / parseInt(limit)),
        hasPrevPage: parseInt(page) > 1,
      },
      filters: {
        status: status || "all",
        search: search || "",
      },
    };
    return res.status(200).json(
      new ApiResponse(
        200,
        response,
        `Found ${total} project${total === 1 ? "" : "s"}`
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
    .populate("members", "name email");

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
    .populate("members", "name email");

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

  // This triggers cascade delete (Features, ProjectDiaries, Comments)
  await project.deleteOne();

  return res.status(200).json(
    new ApiResponse(
      200,
      { deletedProject: projectId },
      "Project and all associated data deleted successfully"
    )
  );
});

// ── Status ─────────────────────────────────────────────────────────────────────

export const changeProjectStatus = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { status = "draft" } = req.body;

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

// ── Members ────────────────────────────────────────────────────────────────────

export const addMemberToProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { userId } = req.body;

  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(404, "Project not found");

  if (project.members.some((m) => String(m) === String(userId))) {
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

// ── Tags ───────────────────────────────────────────────────────────────────────

export const addTagToProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { tag } = req.body;

  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(404, "Project not found");

  const normalizedTag = tag.trim();

  // Check for duplicate
  if (project.tags.includes(normalizedTag)) {
    throw new ApiError(400, "Tag already exists in this project");
  }

  project.tags.push(normalizedTag);
  await project.save();

  return res
    .status(200)
    .json(new ApiResponse(200, { tags: project.tags }, "Tag added successfully"));
});

export const removeTagFromProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { tag } = req.body;

  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(404, "Project not found");

  project.tags = project.tags.filter((t) => t !== tag.trim());
  await project.save();

  return res
    .status(200)
    .json(new ApiResponse(200, { tags: project.tags }, "Tag removed successfully"));
});

// ── Tech Stack Category Management ──────────────────────────────────────────

export const addTechStackCategory = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { categoryName } = req.body;

  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(404, "Project not found");

  const normalizedName = categoryName.trim();

  // Check if category already exists
  const categoryExists = project.techStack.some(
    (item) => item.name.toLowerCase() === normalizedName.toLowerCase()
  );

  if (categoryExists) {
    throw new ApiError(400, `Category '${normalizedName}' already exists`);
  }

  project.techStack.push({ name: normalizedName, tech: [] });
  await project.save();

  return res
    .status(201)
    .json(new ApiResponse(201, { techStack: project.techStack }, "Category added successfully"));
});

export const updateTechStackCategory = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { categoryName, newCategoryName } = req.body;

  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(404, "Project not found");

  const currentName = categoryName.trim().toLowerCase();
  const nextName = newCategoryName.trim();

  const categoryIndex = project.techStack.findIndex(
    (item) => item.name.toLowerCase() === currentName
  );

  if (categoryIndex === -1) {
    throw new ApiError(404, "Category not found");
  }

  project.techStack[categoryIndex].name = nextName;
  await project.save();

  return res
    .status(200)
    .json(new ApiResponse(200, { techStack: project.techStack }, "Category renamed successfully"));
});

export const removeTechStackCategory = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { categoryName } = req.body;

  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(404, "Project not found");

  const targetName = categoryName.trim().toLowerCase();

  project.techStack = project.techStack.filter(
    (item) => item.name.toLowerCase() !== targetName
  );

  await project.save();

  return res
    .status(200)
    .json(new ApiResponse(200, { techStack: project.techStack }, "Category removed successfully"));
});

// ── Tech Item Management ──────────────────────────────────────────────────────

export const addTechItem = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { categoryName, techName, description = "" } = req.body;

  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(404, "Project not found");

  const normalizedCat = categoryName.trim().toLowerCase();
  const normalizedTech = techName.trim();

  const categoryIndex = project.techStack.findIndex(
    (item) => item.name.toLowerCase() === normalizedCat
  );

  if (categoryIndex === -1) {
    throw new ApiError(404, `Category '${categoryName}' not found. Please create it first.`);
  }

  // Check if tech already exists in this category
  const techExists = project.techStack[categoryIndex].tech.some(
    (t) => t.name.toLowerCase() === normalizedTech.toLowerCase()
  );

  if (techExists) {
    throw new ApiError(400, `Tech '${normalizedTech}' already exists in this category`);
  }

  project.techStack[categoryIndex].tech.push({
    name: normalizedTech,
    description: description.trim(),
  });

  await project.save();

  return res
    .status(201)
    .json(new ApiResponse(201, { techStack: project.techStack }, "Tech item added successfully"));
});

export const updateTechItem = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { categoryName, techName, newTechName, newDescription } = req.body;

  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(404, "Project not found");

  const normalizedCat = categoryName.trim().toLowerCase();
  const normalizedTech = techName.trim().toLowerCase();

  const categoryIndex = project.techStack.findIndex(
    (item) => item.name.toLowerCase() === normalizedCat
  );

  if (categoryIndex === -1) throw new ApiError(404, "Category not found");

  const techIndex = project.techStack[categoryIndex].tech.findIndex(
    (t) => t.name.toLowerCase() === normalizedTech
  );

  if (techIndex === -1) throw new ApiError(404, "Tech item not found in this category");

  if (newTechName && newTechName.trim()) {
    project.techStack[categoryIndex].tech[techIndex].name = newTechName.trim();
  }

  if (typeof newDescription === "string") {
    project.techStack[categoryIndex].tech[techIndex].description = newDescription.trim();
  }

  await project.save();

  return res
    .status(200)
    .json(new ApiResponse(200, { techStack: project.techStack }, "Tech item updated successfully"));
});

export const removeTechItem = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { categoryName, techName } = req.body;

  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(404, "Project not found");

  const normalizedCat = categoryName.trim().toLowerCase();
  const normalizedTech = techName.trim().toLowerCase();

  const categoryIndex = project.techStack.findIndex(
    (item) => item.name.toLowerCase() === normalizedCat
  );

  if (categoryIndex === -1) throw new ApiError(404, "Category not found");

  project.techStack[categoryIndex].tech = project.techStack[categoryIndex].tech.filter(
    (t) => t.name.toLowerCase() !== normalizedTech
  );

  await project.save();

  return res
    .status(200)
    .json(new ApiResponse(200, { techStack: project.techStack }, "Tech item removed successfully"));
});

export const addLink = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { name, url } = req.body;


  if (!projectId) throw new ApiError(404, "Project ID not found");

  if (!name || !url) throw new ApiError(400, "Name and URL are required");

  const normalizedname = name.trim().toLowerCase();

  const projectLinks = await Project.findByIdAndUpdate(
    projectId,
    { $push: { links: { name: normalizedname, url } } },
    { new: true, runValidators: true }
  );
  // Check if tech already exists in this category
  if (!projectLinks) throw new ApiError(404, "Project Link not found");


  return res.status(200).json(new ApiResponse(200, { projectLinks }, "Reference link added successfully"));
});

export const updateLink = asyncHandler(async (req, res) => {
  const { projectId, linkId } = req.params;
  const { name, url } = req.body;


  if (!projectId || !linkId) throw new ApiError(404, "Project  or Link ID not found");



  const updateFields = {};
  if (name !== undefined) updateFields["links.$.name"] = name;
  if (url !== undefined) updateFields["links.$.url"] = url;

  const project = await Project.findOneAndUpdate(
    { _id: projectId, "links._id": linkId },
    { $set: updateFields },
    { new: true, runValidators: true }
  );
  if (!project) throw new ApiError(404, "Project or Reference Link not found");

  return res.status(200).json(new ApiResponse(200, { project }, "Reference link updated successfully"));
});

export const removeLink = asyncHandler(async (req, res) => {
  const { projectId, linkId } = req.params;

  if (!projectId || !linkId) throw new ApiError(404, "Project  or Link ID not found");

  const project = await Project.findByIdAndUpdate(
    projectId,
    { $pull: { links: { _id: linkId } } },
    { new: true, runValidators: true }
  );
  if (!project) throw new ApiError(404, "Project or Reference Link not found");

  return res.status(200).json(new ApiResponse(200, { project }, "Reference link removed successfully"));
});