import { Comment } from "../models/comment.model.js";
import { Feature } from "../models/feature.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// ── Create Comment ─────────────────────────────────────────────────────────────

export const createComment = asyncHandler(async (req, res) => {
  const { featureId, text } = req.body;

  // Verify the feature exists
  const feature = await Feature.findById(featureId);
  if (!feature) throw new ApiError(404, "Feature not found");

  const comment = await Comment.create({
    featureId,
    text,
    createdBy: req.user._id,
  });

  const populatedComment = await Comment.findById(comment._id)
    .populate("createdBy", "name email");

  return res
    .status(201)
    .json(
      new ApiResponse(201, { comment: populatedComment }, "Comment created successfully")
    );
});

// ── Get Comments by Feature ────────────────────────────────────────────────────

export const getCommentsByFeature = asyncHandler(async (req, res) => {
  const { featureId } = req.params;
  const { page = 1, limit = 20 } = req.query;

  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);
  const skip = (pageNumber - 1) * limitNumber;

  const comments = await Comment.find({ featureId })
    .populate("createdBy", "name email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNumber);

  const total = await Comment.countDocuments({ featureId });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          comments,
          pagination: {
            total,
            page: pageNumber,
            limit: limitNumber,
            pages: Math.ceil(total / limitNumber),
          },
        },
        "Comments fetched successfully"
      )
    );
});

// ── Update Comment ─────────────────────────────────────────────────────────────

export const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { text } = req.body;

  const comment = await Comment.findById(commentId);
  if (!comment) throw new ApiError(404, "Comment not found");

  // Only the author can update their comment
  if (String(comment.createdBy) !== String(req.user._id)) {
    throw new ApiError(403, "You can only edit your own comments");
  }

  comment.text = text;
  await comment.save();

  const updatedComment = await Comment.findById(commentId)
    .populate("createdBy", "name email");

  return res
    .status(200)
    .json(
      new ApiResponse(200, { comment: updatedComment }, "Comment updated successfully")
    );
});

// ── Delete Comment ─────────────────────────────────────────────────────────────

export const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  const comment = await Comment.findById(commentId);
  if (!comment) throw new ApiError(404, "Comment not found");

  // Author or admin can delete
  if (
    String(comment.createdBy) !== String(req.user._id) &&
    req.user.role !== "SUPERADMIN" &&
    req.user.role !== "ADMIN"
  ) {
    throw new ApiError(403, "You are not authorized to delete this comment");
  }

  await comment.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment deleted successfully"));
});
