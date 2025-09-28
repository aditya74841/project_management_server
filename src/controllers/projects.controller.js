


import { Project } from "../models/projects.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createProject = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    deadline,
    members = [],
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




// // controllers/projects.controller.js
// import { Project } from "../models/projects.model.js";
// import { User } from "../models/user.model.js";
// import { ApiError } from "../utils/ApiError.js";
// import { ApiResponse } from "../utils/ApiResponse.js";
// import { asyncHandler } from "../utils/asyncHandler.js";

// // Helper function to get tenant context (future-proofing)
// const getTenantContext = (user) => {
//   return {
//     companyId: user.companyId,
//     // Future: add tenantId, workspaceId based on user context
//     tenantId: user.tenantId || null,
//     workspaceId: user.workspaceId || null,
//   };
// };

// // Helper to check if user can manage project (admin/owner level access)
// const canManageProject = (project, userId, userRole) => {
//   if (userRole === "SUPERADMIN") return true;
//   if (project.createdBy.toString() === userId.toString()) return true;
//   return project.hasPermission(userId, "admin");
// };

// export const createProject = asyncHandler(async (req, res) => {
//   const { name, description, deadline, members = [] } = req.body;
  
//   if (!req.user.companyId) {
//     throw new ApiError(403, "You must be associated with a company to create projects");
//   }

//   const tenantContext = getTenantContext(req.user);
  
//   // Check for existing project using the compound index
//   const existingProject = await Project.findOne({ 
//     name, 
//     companyId: tenantContext.companyId 
//   });
  
//   if (existingProject) {
//     throw new ApiError(409, "A project with this name already exists in your company");
//   }

//   // Validate member IDs if provided
//   const validatedMembers = [];
//   if (members.length > 0) {
//     const memberUsers = await User.find({ 
//       _id: { $in: members },
//       companyId: tenantContext.companyId // Ensure members are from same company
//     }).select("_id name email");
    
//     validatedMembers.push(...memberUsers.map(user => ({
//       userId: user._id,
//       role: "member",
//       addedBy: req.user._id
//     })));
//   }

//   // Creator is automatically owner
//   validatedMembers.unshift({
//     userId: req.user._id,
//     role: "owner",
//     addedBy: req.user._id
//   });

//   const project = await Project.create({
//     name,
//     description,
//     companyId: tenantContext.companyId,
//     createdBy: req.user._id,
//     members: validatedMembers,
//     deadline: deadline || null,
//     // Future: populate tenant fields
//     tenantId: tenantContext.tenantId,
//     workspaceId: tenantContext.workspaceId,
//   });

//   const createdProject = await Project.findById(project._id)
//     .populate("createdBy", "name email")
//     .populate("members.userId", "name email role")
//     .populate("companyId", "name");

//   return res
//     .status(201)
//     .json(new ApiResponse(201, { project: createdProject }, "Project created successfully"));
// });

// export const getProjects = asyncHandler(async (req, res) => {
//   if (!req.user.companyId) {
//     throw new ApiError(403, "You must be associated with a company to view projects");
//   }

//   const tenantContext = getTenantContext(req.user);
//   const { status, page = 1, limit = 10 } = req.query;
  
//   // Build filter using compound index: companyId + status + createdAt
//   const filter = { companyId: tenantContext.companyId };
//   if (status && ["draft", "active", "archived", "completed"].includes(status)) {
//     filter.status = status;
//   }

//   // Query using the compound index for optimal performance
//   const projects = await Project.find(filter)
//     .sort({ createdAt: -1 }) // Matches compound index sort order
//     .limit(limit * 1)
//     .skip((page - 1) * limit)
//     .populate("createdBy", "name email")
//     .populate("members.userId", "name email")
//     .select("-features"); // Exclude features for list view

//   const total = await Project.countDocuments(filter);

//   return res.status(200).json(
//     new ApiResponse(200, {
//       projects,
//       pagination: {
//         current: page,
//         total: Math.ceil(total / limit),
//         count: projects.length,
//         totalRecords: total
//       }
//     }, "Projects fetched successfully")
//   );
// });

// export const getProjectById = asyncHandler(async (req, res) => {
//   const { projectId } = req.params;

//   const project = await Project.findById(projectId)
//     .populate("createdBy", "name email")
//     .populate("members.userId", "name email role")
//     .populate("features", "title status priority")
//     .populate("companyId", "name");

//   if (!project) {
//     throw new ApiError(404, "Project not found");
//   }

//   // Check if user has access to this project
//   if (!project.hasPermission(req.user._id, "viewer") && req.user.role !== "SUPERADMIN") {
//     throw new ApiError(403, "You don't have permission to view this project");
//   }

//   return res.status(200).json(
//     new ApiResponse(200, { project }, "Project fetched successfully")
//   );
// });

// export const updateProject = asyncHandler(async (req, res) => {
//   const { projectId } = req.params;
//   const { name, description, deadline, status } = req.body;

//   const project = await Project.findById(projectId);
//   if (!project) {
//     throw new ApiError(404, "Project not found");
//   }

//   // Check management permissions
//   if (!canManageProject(project, req.user._id, req.user.role)) {
//     throw new ApiError(403, "You don't have permission to update this project");
//   }

//   // If changing name, check for conflicts
//   if (name && name !== project.name) {
//     const existingProject = await Project.findOne({
//       name,
//       companyId: project.companyId,
//       _id: { $ne: projectId }
//     });
//     if (existingProject) {
//       throw new ApiError(409, "A project with this name already exists");
//     }
//   }

//   // Update fields
//   if (name) project.name = name;
//   if (description !== undefined) project.description = description;
//   if (deadline !== undefined) project.deadline = deadline;
//   if (status) project.status = status;

//   await project.save();

//   const updatedProject = await Project.findById(projectId)
//     .populate("createdBy", "name email")
//     .populate("members.userId", "name email role");

//   return res.status(200).json(
//     new ApiResponse(200, { project: updatedProject }, "Project updated successfully")
//   );
// });

// export const deleteProject = asyncHandler(async (req, res) => {
//   const { projectId } = req.params;

//   const project = await Project.findById(projectId);
//   if (!project) {
//     throw new ApiError(404, "Project not found");
//   }

//   // Only creator or superAdmin can delete
//   if (
//     project.createdBy.toString() !== req.user._id.toString() &&
//     req.user.role !== "SUPERADMIN"
//   ) {
//     throw new ApiError(403, "Only the project creator can delete this project");
//   }

//   await project.deleteOne();

//   return res.status(200).json(
//     new ApiResponse(200, {}, "Project deleted successfully")
//   );
// });

// export const toggleProjectVisibility = asyncHandler(async (req, res) => {
//   const { projectId } = req.params;

//   const project = await Project.findById(projectId);
//   if (!project) throw new ApiError(404, "Project not found");

//   if (!canManageProject(project, req.user._id, req.user.role)) {
//     throw new ApiError(403, "You don't have permission to change project visibility");
//   }

//   project.isShown = !project.isShown;
//   await project.save();

//   return res.status(200).json(
//     new ApiResponse(200, { isShown: project.isShown }, "Project visibility updated")
//   );
// });

// export const updateMemberRole = asyncHandler(async (req, res) => {
//   const { projectId } = req.params;
//   const { userId, role } = req.body;

//   if (!["viewer", "member", "admin"].includes(role)) {
//     throw new ApiError(400, "Invalid role. Must be viewer, member, or admin");
//   }

//   const project = await Project.findById(projectId);
//   if (!project) throw new ApiError(404, "Project not found");

//   if (!canManageProject(project, req.user._id, req.user.role)) {
//     throw new ApiError(403, "You don't have permission to update member roles");
//   }

//   const member = project.members.find(m => m.userId.toString() === userId);
//   if (!member) {
//     throw new ApiError(404, "User is not a member of this project");
//   }

//   // Can't change creator's role
//   if (project.createdBy.toString() === userId) {
//     throw new ApiError(400, "Cannot change the project creator's role");
//   }

//   member.role = role;
//   await project.save();

//   return res.status(200).json(
//     new ApiResponse(200, { members: project.members }, "Member role updated")
//   );
// });

// export const addMemberToProject = asyncHandler(async (req, res) => {
//   const { projectId } = req.params;
//   const { userId, role = "member" } = req.body;

//   const project = await Project.findById(projectId);
//   if (!project) throw new ApiError(404, "Project not found");

//   if (!canManageProject(project, req.user._id, req.user.role)) {
//     throw new ApiError(403, "You don't have permission to add members");
//   }

//   // Check if user exists and is in same company
//   const user = await User.findOne({ 
//     _id: userId, 
//     companyId: project.companyId 
//   });
//   if (!user) {
//     throw new ApiError(404, "User not found or not in the same company");
//   }

//   if (project.members.some(m => m.userId.toString() === userId)) {
//     throw new ApiError(400, "User is already a member of this project");
//   }

//   project.members.push({
//     userId,
//     role,
//     addedBy: req.user._id
//   });
//   await project.save();

//   const updatedProject = await Project.findById(projectId)
//     .populate("members.userId", "name email role");

//   return res.status(200).json(
//     new ApiResponse(200, { members: updatedProject.members }, "Member added successfully")
//   );
// });

// export const removeMemberFromProject = asyncHandler(async (req, res) => {
//   const { projectId } = req.params;
//   const { userId } = req.body;

//   const project = await Project.findById(projectId);
//   if (!project) throw new ApiError(404, "Project not found");

//   if (!canManageProject(project, req.user._id, req.user.role)) {
//     throw new ApiError(403, "You don't have permission to remove members");
//   }

//   // Cannot remove the creator
//   if (project.createdBy.toString() === userId) {
//     throw new ApiError(400, "Cannot remove the project creator");
//   }

//   project.members = project.members.filter(
//     member => member.userId.toString() !== userId
//   );
//   await project.save();

//   return res.status(200).json(
//     new ApiResponse(200, { members: project.members }, "Member removed successfully")
//   );
// });

// export const assignFeatureToProject = asyncHandler(async (req, res) => {
//   const { projectId } = req.params;
//   const { featureId } = req.body;

//   const project = await Project.findById(projectId);
//   if (!project) throw new ApiError(404, "Project not found");

//   if (!project.hasPermission(req.user._id, "member")) {
//     throw new ApiError(403, "You don't have permission to assign features");
//   }

//   if (project.features.includes(featureId)) {
//     throw new ApiError(400, "Feature already assigned to this project");
//   }

//   project.features.push(featureId);
//   await project.save();

//   return res.status(200).json(
//     new ApiResponse(200, { features: project.features }, "Feature assigned successfully")
//   );
// });

// export const unassignFeatureFromProject = asyncHandler(async (req, res) => {
//   const { projectId } = req.params;
//   const { featureId } = req.body;

//   const project = await Project.findById(projectId);
//   if (!project) throw new ApiError(404, "Project not found");

//   if (!canManageProject(project, req.user._id, req.user.role)) {
//     throw new ApiError(403, "You don't have permission to unassign features");
//   }

//   project.features = project.features.filter(
//     fId => fId.toString() !== featureId
//   );
//   await project.save();

//   return res.status(200).json(
//     new ApiResponse(200, { features: project.features }, "Feature unassigned successfully")
//   );
// });

