import { Feature } from "../models/feature.model.js";
import { Project } from "../models/projects.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";



export const createFeature = asyncHandler(async (req, res) => {
    const { title, description, priority, projectId, deadline, tags = [] } = req.body;
  
    // Check project exists
    const project = await Project.findById(projectId);
    if (!project) throw new ApiError(404, "Project not found");
  
    const feature = await Feature.create({
      title,
      description,
      priority,
      projectId,
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
      .json(new ApiResponse(201, { feature: createdFeature }, "Feature created successfully"));
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
    const { title, description, status, priority, deadline, tags } = req.body;
  
    let feature = await Feature.findById(featureId);
    if (!feature) throw new ApiError(404, "Feature not found");
  
    feature.title = title || feature.title;
    feature.description = description || feature.description;
    feature.status = status || feature.status;
    feature.priority = priority || feature.priority;
    feature.deadline = deadline || feature.deadline;
    feature.tags = tags || feature.tags;
  
    feature.isCompleted = feature.status === "completed";
  
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
  
    // Remove from project.features
    await Project.findByIdAndUpdate(feature.projectId, {
      $pull: { features: feature._id },
    });
  
    await feature.deleteOne();
  
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Feature deleted successfully"));
  });
  

  export const assignUsersToFeature = asyncHandler(async (req, res) => {
    const { featureId } = req.params;
    const { userIds } = req.body; // array of users
  
    const feature = await Feature.findById(featureId);
    if (!feature) throw new ApiError(404, "Feature not found");
  
    feature.assignedTo = [...new Set([...feature.assignedTo, ...userIds])]; // avoid duplicates
    await feature.save();
  
    return res
      .status(200)
      .json(new ApiResponse(200, { assignedTo: feature.assignedTo }, "Users assigned successfully"));
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
      .json(new ApiResponse(200, { assignedTo: feature.assignedTo }, "User removed successfully"));
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
      .json(new ApiResponse(201, { comments: feature.comments }, "Comment added successfully"));
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
      .json(new ApiResponse(200, { comments: feature.comments }, "Comment removed successfully"));
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
  

  export const getFeaturesByProjectId = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const { status, priority, isCompleted, sortBy = "createdAt", order = "desc" } = req.query;
  
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
  