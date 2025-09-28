
import mongoose, { Schema } from "mongoose";

const projectSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    status: {
      type: String,
      enum: ["draft", "active", "archived", "completed"],
      default: "active",
      index: true,
    },
    deadline: {
      type: Date,
      default: null,
    },
    features: [
      {
        type: Schema.Types.ObjectId,
        ref: "Feature",
      },
    ],

    isShown: {
      type: Boolean,
      default: false,
    },
    owner: { type: Schema.Types.ObjectId, ref: "User", default: null }, // add-only; fill later
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      default: null,
    }, // add-only
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", default: null }, // add-only alternative
  },
  { timestamps: true }
);

// Ensure unique project names per company
projectSchema.index({ name: 1, companyId: 1 }, { unique: true });

// projectSchema.index(
//   { owner: 1, name: 1 }, 
//   { unique: true, partialFilterExpression: { owner: { $exists: true } } }
// );
// projectSchema.index(
//   { workspaceId: 1, name: 1 }, 
//   { unique: true, partialFilterExpression: { workspaceId: { $exists: true } } }
// );




// Add this middleware to your project schema
projectSchema.pre('deleteOne', { document: true, query: false }, async function(next) {
  try {
    // Delete all features associated with this project
    const Feature = mongoose.model('Feature');
    const result = await Feature.deleteMany({ projectId: this._id });
    console.log(`Deleted ${result.deletedCount} features for project ${this._id}`);
    next();
  } catch (error) {
    next(error);
  }
});

// Also handle findByIdAndDelete and findOneAndDelete
projectSchema.pre(['findOneAndDelete', 'deleteMany'], async function(next) {
  try {
    const Feature = mongoose.model('Feature');
    
    // Get the project ID(s) being deleted
    const projectsToDelete = await this.model.find(this.getQuery()).select('_id');
    const projectIds = projectsToDelete.map(p => p._id);
    
    if (projectIds.length > 0) {
      const result = await Feature.deleteMany({ projectId: { $in: projectIds } });
      console.log(`Deleted ${result.deletedCount} features for ${projectIds.length} projects`);
    }
    
    next();
  } catch (error) {
    next(error);
  }
});
export const Project = mongoose.model("Project", projectSchema);










// // models/projects.model.js
// import mongoose, { Schema } from "mongoose";

// const projectSchema = new Schema(
//   {
//     name: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     description: {
//       type: String,
//       default: "",
//       trim: true,
//     },
//     companyId: {
//       type: Schema.Types.ObjectId,
//       ref: "Company",
//       default: null,
//     },
//     createdBy: {
//       type: Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },
//     members: [
//       {
//         userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
//         role: { 
//           type: String, 
//           enum: ["owner", "admin", "member", "viewer"], 
//           default: "member" 
//         },
//         addedAt: { type: Date, default: Date.now },
//         addedBy: { type: Schema.Types.ObjectId, ref: "User" }
//       }
//     ],
//     status: {
//       type: String,
//       enum: ["draft", "active", "archived", "completed"],
//       default: "active",
//     },
//     deadline: {
//       type: Date,
//       default: null,
//     },
//     features: [
//       {
//         type: Schema.Types.ObjectId,
//         ref: "Feature",
//       },
//     ],
//     isShown: {
//       type: Boolean,
//       default: true,
//     },
//     // Future multi-tenant fields
//     owner: { 
//       type: Schema.Types.ObjectId, 
//       ref: "User", 
//       default: null 
//     },
//     workspaceId: {
//       type: Schema.Types.ObjectId,
//       ref: "Workspace",
//       default: null,
//     },
//     tenantId: { 
//       type: Schema.Types.ObjectId, 
//       ref: "Tenant", 
//       default: null 
//     },
//   },
//   { timestamps: true }
// );

// // Primary compound index for current single-tenant with company filtering
// // Following ESR rule: Equality (companyId), Sort (status), Range (createdAt)
// projectSchema.index({ companyId: 1, status: 1, createdAt: -1 });

// // Unique constraint for project names per company (current model)
// projectSchema.index({ name: 1, companyId: 1 }, { unique: true });

// // User-centric queries (creator's projects)
// projectSchema.index({ createdBy: 1, status: 1, createdAt: -1 });

// // Member lookup optimization
// projectSchema.index({ "members.userId": 1, status: 1 });

// // Future: Multi-tenant indexes with partial filter expressions
// // Only create these indexes when tenantId/workspaceId are actually used
// projectSchema.index(
//   { tenantId: 1, name: 1 }, 
//   { 
//     unique: true, 
//     partialFilterExpression: { tenantId: { $exists: true } } 
//   }
// );

// projectSchema.index(
//   { workspaceId: 1, name: 1 }, 
//   { 
//     unique: true, 
//     partialFilterExpression: { workspaceId: { $exists: true } } 
//   }
// );

// // Future: Workspace/tenant-scoped queries
// projectSchema.index(
//   { workspaceId: 1, status: 1, createdAt: -1 },
//   { partialFilterExpression: { workspaceId: { $exists: true } } }
// );

// projectSchema.index(
//   { tenantId: 1, status: 1, createdAt: -1 },
//   { partialFilterExpression: { tenantId: { $exists: true } } }
// );

// // Instance method to check if user has permission
// projectSchema.methods.hasPermission = function(userId, requiredRole = "member") {
//   const roleHierarchy = { viewer: 0, member: 1, admin: 2, owner: 3 };
  
//   // Creator is always owner
//   if (this.createdBy.toString() === userId.toString()) return true;
  
//   const member = this.members.find(m => m.userId.toString() === userId.toString());
//   if (!member) return false;
  
//   return roleHierarchy[member.role] >= roleHierarchy[requiredRole];
// };

// // Static method for tenant-aware queries (future-proofing)
// projectSchema.statics.findWithTenant = function(filter = {}, tenantContext = null) {
//   if (tenantContext?.tenantId) {
//     filter.tenantId = tenantContext.tenantId;
//   } else if (tenantContext?.workspaceId) {
//     filter.workspaceId = tenantContext.workspaceId;
//   } else if (tenantContext?.companyId) {
//     filter.companyId = tenantContext.companyId;
//   }
//   return this.find(filter);
// };

// export const Project = mongoose.model("Project", projectSchema);


